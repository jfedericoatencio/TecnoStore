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
import { XIcon, MinusIcon, PlusIcon, CartIcon } from '@/components/icons';
import { ProductImage } from './ProductCard';

export default function ProductModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow transition hover:bg-white"
          aria-label="Cerrar"
        >
          <XIcon />
        </button>

        <div className="overflow-hidden rounded-2xl bg-slate-100">
          <ProductImage product={product} className="aspect-[4/3] w-full" />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
              {product.category_name || 'Sin categoría'}
            </span>
            <span className={`badge-stock ${STOCK_CLASSES[state]}`}>{STOCK_LABELS[state]}</span>
            {product.sku && <span className="text-xs text-slate-400">SKU: {product.sku}</span>}
          </div>

          <h3 className="text-xl font-extrabold text-slate-900">{product.name}</h3>
          {product.description && (
            <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
          )}

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold text-brand-800">{formatPrice(price)}</span>
              {promo && (
                <>
                  <s className="text-base text-slate-400">{formatPrice(product.price)}</s>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-700">
                    🔥 OFERTA -{discountPercent(product)}%
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Se vende por: <b>{product.unit}</b>
              {product.stock > 0 && product.stock <= 5 && (
                <> · ¡Quedan solo {product.stock} unidades!</>
              )}
            </p>
          </div>

          {out ? (
            <div className="rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-700">
              Este producto no tiene stock disponible en este momento.
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-3 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Quitar una unidad"
                >
                  <MinusIcon />
                </button>
                <span className="w-10 text-center text-base font-extrabold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="px-3 py-3 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Agregar una unidad"
                >
                  <PlusIcon />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-base font-bold text-white transition hover:bg-brand-800 active:scale-[.98]"
              >
                <CartIcon /> AGREGAR AL CARRITO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
