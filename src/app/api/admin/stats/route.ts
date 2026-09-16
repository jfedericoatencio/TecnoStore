// GET /api/admin/stats — métricas del dashboard
import { qAll, qGet } from '@/db';
import { requireAdmin } from '@/lib/auth';
import type { Order, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const totals = qGet<any>(`
    SELECT
      COUNT(*) AS total_products,
      SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) AS available_products,
      SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
      SUM(CASE WHEN available = 1 AND stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS low_stock
    FROM products
  `)!;

  const categories = Number(qGet<any>('SELECT COUNT(*) AS c FROM categories')!.c);

  const ordersToday = Number(
    qGet<any>(`SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')`)!.c
  );
  const salesToday = Number(
    qGet<any>(
      `SELECT COALESCE(SUM(total),0) AS s FROM orders
       WHERE date(created_at) = date('now') AND status != 'cancelado'`
    )!.s
  );
  const pendingOrders = Number(
    qGet<any>(
      `SELECT COUNT(*) AS c FROM orders WHERE status IN ('nuevo','confirmado','preparando','en_camino')`
    )!.c
  );
  const totalOrders = Number(qGet<any>('SELECT COUNT(*) AS c FROM orders')!.c);

  const recentOrders = qAll<Order>(
    'SELECT id, number, customer_name, total, status, created_at FROM orders ORDER BY created_at DESC, id DESC LIMIT 8'
  );
  const lowStockProducts = qAll<Product>(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.available = 1 AND p.stock <= 5
     ORDER BY p.stock ASC LIMIT 8`
  ).map((p: any) => ({ ...p, price: Number(p.price), stock: Number(p.stock), featured: !!p.featured, available: !!p.available }));

  return Response.json({
    stats: {
      totalProducts: Number(totals.total_products),
      availableProducts: Number(totals.available_products),
      outOfStock: Number(totals.out_of_stock),
      lowStock: Number(totals.low_stock),
      categories,
      ordersToday,
      salesToday,
      pendingOrders,
      totalOrders,
    },
    recentOrders,
    lowStockProducts,
  });
}
