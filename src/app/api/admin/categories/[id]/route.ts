// PATCH/DELETE /api/admin/categories/[id]
// Al eliminar una categoría, sus productos quedan "Sin categoría"
// (la FK hace ON DELETE SET NULL).
import { qGet, qRun } from '@/db';
import { requireAdmin } from '@/lib/auth';

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
  const name = String(body?.name ?? '').trim();
  if (name.length < 2) return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });

  const dup = qGet('SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ?', name, id);
  if (dup) return Response.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });

  const res = qRun('UPDATE categories SET name = ? WHERE id = ?', name, id);
  if (res.changes === 0) return Response.json({ error: 'Categoría inexistente' }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const res = qRun('DELETE FROM categories WHERE id = ?', id);
  if (res.changes === 0) return Response.json({ error: 'Categoría inexistente' }, { status: 404 });
  return Response.json({ ok: true });
}
