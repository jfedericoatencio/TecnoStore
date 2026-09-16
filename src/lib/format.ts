import type { OrderStatus, Product } from './types';
import { ORDER_STATUSES } from './types';

/** $ 1.850,50 (formato es-AR) */
export function formatPrice(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return (
    '$' +
    v.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Precio efectivo de venta (promo si existe) */
export function finalPrice(p: Pick<Product, 'price' | 'promo_price'>): number {
  return p.promo_price != null && p.promo_price > 0 && p.promo_price < p.price
    ? p.promo_price
    : p.price;
}

export function hasPromo(p: Pick<Product, 'price' | 'promo_price'>): boolean {
  return (
    p.promo_price != null && p.promo_price > 0 && p.promo_price < p.price
  );
}

export function discountPercent(p: Pick<Product, 'price' | 'promo_price'>): number {
  if (!hasPromo(p) || !p.price) return 0;
  return Math.round((1 - p.promo_price! / p.price) * 100);
}

export type StockState = 'ok' | 'low' | 'out';

export const LOW_STOCK_THRESHOLD = 5;

export function stockState(stock: number): StockState {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

export const STOCK_LABELS: Record<StockState, string> = {
  ok: 'EN STOCK',
  low: 'POCO STOCK',
  out: 'SIN STOCK',
};

export const STOCK_CLASSES: Record<StockState, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  low: 'bg-amber-100 text-amber-800',
  out: 'bg-red-100 text-red-700',
};

export function statusLabel(s: OrderStatus): string {
  return ORDER_STATUSES.find((o) => o.key === s)?.label ?? s;
}

export const STATUS_CLASSES: Record<OrderStatus, string> = {
  nuevo: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-indigo-100 text-indigo-800',
  preparando: 'bg-amber-100 text-amber-800',
  en_camino: 'bg-purple-100 text-purple-800',
  entregado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-700',
};

/** "2026-09-16 14:03:22" o Date → fecha local legible */
export function formatDateTime(sqlDate: string | Date | null | undefined): string {
  if (!sqlDate) return '';
  if (sqlDate instanceof Date) {
    return sqlDate.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const s = String(sqlDate);
  const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
