'use client';
// ============================================================
// PRODUCTOS — alta manual con foto, edición, oferta, stock,
// activar/desactivar, eliminar con confirmación e importación
// masiva desde Excel.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { formatPrice, stockState, STOCK_CLASSES, STOCK_LABELS } from '@/lib/format';
import type { Category, Product } from '@/lib/types';
import { Modal, ConfirmDialog, Toggle, Spinner, EmptyState } from './ui';
import ImportModal from './ImportModal';
import { toast } from '@/components/Toaster';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UploadIcon,
  DownloadIcon,
  StarIcon,
  SearchIcon,
  BoxIcon,
  CheckIcon,
} from '@/components/icons';

const UNIT_SUGGESTIONS = [
  'Unidad', 'Pack x6', 'Pack x8', 'Pack x12', 'Caja x6', 'Caja x12', 'Caja x24',
  'Bolsa x10', 'Bolsa x20', 'Docena', 'Kilo', 'Litro',
];

interface FormState {
  name: string;
  description: string;
  category_id: string;
  price: string;
  promo_price: string;
  stock: string;
  unit: string;
  sku: string;
  featured: boolean;
  available: boolean;
  image_url: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  category_id: '',
  price: '',
  promo_price: '',
  stock: '0',
  unit: 'Unidad',
  sku: '',
  featured: false,
  available: true,
  image_url: '',
};

