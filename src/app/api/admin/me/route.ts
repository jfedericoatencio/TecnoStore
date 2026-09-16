// GET /api/admin/me — datos de la sesión actual
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  return Response.json({
    username: auth.session.username,
    mustChangePassword: auth.session.mcp,
  });
}
