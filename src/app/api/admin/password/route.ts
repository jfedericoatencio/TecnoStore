// POST /api/admin/password — cambio de contraseña (obligatorio al
// primer ingreso y disponible siempre desde Configuración).
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { qGet, qRun } from '@/db';
import { requireAdmin, COOKIE_OPTIONS } from '@/lib/auth';
import { signSession, SESSION_COOKIE } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const current = String(body?.current ?? '');
  const next = String(body?.next ?? '');

  if (!current || !next) {
    return NextResponse.json({ error: 'Completá la contraseña actual y la nueva' }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: 'La nueva contraseña debe ser distinta a la actual' }, { status: 400 });
  }

  const user = qGet<{ id: number; username: string; password_hash: string; must_change_password: number }>(
    'SELECT * FROM users WHERE id = ?',
    auth.session.sub
  );
  if (!user) return NextResponse.json({ error: 'Usuario inexistente' }, { status: 404 });

  if (!bcrypt.compareSync(current, user.password_hash)) {
    return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });
  }

  const hash = bcrypt.hashSync(next, 10);
  qRun(
    `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?`,
    hash,
    user.id
  );

  // Nueva sesión SIN el flag de cambio obligatorio
  const token = await signSession({ sub: user.id, username: user.username, mcp: false });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
  return res;
}
