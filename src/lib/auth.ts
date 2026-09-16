// ============================================================
// Helpers de sesión del lado servidor (Server Components y
// Route Handlers). La verificación real de rutas la hace el
// middleware + estas comprobaciones en cada endpoint.
// ============================================================
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySession,
  type SessionPayload,
} from './jwt';

export function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export const COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

export function jsonUnauthorized() {
  return Response.json({ error: 'No autorizado' }, { status: 401 });
}

/** Verifica la sesión en endpoints /api/admin/* (defensa en profundidad) */
export async function requireAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; res: Response }
> {
  const session = await getSession();
  if (!session) return { ok: false, res: jsonUnauthorized() };
  return { ok: true, session };
}
