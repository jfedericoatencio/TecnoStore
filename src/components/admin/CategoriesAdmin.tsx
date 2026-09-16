'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { Category } from '@/lib/types';
import { Modal, ConfirmDialog, Spinner, EmptyState } from './ui';
import { toast } from '@/components/Toaster';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@/components/icons';

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ categories: Category[] }>('/api/admin/categories');
      setCategories(res.categories);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/admin/categories/${deleting.id}`, { method: 'DELETE' });
      toast(`Categoría "${deleting.name}" eliminada. Sus productos quedan sin categoría.`, 'success');
      setDeleting(null);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Categorías</h1>
          <p className="text-sm text-slate-500">Organizá el catálogo de la tienda.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary">
          <PlusIcon className="h-4 w-4" /> NUEVA CATEGORÍA
        </button>
      </div>

      {categories === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState title="No hay categorías" message="Creá la primera para organizar tus productos." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <TagIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {c.product_count} {c.product_count === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
                  title="Renombrar"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(c)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CategoryModal
          category={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={`¿Eliminar "${deleting.name}"? Sus ${deleting.product_count} productos quedarán "Sin categoría".`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (category) {
        await api(`/api/admin/categories/${category.id}`, { method: 'PATCH', json: { name } });
        toast('Categoría actualizada ✓', 'success');
      } else {
        await api('/api/admin/categories', { method: 'POST', json: { name } });
        toast('Categoría creada ✓', 'success');
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={category ? 'Renombrar categoría' : 'Nueva categoría'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">⚠ {error}</p>
        )}
        <div>
          <label className="label" htmlFor="cat-name">Nombre</label>
          <input
            id="cat-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gaseosas, Almacén…"
            required
            minLength={2}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Spinner className="border-white/40 border-t-white" /> : 'GUARDAR'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
