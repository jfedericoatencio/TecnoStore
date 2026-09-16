'use client';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import {
  finalPrice,
  formatPrice,
  hasPromo,
  discountPercent,
  stockState,
  STOCK_LABELS,
  STOCK_CLASSES,
} from '@/lib/format';
import { useCart } from '@/components/CartContext';
import { toast } from '@/components/Toaster';
import { MinusIcon, PlusIcon, StarIcon, BoxIcon } from '@/components/icons';

export function ProductImage({
  product,
  className = '',
}: {
  product: Pick<Product, 'image_url' | 'name'>;
  className?: string;
}) {
  if (!product.image_url) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
        <BoxIcon className="h-10 w-10" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url}
      alt={product.name}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

export default function ProductCard({
  product,
  onOpenDetail,
}: {
  product: Product;
  onOpenDetail: (p: Product) => void;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const promo = hasPromo(product);
  const price = finalPrice(product);
  const state = stockState(product.stock);
  const out = state === 'out' || !product.available;

  const handleAdd = () => {
    if (out) return;
    const q = Math.min(qty, product.stock);
    add(product, q);
    toast(`${q} x ${product.name} agregado al carrito`, 'success');
    setQty(1);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
      <button
        type="button"
        onClick={() => onOpenDetail(product)}
        className="relative block aspect-square w-full overflow-hidden bg-slate-100"
        aria-label={`Ver detalle de ${product.name}`}
      >
        <ProductImage product={product} className="h-full w-full transition duration-300 hover:scale-105" />
        {promo && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
            🔥 -{discountPercent(product)}%
          </span>
        )}
        {product.featured && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-400 p-1 text-brand-950 shadow">
            <StarIcon className="h-3.5 w-3.5" />
          </span>
        )}
        {out && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold text-white">
              SIN STOCK
            </span>
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
          {product.category_name || 'Sin categoría'}
        </span>
        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="line-clamp-2 text-left text-sm font-semibold leading-snug text-slate-800"
        >
          {product.name}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">{product.unit}</span>
          <span className={`badge-stock ${STOCK_CLASSES[state]}`}>{STOCK_LABELS[state]}</span>
        </div>

        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-extrabold text-brand-800">{formatPrice(price)}</span>
            {promo && (
              <s className="text-xs font-medium text-slate-400">{formatPrice(product.price)}</s>
            )}
          </div>
          <span className="block text-[10px] text-slate-400">Precio por {product.unit.toLowerCase()}</span>

          {out ? (
            <button
              type="button"
              disabled
              className="mt-2 w-full cursor-not-allowed rounded-xl bg-slate-200 py-2.5 text-sm font-bold text-slate-400"
            >
              SIN STOCK
            </button>
          ) : (
            <div className="mt-2 flex gap-1.5">
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-2 py-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Quitar una unidad"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="px-2 py-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Agregar una unidad"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 rounded-xl bg-brand-700 py-2 text-sm font-bold text-white transition hover:bg-brand-800 active:scale-[.98]"
              >
                AGREGAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
