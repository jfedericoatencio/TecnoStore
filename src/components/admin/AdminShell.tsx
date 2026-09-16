'use client';
// Estructura del panel: menú lateral en escritorio, barra
// superior con scroll horizontal en móvil.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import {
  ChartIcon,
  BoxIcon,
  TagIcon,
  ClipboardIcon,
  SettingsIcon,
  LogoutIcon,
  TruckIcon,
  StoreIcon,
} from '@/components/icons';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: ChartIcon, exact: true },
  { href: '/admin/productos', label: 'Productos', icon: BoxIcon },
  { href: '/admin/categorias', label: 'Categorías', icon: TagIcon },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardIcon },
  { href: '/admin/configuracion', label: 'Configuración', icon: SettingsIcon },
];

export default function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch {}
    toast('Sesión cerrada', 'info');
    router.replace('/admin/login');
  };

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-950 text-amber-400">
              <TruckIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-extrabold tracking-wide text-slate-900">
              PANEL · DISTRIBUIDORA CENTRAL
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50 sm:inline-flex"
            >
              <StoreIcon className="h-4 w-4" /> Ver tienda
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogoutIcon className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
        {/* Nav móvil */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5 lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  active ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Menú lateral escritorio */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? 'bg-brand-700 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 rounded-2xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Sesión activa</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-800">@{username}</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
