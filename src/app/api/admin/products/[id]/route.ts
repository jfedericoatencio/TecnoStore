// PATCH/DELETE /api/admin/products/[id] — edición y baja
import { qAll, qGet, qRun } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { validateProduct, mapProduct } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const existing = qGet('SELECT id FROM products WHERE id = ?', id);
  if (!existing) return Response.json({ error: 'Producto inexistente' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const current = qGet<any>('SELECT * FROM products WHERE id = ?', id)!;
  const merged = {
    name: body.name ?? current.name,
    description: body.description ?? current.description,
    category_id: body.category_id !== undefined ? body.category_id : current.category_id,
    price: body.price ?? current.price,
    promo_price: body.promo_price !== undefined ? body.promo_price : current.promo_price,
    stock: body.stock ?? current.stock,
    unit: body.unit ?? current.unit,
    sku: body.sku ?? current.sku,
    featured: body.featured !== undefined ? body.featured : !!Number(current.featured),
    available: body.available !== undefined ? body.available : !!Number(current.available),
    image_url: body.image_url ?? current.image_url,
  };

  const { errors, values } = validateProduct(merged);
  if (Object.keys(errors).length > 0) {
    return Response.json({ error: 'Revisá los campos marcados', errors }, { status: 400 });
  }

  qRun(
    `UPDATE products SET name=?, description=?, category_id=?, price=?, promo_price=?, stock=?, unit=?, sku=?, featured=?, available=?, image_url=?, updated_at=datetime('now') WHERE id=?`,
    values.name, values.description, values.category_id, values.price, values.promo_price,
    values.stock, values.unit, values.sku, values.featured, values.available, values.image_url, id
  );
  const row = qAll('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?', id);
  return Response.json({ ok: true, product: mapProduct(row[0]) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const res = qRun('DELETE FROM products WHERE id = ?', id);
  if (res.changes === 0) return Response.json({ error: 'Producto inexistente' }, { status: 404 });
  return Response.json({ ok: true });
}
