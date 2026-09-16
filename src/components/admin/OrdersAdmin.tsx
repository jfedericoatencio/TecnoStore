'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { formatPrice, formatDateTime, statusLabel } from '@/lib/format';
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/lib/types';
import { StatusPill, Spinner, EmptyState } from './ui';
import { toast } from '@/components/Toaster';
import { SearchIcon, ChevronDownIcon, WhatsAppIcon } from '@/components/icons';
import { waUrl } from '@/lib/whatsapp';

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ orders: Order[] }>(`/api/admin/orders?${params}`);
      setOrders(res.orders);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { '': orders?.length ?? 0 };
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const changeStatus = async (o: Order, status: OrderStatus) => {
    try {
      await api(`/api/admin/orders/${o.id}`, { method: 'PATCH', json: { status } });
      setOrders((prev) => prev?.map((x) => (x.id === o.id ? { ...x, status } : x)) ?? prev);
      toast(`Pedido ${o.number} → ${statusLabel(status)}`, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Pedidos</h1>
        <p className="text-sm text-slate-500">Todos los pedidos registrados desde la tienda.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`chip ${statusFilter === '' ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Todos ({counts[''] ?? 0})
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatusFilter(s.key)}
              className={`chip ${statusFilter === s.key ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
            >
              {s.label} {counts[s.key] ? `(${counts[s.key]})` : ''}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="N° pedido, cliente o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {orders === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No hay pedidos" message="Cuando un cliente confirme su compra, aparecerá acá." />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const open = expanded === o.id;
            return (
              <div key={o.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : o.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900">
                      {o.number}{' '}
                      <span className="text-sm font-semibold text-slate-500">· {o.customer_name}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(o.created_at)} · {o.payment_method} · {o.items?.length ?? 0} ítems
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-brand-800">{formatPrice(o.total)}</span>
                    <StatusPill status={o.status} />
                    <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Productos</h3>
                        <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
                          {(o.items ?? []).map((it) => (
                            <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                              <span className="min-w-0 truncate">
                                <b>{it.quantity} x</b> {it.name}
                                {it.unit && it.unit !== 'Unidad' && (
                                  <span className="text-xs text-slate-400"> ({it.unit})</span>
                                )}
                              </span>
                              <span className="shrink-0 font-bold text-slate-700">
                                {formatPrice(it.price * it.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex justify-between px-3 text-sm font-extrabold">
                          <span>TOTAL</span>
                          <span className="text-brand-800">{formatPrice(o.total)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm text-slate-600">
                        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Entrega y cliente</h3>
                        <p>📍 {o.address}, {o.location}</p>
                        {o.reference && <p>📌 Ref: {o.reference}</p>}
                        <p>👤 {o.customer_name}</p>
                        <p>📞 {o.phone}</p>
                        <p>💳 {o.payment_method}</p>
                        {o.notes && <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">📝 {o.notes}</p>}

                        <div className="flex flex-wrap items-center gap-2 pt-3">
                          <label className="text-xs font-extrabold uppercase text-slate-400">Estado:</label>
                          <select
                            className="input w-auto py-1.5 text-sm"
                            value={o.status}
                            onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                          <a
                            href={waUrl(
                              o.phone,
                              `¡Hola ${o.customer_name}! Te contactamos de la distribuidora por tu pedido ${o.number} 🙌`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <WhatsAppIcon className="h-4 w-4" /> Contactar
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
