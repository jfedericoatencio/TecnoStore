// GET /api/products — catálogo público (solo disponibles)
import { qAll } from '@/db';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = qAll(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.available = 1
    ORDER BY p.featured DESC, p.name ASC
  `);
  const products: Product[] = rows.map((r: any) => ({
    ...r,
    price: Number(r.price),
    promo_price: r.promo_price == null ? null : Number(r.promo_price),
    stock: Number(r.stock),
    featured: !!Number(r.featured),
    available: !!Number(r.available),
  }));
  return Response.json({ products });
}
