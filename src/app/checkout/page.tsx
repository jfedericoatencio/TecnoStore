'use client';
// ============================================================
// FINALIZAR PEDIDO — formulario del cliente + resumen.
// Registra el pedido en la base de datos y abre WhatsApp con
// el detalle completo. El número de WhatsApp sale de la
// configuración del panel (nunca hardcodeado).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import { formatPrice } from '@/lib/format';
import { api } from '@/lib/client';
import { buildOrderMessage, waUrl } from '@/lib/whatsapp';
import { toast } from '@/components/Toaster';
import {
  WhatsAppIcon,
  CheckIcon,
  CartIcon,
  TruckIcon,
} from '@/components/icons';
import type { PublicSettings } from '@/lib/types';

const PAYMENT_METHODS = ['Efectivo', 'Transferencia bancaria', 'Mercado Pago', 'Tarjeta de débito'];

interface Submitted {
  number: string;
  total: number;
  waLink: string;
}

export default function CheckoutPage() {
  const { items, total, clear, ready } = useCart();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    location: '',
    reference: '',
    payment_method: '',
    notes: '',
  });

  useEffect(() => {
    api<{ settings: Record<string, string> }>('/api/settings')
      .then((d) => {
        const m = d.settings;
        setSettings({
          business_name: m.business_name || 'Distribuidora Central',
          tagline: m.tagline || '',
          whatsapp_phone: m.whatsapp_phone || '',
          address: m.address || '',
          hours: m.hours || '',
          min_order: m.min_order || '0',
          bank_info: m.bank_info || '',
          logo_url: m.logo_url || '',
          hero_image_url: m.hero_image_url || '',
        });
      })
      .catch(() => toast('No se pudo cargar la configuración', 'error'));
  }, []);

  const minOrder = Number(settings?.min_order || 0);
  const belowMin = minOrder > 0 && total < minOrder;
  const empty = ready && items.length === 0 && !submitted;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || belowMin) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await api<{ ok: boolean; number: string; total: number }>('/api/orders', {
        method: 'POST',
        json: {
          customer: form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
        },
      });

      const message = buildOrderMessage({
        businessName: settings?.business_name || 'Distribuidora Central',
        orderNumber: res.number,
        customer: form,
        items: items.map((i) => ({ name: i.name, unit: i.unit, quantity: i.qty, price: i.price })),
        total: res.total,
      });
      const link = waUrl(settings?.whatsapp_phone || '', message);
      setSubmitted({ number: res.number, total: res.total, waLink: link });
      clear();
      // Intentar abrir WhatsApp automáticamente (si el navegador lo permite)
      window.open(link, '_blank');
    } catch (err: any) {
      if (err?.data?.errors) setFieldErrors(err.data.errors);
      toast(err?.message || 'No se pudo registrar el pedido', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">¡Pedido registrado!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tu pedido <b>{submitted.number}</b> por un total de{' '}
            <b>{formatPrice(submitted.total)}</b> quedó guardado. Lo preparamos apenas confirmemos
            por WhatsApp.
          </p>
          {settings?.bank_info && form.payment_method === 'Transferencia bancaria' && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-left text-xs leading-relaxed text-slate-600">
              <b className="block text-slate-800">Datos para transferencia:</b>
              <span className="whitespace-pre-line">{settings.bank_info}</span>
            </div>
          )}
          <a
            href={submitted.waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp mt-5 w-full"
          >
            <WhatsAppIcon /> ENVIAR PEDIDO POR WHATSAPP
          </a>
          <Link href="/" className="btn-ghost mt-3 w-full">
            ← Volver a la tienda
          </Link>
        </div>
      </main>
    );
  }

  if (empty) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
            <CartIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">Tu carrito está vacío</h1>
          <p className="mt-1 text-sm text-slate-500">Agregá productos para iniciar un pedido.</p>
          <Link href="/" className="btn-primary mt-5 w-full">
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 pb-24 sm:px-4">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800">
        ← Seguir comprando
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
        <TruckIcon className="h-7 w-7 text-brand-700" /> Finalizar pedido
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Completá tus datos y te abrimos WhatsApp con el pedido listo para enviar.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* ---------- Formulario ---------- */}
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-4 shadow-card sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-name">Nombre y apellido *</label>
              <input id="f-name" className="input" value={form.name} onChange={set('name')} placeholder="Juan Pérez" required />
              {fieldErrors.name && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="label" htmlFor="f-phone">Teléfono / WhatsApp *</label>
              <input id="f-phone" className="input" value={form.phone} onChange={set('phone')} placeholder="11 2345 6789" inputMode="tel" required />
              {fieldErrors.phone && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.phone}</p>}
            </div>
            <div>
              <label className="label" htmlFor="f-address">Dirección de entrega *</label>
              <input id="f-address" className="input" value={form.address} onChange={set('address')} placeholder="Calle 123" required />
              {fieldErrors.address && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.address}</p>}
            </div>
            <div>
              <label className="label" htmlFor="f-location">Localidad *</label>
              <input id="f-location" className="input" value={form.location} onChange={set('location')} placeholder="San Martín" required />
              {fieldErrors.location && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.location}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-reference">Referencia (opcional)</label>
              <input id="f-reference" className="input" value={form.reference} onChange={set('reference')} placeholder="Entre calles, color de casa, comercio…" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-payment">Método de pago *</label>
              <select id="f-payment" className="input" value={form.payment_method} onChange={set('payment_method')} required>
                <option value="" disabled>Seleccioná una opción…</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {fieldErrors.payment_method && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.payment_method}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-notes">Observaciones (opcional)</label>
              <textarea id="f-notes" className="input min-h-20" value={form.notes} onChange={set('notes')} placeholder="Horario de entrega, pedidos especiales…" />
            </div>
          </div>

          {settings?.bank_info && form.payment_method === 'Transferencia bancaria' && (
            <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              <b className="block text-sm text-slate-800">Datos para transferencia:</b>
              <span className="whitespace-pre-line">{settings.bank_info}</span>
            </div>
          )}

          <button type="submit" disabled={submitting || belowMin} className="btn-whatsapp w-full disabled:opacity-50">
            {submitting ? 'Registrando pedido…' : (<><WhatsAppIcon /> ENVIAR PEDIDO POR WHATSAPP</>)}
          </button>
          {belowMin && (
            <p className="text-center text-xs font-semibold text-amber-700">
              El pedido mínimo es de {formatPrice(minOrder)}. Te faltan {formatPrice(minOrder - total)}.
            </p>
          )}
        </form>

        {/* ---------- Resumen ---------- */}
        <aside className="h-fit rounded-2xl bg-white p-4 shadow-card sm:p-6 lg:sticky lg:top-4">
          <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
            <CartIcon className="h-5 w-5 text-brand-700" /> Resumen del pedido
          </h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {items.map((it) => (
              <li key={it.productId} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {it.qty} x {it.name}
                  </p>
                  <p className="text-xs text-slate-500">{it.unit}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-700">
                  {formatPrice(it.qty * it.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="font-extrabold text-slate-700">TOTAL</span>
            <span className="text-2xl font-extrabold text-brand-800">{formatPrice(total)}</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
