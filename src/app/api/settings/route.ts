// GET /api/settings — configuración pública del negocio
import { qAll } from '@/db';
import type { SettingsMap } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await qAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: SettingsMap = {};
  for (const r of rows) settings[r.key] = r.value;
  return Response.json({ settings });
}
