import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartContext';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'Distribuidora Central — Mayorista de alimentos y bebidas',
  description:
    'Tienda online mayorista de alimentos y bebidas. Hacé tu pedido por WhatsApp. Panel de administración para el dueño.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f2557',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <CartProvider>{children}</CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
