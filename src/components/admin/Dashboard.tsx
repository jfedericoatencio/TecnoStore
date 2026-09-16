'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { formatPrice, formatDateTime, stockState, STOCK_CLASSES, STOCK_LABELS } from '@/lib/format';
import type { Order, Product } from '@/lib/types';
import { StatCard, StatusPill, Spinner, EmptyState } from './ui';
import {
  BoxIcon,
  CheckIcon,
  AlertIcon,
  TagIcon,
  ClipboardIcon,
  ChartIcon,
} from '@/components/icons';

interface StatsData {
  stats: {
    totalProducts: number;
    availableProducts: number;
    outOfStock: number;
    lowStock: number;
    categories: number;
    ordersToday: number;
    salesToday: number;
    pendingOrders: number;
    totalOrders: number;
  };
  recentOrders: Order[];
  lowStockProducts: Product[];
}

export default function Dashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<StatsData>('/api/admin/stats')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <EmptyState title="No se pudieron cargar las métricas" message={error} />;
  if (!data)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const { stats, recentOrders, lowStockProducts } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen del negocio en tiempo real.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BoxIcon className="h-4 w-4" />} label="Productos totales" value={stats.totalProducts} sub={`${stats.availableProducts} disponibles`} />
        <StatCard icon={<CheckIcon className="h-4 w-4" />} label="Disponibles" value={stats.availableProducts} accent="text-emerald-600" />
        <StatCard icon={<AlertIcon className="h-4 w-4" />} label="Sin stock" value={stats.outOfStock} accent="text-red-600" sub={`${stats.lowStock} con poco stock`} />
        <StatCard icon={<TagIcon className="h-4 w-4" />} label="Categorías" value={stats.categories} accent="text-purple-600" />
        <StatCard icon={<ClipboardIcon className="h-4 w-4" />} label="Pedidos de hoy" value={stats.ordersToday} accent="text-brand-700" sub={`${stats.pendingOrders} pendientes`} />
        <StatCard icon={<ChartIcon className="h-4 w-4" />} label="Ventas de hoy" value={formatPrice(stats.salesToday)} accent="text-emerald-700" />
        <StatCard icon={<ClipboardIcon className="h-4 w-4" />} label="Pedidos totales" value={stats.totalOrders} accent="text-slate-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Últimos pedidos */}
        <section className="rounded-2xl bg-white shadow-card">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-extrabold text-slate-800">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-xs font-bold text-brand-700 hover:text-brand-800">
              Ver todos →
            </Link>
          </header>
          {recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Todavía no hay pedidos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {o.number} · {o.customer_name}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(o.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-extrabold text-brand-800">{formatPrice(o.total)}</span>
                    <StatusPill status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Stock bajo */}
        <section className="rounded-2xl bg-white shadow-card">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-extrabold text-slate-800">⚠ Stock bajo o agotado</h2>
            <Link href="/admin/productos" className="text-xs font-bold text-brand-700 hover:text-brand-800">
              Repone stock →
            </Link>
          </header>
          {lowStockProducts.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Todo el stock está en orden. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStockProducts.map((p) => {
                const st = stockState(p.stock);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.category_name || 'Sin categoría'}</p>
                    </div>
                    <span className={`badge-stock ${STOCK_CLASSES[st]} shrink-0`}>
                      {STOCK_LABELS[st]} ({p.stock})
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
