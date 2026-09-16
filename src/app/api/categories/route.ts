// GET /api/categories — categorías públicas con cantidad de productos
import { qAll } from '@/db';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = qAll(`
    SELECT c.id, c.name, c.sort_order,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.available = 1) AS product_count
    FROM categories c
    ORDER BY c.sort_order, c.name
  `) as unknown as Category[];
  return Response.json({ categories: rows });
}
