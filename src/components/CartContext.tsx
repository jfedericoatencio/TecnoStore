'use client';
// ============================================================
// Carrito de compras — contexto global con persistencia en
// localStorage (sobrevive recargas de la página).
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Product } from '@/lib/types';
import { finalPrice } from '@/lib/format';

export interface CartItem {
  productId: number;
  name: string;
  unit: string;
  price: number;
  image_url: string;
  stock: number;
  qty: number;
}

interface CartApi {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, qty: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  ready: boolean;
}

const CartContext = createContext<CartApi | null>(null);
const STORAGE_KEY = 'dc_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && i.productId && i.qty > 0));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((p: Product, qty: number) => {
    setItems((prev) => {
      const q = Math.max(1, Math.floor(qty));
      const existing = prev.find((i) => i.productId === p.id);
      const maxStock = Math.max(0, Number(p.stock));
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, qty: Math.min(maxStock, i.qty + q), stock: maxStock, price: finalPrice(p) } : i
        );
      }
      if (maxStock <= 0) return prev;
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          price: finalPrice(p),
          image_url: p.image_url,
          stock: maxStock,
          qty: Math.min(q, maxStock),
        },
      ];
    });
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, qty: Math.min(Math.max(0, Math.floor(qty)), i.stock) }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const api = useMemo<CartApi>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, total, add, setQty, remove, clear, ready };
  }, [items, add, setQty, remove, clear, ready]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
