// GET/POST /api/admin/categories
import { qAll, qRun, lastId } from '@/db';
import { requireAdmin } from '@/lib/auth';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const rows = (await qAll(`
    SELECT c.id, c.name, c.sort_order,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c
    ORDER BY c.sort_order, c.name
  `)) as unknown as Category[];
  return Response.json({ categories: rows });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const name = String(body?.name ?? '').trim();
  if (name.length < 2) {
    return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  const dup = await qAll('SELECT id FROM categories WHERE lower(name) = lower(?)', name);
  if (dup.length > 0) {
    return Response.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
  }
  const max = (await qAll<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories'))[0]?.m ?? 0;
  const res = await qRun('INSERT INTO categories (name, sort_order) VALUES (?, ?)', name, Number(max) + 1);
  const row = (await qAll('SELECT * FROM categories WHERE id = ?', lastId(res)))[0];
  return Response.json({ ok: true, category: row });
}
