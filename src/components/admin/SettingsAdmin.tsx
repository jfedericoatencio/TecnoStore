'use client';
// ============================================================
// CONFIGURACIÓN DEL NEGOCIO — todo editable sin tocar código:
// nombre, logo, WhatsApp, dirección, horarios, texto principal,
// pedido mínimo, datos de transferencia + cambio de contraseña.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { Spinner } from './ui';
import PasswordForm from './PasswordForm';
import { toast } from '@/components/Toaster';
import { UploadIcon, LockIcon, TrashIcon } from '@/components/icons';

const FIELDS: { key: string; label: string; placeholder?: string; hint?: string; textarea?: boolean }[] = [
  { key: 'business_name', label: 'Nombre del negocio', placeholder: 'Distribuidora Central' },
  { key: 'tagline', label: 'Texto principal (bajo el título)', textarea: true },
  { key: 'whatsapp_phone', label: 'WhatsApp para recibir pedidos', placeholder: '5491123456789', hint: 'Código de país + número, solo números. Ej: 5491123456789' },
  { key: 'address', label: 'Dirección' },
  { key: 'hours', label: 'Horarios de atención' },
  { key: 'min_order', label: 'Pedido mínimo ($)', placeholder: '15000' },
  { key: 'bank_info', label: 'Datos de transferencia', textarea: true, hint: 'Banco, CBU, alias… Aparecen en la tienda y en el checkout.' },
];

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ settings: Record<string, string> }>('/api/admin/settings')
      .then((d) => setSettings(d.settings))
      .catch((e) => toast(e.message, 'error'));
  }, []);

  const set = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setSettings((s) => ({ ...(s ?? {}), [k]: e.target.value }));

  const upload = async (file: File, key: 'logo_url' | 'hero_image_url') => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd });
      setSettings((s) => ({ ...(s ?? {}), [key]: res.url }));
      toast('Imagen subida. Presioná Guardar para aplicarla.', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api<{ settings: Record<string, string> }>('/api/admin/settings', {
        method: 'PUT',
        json: { settings },
      });
      setSettings(res.settings);
      toast('Configuración guardada ✓ Se refleja en la tienda al recargar', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <form onSubmit={save} className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500">Los datos del negocio que ve el cliente.</p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-card sm:p-6">
          {/* Logo + hero */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-center">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {settings.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl">🚚</span>
                )}
              </div>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Logo</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-ghost cursor-pointer text-xs">
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'logo_url')}
                />
                {uploading ? <Spinner className="h-4 w-4" /> : <UploadIcon className="h-4 w-4" />}
                Subir logo
              </label>
              {settings.logo_url && (
                <button type="button" onClick={() => setSettings((s) => ({ ...s!, logo_url: '' }))} className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                  <TrashIcon className="h-3.5 w-3.5" /> Quitar logo
                </button>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 border-l border-slate-100 pl-4">
              <label className="btn-ghost w-fit cursor-pointer text-xs">
                <input
                  ref={heroRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'hero_image_url')}
                />
                <UploadIcon className="h-4 w-4" /> Cambiar imagen de portada
              </label>
              <p className="text-[11px] text-slate-400">Imagen de fondo del encabezado de la tienda.</p>
            </div>
          </div>

          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={`st-${f.key}`}>{f.label}</label>
              {f.textarea ? (
                <textarea id={`st-${f.key}`} className="input min-h-20" value={settings[f.key] ?? ''} onChange={set(f.key)} placeholder={f.placeholder} />
              ) : (
                <input id={`st-${f.key}`} className="input" value={settings[f.key] ?? ''} onChange={set(f.key)} placeholder={f.placeholder} />
              )}
              {f.hint && <p className="mt-1 text-[11px] text-slate-400">{f.hint}</p>}
            </div>
          ))}

          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
            {saving ? <Spinner className="border-white/40 border-t-white" /> : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </form>

      {/* Cambio de contraseña */}
      <aside className="h-fit rounded-2xl bg-white p-4 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
          <LockIcon className="h-5 w-5 text-brand-700" /> Cambiar contraseña de administrador
        </h2>
        <p className="mb-4 mt-1 text-xs text-slate-400">
          Podés cambiarla en cualquier momento. Se guarda hasheada (bcrypt).
        </p>
        <PasswordForm />
      </aside>
    </div>
  );
}
