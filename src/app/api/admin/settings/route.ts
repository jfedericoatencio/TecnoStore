// PUT /api/admin/settings — actualiza la configuración del negocio
import { qAll, qRun, tx } from '@/db';
import { requireAdmin } from '@/lib/auth';
import type { SettingsMap } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = new Set([
  'business_name',
  'tagline',
  'whatsapp_phone',
  'address',
  'hours',
  'min_order',
  'bank_info',
  'logo_url',
  'hero_image_url',
]);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const rows = await qAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: SettingsMap = {};
  for (const r of rows) settings[r.key] = r.value;
  return Response.json({ settings });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const incoming: SettingsMap = body?.settings ?? {};
  const entries = Object.entries(incoming).filter(([k]) => ALLOWED_KEYS.has(k));
  if (entries.length === 0) {
    return Response.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const whatsapp = String(incoming.whatsapp_phone ?? '').replace(/[^\d]/g, '');
  if (whatsapp && whatsapp.length < 8) {
    return Response.json(
      { error: 'El número de WhatsApp debe incluir código de país (ej: 5491123456789)' },
      { status: 400 }
    );
  }
  if (incoming.min_order !== undefined && incoming.min_order !== '' && !Number.isFinite(Number(incoming.min_order))) {
    return Response.json({ error: 'El pedido mínimo debe ser un número' }, { status: 400 });
  }

  await tx(async () => {
    for (const [key, value] of entries) {
      const v = key === 'whatsapp_phone' ? whatsapp : String(value ?? '');
      await qRun(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        v
      );
    }
  });

  const rows = await qAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: SettingsMap = {};
  for (const r of rows) settings[r.key] = r.value;
  return Response.json({ ok: true, settings });
}
