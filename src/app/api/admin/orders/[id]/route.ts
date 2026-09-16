// PATCH /api/admin/orders/[id] — cambia el estado del pedido
import { qRun } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { ORDER_STATUSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const status = String(body?.status ?? '');
  if (!ORDER_STATUSES.some((s) => s.key === status)) {
    return Response.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const res = await qRun('UPDATE orders SET status = ? WHERE id = ?', status, id);
  if (res.changes === 0) return Response.json({ error: 'Pedido inexistente' }, { status: 404 });
  return Response.json({ ok: true, status });
}
