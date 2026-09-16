// GET/POST /api/admin/products — listado completo y creación
import { qAll, qRun, lastId } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { mapProduct, validateProduct, type ProductInput } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const rows = qAll(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC, p.id DESC
  `);
  return Response.json({ products: rows.map(mapProduct) });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: ProductInput;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { errors, values } = validateProduct(body);
  if (Object.keys(errors).length > 0) {
    return Response.json({ error: 'Revisá los campos marcados', errors }, { status: 400 });
  }

  const res = qRun(
    `INSERT INTO products (name, description, category_id, price, promo_price, stock, unit, sku, featured, available, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values.name, values.description, values.category_id, values.price, values.promo_price,
    values.stock, values.unit, values.sku, values.featured, values.available, values.image_url
  );
  const row = qAll(
    'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?',
    lastId(res)
  );
  return Response.json({ ok: true, product: mapProduct(row[0]) });
}
