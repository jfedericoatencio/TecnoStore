'use client';
// ============================================================
// IMPORTACIÓN MASIVA DESDE EXCEL
// 1) Subís el .xlsx/.csv (+ ZIP opcional de imágenes)
// 2) El servidor lo parsea y devuelve la vista previa con
//    errores resaltados en rojo
// 3) Confirmás y se cargan todos los productos de una vez
// ============================================================
import { useRef, useState } from 'react';
import { api } from '@/lib/client';
import { formatPrice } from '@/lib/format';
import type { Category } from '@/lib/types';
import { Modal, Spinner } from './ui';
import { toast } from '@/components/Toaster';
import { UploadIcon, DownloadIcon, CheckIcon, AlertIcon } from '@/components/icons';

interface ImportRow {
  rowIndex: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number | null;
  precio_promocional: number | null;
  stock: number | null;
  unidad: string;
  sku: string;
  destacado: boolean;
  disponible: boolean;
  url_imagen: string;
  errors: string[];
  warnings: string[];
}

interface PreviewData {
  fileName: string;
  zipImages: number;
  total: number;
  valid: ImportRow[];
  invalid: ImportRow[];
  newCategories: string[];
}

type Step = 'upload' | 'preview' | 'done';

export default function ImportModal({
  categories,
  onClose,
  onImported,
}: {
  categories: Category[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [newCategoryMode, setNewCategoryMode] = useState<'create' | 'uncategorized'>('create');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; skipped: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [zipName, setZipName] = useState('');

  const existingCats = new Set(categories.map((c) => c.name.toLowerCase()));

  const parse = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast('Seleccioná un archivo .xlsx o .csv', 'error');
      return;
    }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const zip = zipRef.current?.files?.[0];
      if (zip) fd.append('zip', zip);
      const data = await api<PreviewData>('/api/admin/products/import', {
        method: 'POST',
        body: fd,
      });
      setPreview(data);
      setStep('preview');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setParsing(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await api<{ inserted: number; updated: number; skipped: string[] }>(
        '/api/admin/products/import/confirm',
        {
          method: 'POST',
          json: { rows: preview.valid, newCategoryMode, updateExisting },
        }
      );
      setResult(res);
      setStep('done');
      onImported();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal title="Importar productos desde Excel" onClose={onClose} wide>
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="rounded-2xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
            Subí un archivo <b>.xlsx</b> o <b>.csv</b> con las columnas: <code className="rounded bg-white px-1">nombre, descripcion, categoria, precio, precio_promocional, stock, unidad, sku, destacado, disponible, url_imagen</code>.
            Opcionalmente podés subir un <b>ZIP con las imágenes</b> (los nombres de archivo deben coincidir con la columna <code className="rounded bg-white px-1">url_imagen</code>).
          </p>

          <a
            href="/api/admin/products/template"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            <DownloadIcon className="h-4 w-4" /> Descargar plantilla Excel de ejemplo
          </a>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Archivo Excel / CSV *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
            </div>
            <div>
              <label className="label">ZIP de imágenes (opcional)</label>
              <input
                ref={zipRef}
                type="file"
                accept=".zip"
                className="input file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-700"
                onChange={(e) => setZipName(e.target.files?.[0]?.name ?? '')}
              />
              {zipName && <p className="mt-1 text-xs text-slate-500">📦 {zipName}</p>}
            </div>
          </div>

          <button type="button" onClick={parse} disabled={parsing} className="btn-primary w-full py-3">
            {parsing ? <Spinner className="border-white/40 border-t-white" /> : (<><UploadIcon className="h-4 w-4" /> ANALIZAR ARCHIVO</>)}
          </button>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-slate-700">{preview.fileName}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              ✓ {preview.valid.length} válidas
            </span>
            {preview.invalid.length > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                ✗ {preview.invalid.length} con errores (no se importan)
              </span>
            )}
            {preview.zipImages > 0 && (
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                📦 {preview.zipImages} imágenes del ZIP
              </span>
            )}
          </div>

          {preview.newCategories.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">
                Categorías nuevas detectadas: {preview.newCategories.join(', ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="newcat"
                    checked={newCategoryMode === 'create'}
                    onChange={() => setNewCategoryMode('create')}
                  />
                  Crearlas automáticamente
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="newcat"
                    checked={newCategoryMode === 'uncategorized'}
                    onChange={() => setNewCategoryMode('uncategorized')}
                  />
                  Asignarlas a "Sin categoría"
                </label>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
            <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
            <span>
              <b>Actualizar productos existentes</b> — si el SKU ya existe, se sobrescriben sus datos.
            </span>
          </label>

          <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Categoría</th>
                  <th className="px-2 py-2">Precio</th>
                  <th className="px-2 py-2">Promo</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2">Errores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...preview.invalid, ...preview.valid].map((r) => {
                  const bad = r.errors.length > 0;
                  return (
                    <tr key={r.rowIndex} className={bad ? 'bg-red-50' : ''}>
                      <td className="px-2 py-1.5 text-slate-400">{r.rowIndex}</td>
                      <td className="max-w-40 truncate px-2 py-1.5 font-semibold text-slate-700">
                        {r.nombre || <span className="text-red-500">(vacío)</span>}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">{r.categoria || '—'}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.precio != null ? formatPrice(r.precio) : <span className="text-red-500">—</span>}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.precio_promocional != null ? formatPrice(r.precio_promocional) : ''}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.stock ?? 0}</td>
                      <td className="max-w-52 px-2 py-1.5">
                        {bad ? (
                          <span className="font-semibold text-red-600">{r.errors.join(' · ')}</span>
                        ) : r.warnings.length > 0 ? (
                          <span className="text-amber-600">⚠ {r.warnings.join(' · ')}</span>
                        ) : (
                          <span className="text-emerald-600">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep('upload')} className="btn-ghost flex-1">
              ← Volver
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={confirming || preview.valid.length === 0}
              className="btn-primary flex-1"
            >
              {confirming ? <Spinner className="border-white/40 border-t-white" /> : (<><CheckIcon className="h-4 w-4" /> CONFIRMAR IMPORTACIÓN ({preview.valid.length})</>)}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">¡Importación terminada!</h3>
          <div className="mx-auto max-w-xs space-y-1 text-sm text-slate-600">
            <p>✅ <b>{result.inserted}</b> productos creados</p>
            {result.updated > 0 && <p>🔄 <b>{result.updated}</b> productos actualizados</p>}
            {result.skipped.length > 0 && (
              <p className="text-amber-600">⚠ Se omitieron: {result.skipped.join(', ')}</p>
            )}
          </div>
          <p className="text-xs text-slate-400">
            <AlertIcon className="mr-1 inline h-3.5 w-3.5" />
            Los productos ya están visibles en la tienda.
          </p>
          <button type="button" onClick={onClose} className="btn-primary w-full">
            VER PRODUCTOS
          </button>
        </div>
      )}
    </Modal>
  );
}
