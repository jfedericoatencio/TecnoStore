// POST /api/admin/login — autenticación real con bcrypt + JWT en cookie httpOnly
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { qGet } from '@/db';
import { signSession, SESSION_COOKIE } from '@/lib/jwt';
import { COOKIE_OPTIONS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Limitador simple de intentos por IP (anti fuerza bruta)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  a.count += 1;
  return a.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: 'El servidor no tiene AUTH_SECRET configurado. Revisá el .env.' },
      { status: 500 }
    );
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '');
  if (!username || !password) {
    return NextResponse.json({ error: 'Completá usuario y contraseña' }, { status: 400 });
  }

  const user = qGet<{ id: number; username: string; password_hash: string; must_change_password: number }>(
    'SELECT id, username, password_hash, must_change_password FROM users WHERE username = ?',
    username
  );

  // Comparación bcrypt — la contraseña nunca se guarda ni se loguea en texto plano
  const ok = user ? bcrypt.compareSync(password, user.password_hash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }

  const mcp = !!Number(user.must_change_password);
  const token = await signSession({ sub: user.id, username: user.username, mcp });

  const res = NextResponse.json({ ok: true, mustChangePassword: mcp });
  res.cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
  return res;
}
