// POST /api/admin/products/import/confirm
// Paso 2: carga masiva definitiva de las filas válidas.
import { qAll, qGet, qRun, tx } from '@/db';
import { requireAdmin } from '@/lib/auth';
import type { ImportRow } from '@/lib/import';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
  const newCategoryMode: 'create' | 'uncategorized' =
    body?.newCategoryMode === 'uncategorized' ? 'uncategorized' : 'create';
  const updateExisting: boolean = !!body?.updateExisting;

  if (rows.length === 0) {
    return Response.json({ error: 'No hay filas para importar' }, { status: 400 });
  }

  const result = tx(() => {
    let inserted = 0;
    let updated = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const nombre = String(row.nombre ?? '').trim();
      const precio = Number(row.precio);
      if (!nombre || !Number.isFinite(precio) || precio <= 0) {
        skipped.push(nombre || `Fila ${row.rowIndex}`);
        continue;
      }

      // Categoría
      let categoryId: number | null = null;
      const catName = String(row.categoria ?? '').trim();
      if (catName) {
        let cat = qGet<{ id: number }>('SELECT id FROM categories WHERE lower(name) = lower(?)', catName);
        if (!cat && newCategoryMode === 'create') {
          const max = qAll<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories')[0]?.m ?? 0;
          const ins = qRun('INSERT INTO categories (name, sort_order) VALUES (?, ?)', catName, Number(max) + 1);
          cat = { id: Number(ins.lastInsertRowid) };
        }
        categoryId = cat?.id ?? null;
      }

      const promo =
        row.precio_promocional != null && Number(row.precio_promocional) > 0 && Number(row.precio_promocional) < precio
          ? Number(row.precio_promocional)
          : null;
      const stock = Math.max(0, Math.round(Number(row.stock ?? 0)));
      const unit = String(row.unidad ?? '').trim() || 'Unidad';
      const sku = String(row.sku ?? '').trim();
      const featured = row.destacado ? 1 : 0;
      const available = row.disponible === false ? 0 : 1;
      const image = String(row.url_imagen ?? '').trim();
      const descripcion = String(row.descripcion ?? '').trim();

      // ¿Actualización por SKU?
      if (updateExisting && sku) {
        const existing = qGet<{ id: number }>('SELECT id FROM products WHERE lower(sku) = lower(?)', sku);
        if (existing) {
          qRun(
            `UPDATE products SET name=?, description=?, category_id=?, price=?, promo_price=?, stock=?, unit=?, sku=?, featured=?, available=?, image_url=?, updated_at=datetime('now')
             WHERE id=?`,
            nombre, descripcion, categoryId, precio, promo, stock, unit, sku, featured, available, image, existing.id
          );
          updated++;
          continue;
        }
      }

      qRun(
        `INSERT INTO products (name, description, category_id, price, promo_price, stock, unit, sku, featured, available, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nombre, descripcion, categoryId, precio, promo, stock, unit, sku, featured, available, image
      );
      inserted++;
    }
    return { inserted, updated, skipped };
  });

  return Response.json({ ok: true, ...result });
}
