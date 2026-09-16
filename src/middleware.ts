// ============================================================
// MIDDLEWARE DE SEGURIDAD (edge)
// Bloquea el acceso a /admin/* y /api/admin/* sin sesión JWT
// válida. Si el admin aún tiene el flag must_change_password,
// fuerza el cambio de contraseña antes de continuar.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';

// Rutas permitidas cuando hay sesión pero falta cambiar la contraseña
const MCP_ALLOWED = new Set([
  '/admin/cambiar-password',
  '/api/admin/password',
  '/api/admin/me',
  '/api/admin/logout',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/admin/');
  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  // Login (página y endpoint) siempre públicos
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Cambio de contraseña obligatorio en el primer ingreso
  if (session.mcp && !MCP_ALLOWED.has(pathname)) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: 'Debés cambiar tu contraseña antes de continuar.', code: 'MUST_CHANGE_PASSWORD' },
        { status: 403 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/cambiar-password';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
