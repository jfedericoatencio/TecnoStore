// GET /api/admin/orders — listado con ítems, filtros por estado y búsqueda
import { qAll } from '@/db';
import { requireAdmin } from '@/lib/auth';
import type { Order, OrderItem } from '@/lib/types';
import { ORDER_STATUSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';
  const search = (url.searchParams.get('search') ?? '').trim();

  let sql = 'SELECT * FROM orders';
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status && ORDER_STATUSES.some((s) => s.key === status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(customer_name LIKE ? OR number LIKE ? OR phone LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY created_at DESC, id DESC LIMIT 300';

  const orders = await qAll<Order>(sql, ...params);
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id);
    const items = await qAll<OrderItem>(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ...ids
    );
    const byOrder = new Map<number, OrderItem[]>();
    for (const it of items) {
      const list = byOrder.get(Number(it.order_id)) ?? [];
      list.push(it);
      byOrder.set(Number(it.order_id), list);
    }
    for (const o of orders) o.items = byOrder.get(o.id) ?? [];
  }
  return Response.json({ orders });
}