export default function ProductsAdmin() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api<{ products: Product[] }>('/api/admin/products'),
        api<{ categories: Category[] }>('/api/admin/categories'),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = products ?? [];
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    if (catFilter) list = list.filter((p) => String(p.category_id) === catFilter);
    if (stateFilter === 'sin-stock') list = list.filter((p) => p.stock <= 0);
    if (stateFilter === 'poco-stock') list = list.filter((p) => p.stock > 0 && p.stock <= 5);
    if (stateFilter === 'disponible') list = list.filter((p) => p.available && p.stock > 0);
    if (stateFilter === 'oculto') list = list.filter((p) => !p.available);
    if (stateFilter === 'oferta')
      list = list.filter((p) => p.promo_price != null && p.promo_price < p.price);
    return list;
  }, [products, search, catFilter, stateFilter]);

  const quickToggle = async (p: Product, patch: Partial<Product>) => {
    try {
      await api(`/api/admin/products/${p.id}`, { method: 'PATCH', json: patch });
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/admin/products/${deleting.id}`, { method: 'DELETE' });
      toast(`"${deleting.name}" eliminado`, 'success');
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
          <h1 className="text-2xl font-extrabold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">
            {products?.length ?? '…'} productos · los cambios se reflejan en la tienda al instante.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/products/template"
            className="btn-ghost"
            title="Descargar plantilla de Excel con el formato correcto"
          >
            <DownloadIcon className="h-4 w-4" /> Plantilla Excel
          </a>
          <button type="button" onClick={() => setImporting(true)} className="btn-ghost">
            <UploadIcon className="h-4 w-4" /> IMPORTAR DESDE EXCEL
          </button>
          <button type="button" onClick={() => setCreating(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4" /> NUEVO PRODUCTO
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-card sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input sm:w-44" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="disponible">En stock</option>
          <option value="poco-stock">Poco stock</option>
          <option value="sin-stock">Sin stock</option>
          <option value="oferta">En oferta</option>
          <option value="oculto">No disponibles</option>
        </select>
      </div>

      {products === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? 'Todavía no hay productos' : 'Sin resultados'}
          message={
            products.length === 0
              ? 'Creá tu primer producto o importá un Excel con tu lista completa.'
              : 'Probá con otros filtros o búsquedas.'
          }
        />
      ) : (
        <>
          {/* Tabla escritorio */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Precio</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3 text-center">Destacado</th>
                  <th className="px-3 py-3 text-center">Visible</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const st = stockState(p.stock);
                  const promo = p.promo_price != null && p.promo_price < p.price;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                          ) : (
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                              <BoxIcon className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-64 truncate font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.unit}{p.sku ? ` · ${p.sku}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{p.category_name || '—'}</td>
                      <td className="px-3 py-2.5">
                        {promo ? (
                          <span>
                            <b className="text-brand-800">{formatPrice(p.promo_price!)}</b>{' '}
                            <s className="text-xs text-slate-400">{formatPrice(p.price)}</s>
                          </span>
                        ) : (
                          <b className="text-slate-800">{formatPrice(p.price)}</b>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge-stock ${STOCK_CLASSES[st]}`}>{STOCK_LABELS[st]}</span>
                        <span className="ml-1 text-xs text-slate-400">({p.stock})</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => quickToggle(p, { featured: !p.featured })}
                          className={p.featured ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}
                          title={p.featured ? 'Quitar destacado' : 'Marcar como destacado'}
                        >
                          <StarIcon className="mx-auto h-5 w-5" />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => quickToggle(p, { available: !p.available })}
                          className={`inline-flex h-6 w-11 items-center rounded-full transition ${
                            p.available ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={p.available ? 'Ocultar de la tienda' : 'Publicar en la tienda'}
                        >
                          <span
                            className={`mx-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                              p.available ? 'translate-x-5' : ''
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(p)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(p)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards móvil */}
          <div className="grid gap-3 lg:hidden">
            {filtered.map((p) => {
              const st = stockState(p.stock);
              const promo = p.promo_price != null && p.promo_price < p.price;
              return (
                <div key={p.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-card">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                      <BoxIcon className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.category_name || '—'} · {p.unit}</p>
                    <p className="mt-1 text-sm">
                      {promo ? (
                        <>
                          <b className="text-brand-800">{formatPrice(p.promo_price!)}</b>{' '}
                          <s className="text-xs text-slate-400">{formatPrice(p.price)}</s>
                        </>
                      ) : (
                        <b className="text-slate-800">{formatPrice(p.price)}</b>
                      )}
                      {'  '}
                      <span className={`badge-stock ${STOCK_CLASSES[st]}`}>{STOCK_LABELS[st]}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => setEditing(p)} className="btn-ghost px-3 py-1.5 text-xs">
                        <PencilIcon className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => quickToggle(p, { available: !p.available })}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                          p.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.available ? 'Visible' : 'Oculto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(p)}
                        className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(creating || editing) && (
        <ProductFormModal
          product={editing}
          categories={categories}
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
          title="Eliminar producto"
          message={`¿Seguro que querés eliminar "${deleting.name}"? Esta acción no se puede deshacer.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {importing && (
        <ImportModal
          categories={categories}
          onClose={() => setImporting(false)}
          onImported={async () => {
            setImporting(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// FORMULARIO DE PRODUCTO (alta y edición)
// ============================================================
function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    product
      ? {
          name: product.name,
          description: product.description ?? '',
          category_id: product.category_id ? String(product.category_id) : '',
          price: String(product.price),
          promo_price: product.promo_price != null ? String(product.promo_price) : '',
          stock: String(product.stock),
          unit: product.unit,
          sku: product.sku ?? '',
          featured: product.featured,
          available: product.available,
          image_url: product.image_url ?? '',
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd });
      setForm((f) => ({ ...f, image_url: res.url }));
      toast('Imagen subida', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        price: Number(form.price),
        promo_price: form.promo_price === '' ? null : Number(form.promo_price),
        stock: Number(form.stock),
      };
      if (product) {
        await api(`/api/admin/products/${product.id}`, { method: 'PATCH', json: payload });
        toast('Producto actualizado ✓', 'success');
      } else {
        await api('/api/admin/products', { method: 'POST', json: payload });
        toast('Producto creado ✓ Ya aparece en la tienda', 'success');
      }
      onSaved();
    } catch (err: any) {
      if (err?.data?.errors) setErrors(err.data.errors);
      toast(err?.message || 'No se pudo guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        {/* Imagen */}
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="h-28 w-28 overflow-hidden rounded-2xl bg-slate-100">
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="Vista previa" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-300">
                  <BoxIcon className="h-10 w-10" />
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <label className="btn-ghost cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
              {uploading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              {uploading ? 'Subiendo…' : 'Subir foto (celular o PC)'}
            </label>
            {form.image_url && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                className="text-xs font-bold text-red-500 hover:text-red-700"
              >
                Quitar imagen
              </button>
            )}
            <p className="text-[11px] text-slate-400">JPG, PNG o WEBP hasta 8 MB. Con previsualización.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pf-name">Nombre *</label>
          <input id="pf-name" className="input" value={form.name} onChange={set('name')} required />
          {errors.name && <p className="mt-1 text-xs font-semibold text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="label" htmlFor="pf-desc">Descripción</label>
          <textarea id="pf-desc" className="input min-h-16" value={form.description} onChange={set('description')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pf-cat">Categoría</label>
            <select id="pf-cat" className="input" value={form.category_id} onChange={set('category_id')}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pf-unit">Unidad de venta</label>
            <input
              id="pf-unit"
              className="input"
              list="unit-suggestions"
              value={form.unit}
              onChange={set('unit')}
              placeholder="Unidad, Caja x24, Pack x6…"
            />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="pf-price">Precio *</label>
            <input id="pf-price" className="input" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
            {errors.price && <p className="mt-1 text-xs font-semibold text-red-600">{errors.price}</p>}
          </div>
          <div>
            <label className="label" htmlFor="pf-promo">Precio anterior / promocional</label>
            <input id="pf-promo" className="input" type="number" step="0.01" min="0" value={form.promo_price} onChange={set('promo_price')} placeholder="Vacío = sin oferta" />
            {errors.promo_price && <p className="mt-1 text-xs font-semibold text-red-600">{errors.promo_price}</p>}
            <p className="mt-1 text-[11px] text-slate-400">Si es menor al precio, se muestra como 🔥 OFERTA.</p>
          </div>
          <div>
            <label className="label" htmlFor="pf-stock">Stock *</label>
            <input id="pf-stock" className="input" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
            {errors.stock && <p className="mt-1 text-xs font-semibold text-red-600">{errors.stock}</p>}
          </div>
          <div>
            <label className="label" htmlFor="pf-sku">Código / SKU</label>
            <input id="pf-sku" className="input" value={form.sku} onChange={set('sku')} placeholder="GA-001" />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 rounded-2xl bg-slate-50 p-4">
          <Toggle checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} label="⭐ Producto destacado" />
          <Toggle checked={form.available} onChange={(v) => setForm((f) => ({ ...f, available: v }))} label="👁 Disponible en la tienda" />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Spinner className="border-white/40 border-t-white" /> : (<><CheckIcon className="h-4 w-4" /> GUARDAR PRODUCTO</>)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
