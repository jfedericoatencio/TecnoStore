'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { formatPrice } from '@/lib/format';
import { XIcon, MinusIcon, PlusIcon, TrashIcon, CartIcon, WhatsAppIcon } from '@/components/icons';
import type { PublicSettings } from '@/lib/types';

export default function CartDrawer({
  open,
  onClose,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  settings: PublicSettings;
}) {
  const { items, count, total, setQty, remove, clear } = useCart();
  const router = useRouter();
  if (!open) return null;

  const minOrder = Number(settings.min_order || 0);
  const belowMin = minOrder > 0 && total < minOrder;

  const goCheckout = () => {
    if (items.length === 0 || belowMin) return;
    onClose();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <CartIcon className="h-6 w-6 text-brand-700" />
            Tu carrito ({count})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Cerrar carrito"
          >
            <XIcon />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="rounded-full bg-slate-100 p-6 text-slate-300">
              <CartIcon className="h-10 w-10" />
            </div>
            <p className="font-semibold text-slate-500">Tu carrito está vacío</p>
            <button type="button" onClick={onClose} className="btn-primary">
              Ver productos
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-4">
              {items.map((it) => (
                <li key={it.productId} className="flex gap-3 py-3">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{it.name}</p>
                        <p className="text-xs text-slate-500">
                          {it.unit} · {formatPrice(it.price)} c/u
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(it.productId)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Quitar ${it.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
                        <button
                          type="button"
                          onClick={() => setQty(it.productId, it.qty - 1)}
                          className="px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100"
                          aria-label="Disminuir cantidad"
                        >
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(it.productId, it.qty + 1)}
                          disabled={it.qty >= it.stock}
                          className="px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                          aria-label="Aumentar cantidad"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-extrabold text-brand-800">
                        {formatPrice(it.qty * it.price)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Productos: {count}</span>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-bold text-red-500 hover:text-red-700"
                >
                  Vaciar carrito
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">TOTAL</span>
                <span className="text-2xl font-extrabold text-brand-800">{formatPrice(total)}</span>
              </div>
              {belowMin && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  ⚠ El pedido mínimo es de {formatPrice(minOrder)}. Te faltan{' '}
                  {formatPrice(minOrder - total)}.
                </p>
              )}
              <button
                type="button"
                onClick={goCheckout}
                disabled={belowMin}
                className="btn-whatsapp w-full disabled:opacity-50"
              >
                <WhatsAppIcon /> INICIAR PEDIDO
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
