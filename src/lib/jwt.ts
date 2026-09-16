// ============================================================
// JWT de sesión (edge-safe: solo usa `jose`, sin dependencias
// de Node). Lo usa el middleware y el servidor.
// ============================================================
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'dc_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export interface SessionPayload {
  sub: number; // user id
  username: string;
  mcp: boolean; // must_change_password
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error(
      'Falta la variable de entorno AUTH_SECRET. Copiá .env.example a .env y generá un secreto.'
    );
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ username: p.username, mcp: p.mcp })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(p.sub))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      sub: Number(payload.sub),
      username: String(payload.username ?? ''),
      mcp: Boolean(payload.mcp),
    };
  } catch {
    return null;
  }
}
