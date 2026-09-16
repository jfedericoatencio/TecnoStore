'use client';
// ============================================================
// TIENDA PARA CLIENTES — encabezado, buscador, filtros por
// categoría, ofertas, grilla de productos, carrito flotante.
// ============================================================
import { useMemo, useState } from 'react';
import type { Category, Product, PublicSettings } from '@/lib/types';
import { formatPrice, hasPromo } from '@/lib/format';
import { useCart } from '@/components/CartContext';
import { SearchIcon, CartIcon, TruckIcon, WhatsAppIcon } from '@/components/icons';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import CartDrawer from './CartDrawer';
import { waUrl } from '@/lib/whatsapp';

export default function StoreView({
  products,
  categories,
  settings,
}: {
  products: Product[];
  categories: Category[];
  settings: PublicSettings;
}) {
  const { count, total } = useCart();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('todos');
  const [detail, setDetail] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat === 'ofertas') list = list.filter((p) => hasPromo(p));
    else if (activeCat === 'sin-categoria') list = list.filter((p) => !p.category_id);
    else if (activeCat !== 'todos')
      list = list.filter((p) => String(p.category_id) === activeCat);
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCat, q]);

  const offers = useMemo(() => products.filter((p) => hasPromo(p)), [products]);
  const showOffersSection = activeCat === 'todos' && !q && offers.length > 0;
  const minOrder = Number(settings.min_order || 0);

  const catChips = [
    { key: 'todos', label: 'Todos' },
    { key: 'ofertas', label: '🔥 Ofertas' },
    ...categories
      .filter((c) => (c.product_count ?? 0) > 0)
      .map((c) => ({ key: String(c.id), label: c.name })),
    ...(products.some((p) => !p.category_id)
      ? [{ key: 'sin-categoria', label: 'Sin categoría' }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      {/* ============ ENCABEZADO ============ */}
      <header className="relative overflow-hidden bg-brand-950">
        {settings.hero_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.hero_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/60 via-brand-950/40 to-brand-950" />

        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            {settings.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="Logo" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-brand-950">
                <TruckIcon className="h-6 w-6" />
              </span>
            )}
            <span className="text-sm font-extrabold tracking-widest text-white sm:text-base">
              {settings.business_name.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative rounded-xl bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Abrir carrito"
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-extrabold text-brand-950">
                {count}
              </span>
            )}
          </button>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pb-14">
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            {settings.business_name.toUpperCase()}
          </h1>
          {settings.tagline && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-100 sm:text-base">
              {settings.tagline}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-brand-100">
            {settings.hours && (
              <span className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">🕒 {settings.hours}</span>
            )}
            {settings.address && (
              <span className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">📍 {settings.address}</span>
            )}
            {minOrder > 0 && (
              <span className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
                🛒 Pedido mínimo {formatPrice(minOrder)}
              </span>
            )}
          </div>
          <a
            href="#catalogo"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-base font-extrabold text-brand-950 shadow-lg transition hover:bg-amber-300 active:scale-[.98]"
          >
            VER PRODUCTOS
          </a>
        </div>
      </header>

      {/* ============ BUSCADOR + CATEGORÍAS (sticky) ============ */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2.5 sm:px-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos, marcas o códigos…"
              className="input pl-11"
              aria-label="Buscar productos"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            {catChips.map((c) => {
              const active = activeCat === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCat(c.key)}
                  className={`chip ${
                    active
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-3 pb-32 sm:px-4">
        {/* ============ OFERTAS ============ */}
        {showOffersSection && (
          <section className="pt-6" aria-label="Ofertas">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">🔥 OFERTAS</h2>
              <button
                type="button"
                onClick={() => setActiveCat('ofertas')}
                className="text-sm font-bold text-brand-700 hover:text-brand-800"
              >
                Ver todas →
              </button>
            </div>
            <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
              {offers.map((p) => (
                <div key={p.id} className="w-44 shrink-0 sm:w-52">
                  <ProductCard product={p} onOpenDetail={setDetail} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============ CATÁLOGO ============ */}
        <section id="catalogo" className="pt-6" aria-label="Catálogo">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">
              {activeCat === 'todos'
                ? 'CATÁLOGO'
                : catChips.find((c) => c.key === activeCat)?.label.toUpperCase()}
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-card">
              <p className="text-lg font-bold text-slate-700">No encontramos productos 😕</p>
              <p className="mt-1 text-sm text-slate-500">
                Probá con otra búsqueda o elegí otra categoría.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCat('todos');
                }}
                className="btn-primary mt-4"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onOpenDetail={setDetail} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="bg-brand-950 text-brand-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-brand-950">
                <TruckIcon className="h-5 w-5" />
              </span>
              <span className="font-extrabold tracking-wide text-white">
                {settings.business_name.toUpperCase()}
              </span>
            </div>
            {settings.tagline && <p className="mt-3 text-sm leading-relaxed text-brand-200">{settings.tagline}</p>}
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-extrabold uppercase tracking-wide text-white">Contacto</h3>
            {settings.address && <p>📍 {settings.address}</p>}
            {settings.hours && <p className="mt-1">🕒 {settings.hours}</p>}
            {settings.whatsapp_phone && (
              <a
                href={waUrl(settings.whatsapp_phone, '¡Hola! Quiero hacer una consulta 🙌')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300"
              >
                <WhatsAppIcon className="h-4 w-4" /> Escribinos por WhatsApp
              </a>
            )}
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-extrabold uppercase tracking-wide text-white">Pagos</h3>
            {settings.bank_info && (
              <p className="whitespace-pre-line leading-relaxed text-brand-200">{settings.bank_info}</p>
            )}
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-brand-300 sm:flex-row">
            <span>
              © {new Date().getFullYear()} {settings.business_name} · Todos los precios por unidad de venta.
            </span>
            {/* Acceso discreto para el dueño — los clientes no tienen permisos */}
            <a href="/admin/login" className="text-brand-400/70 transition hover:text-white">
              Administración
            </a>
          </div>
        </div>
      </footer>

      {/* ============ BOTÓN FLOTANTE DEL CARRITO ============ */}
      {count > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-2xl bg-brand-700 py-3 pl-4 pr-5 text-white shadow-2xl transition hover:bg-brand-800 active:scale-[.98]"
          aria-label="Abrir carrito"
        >
          <span className="relative">
            <CartIcon className="h-6 w-6" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-extrabold text-brand-950">
              {count}
            </span>
          </span>
          <span className="text-left">
            <span className="block text-[10px] font-semibold uppercase leading-none text-brand-200">
              Tu carrito
            </span>
            <span className="block text-sm font-extrabold leading-tight">{formatPrice(total)}</span>
          </span>
        </button>
      )}

      {detail && <ProductModal product={detail} onClose={() => setDetail(null)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} settings={settings} />
    </div>
  );
}
