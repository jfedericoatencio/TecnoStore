// Validación y mapeo de productos (compartido entre rutas API)
import type { Product } from './types';

export function mapProduct(r: any): Product {
  return {
    ...r,
    price: Number(r.price),
    promo_price: r.promo_price == null || r.promo_price === '' ? null : Number(r.promo_price),
    stock: Number(r.stock),
    featured: !!Number(r.featured),
    available: !!Number(r.available),
  };
}

export interface ProductInput {
  name?: string;
  description?: string;
  category_id?: number | string | null;
  price?: number | string;
  promo_price?: number | string | null;
  stock?: number | string;
  unit?: string;
  sku?: string;
  featured?: boolean;
  available?: boolean;
  image_url?: string;
}

export function validateProduct(body: ProductInput): {
  errors: Record<string, string>;
  values: {
    name: string; description: string; category_id: number | null;
    price: number; promo_price: number | null; stock: number;
    unit: string; sku: string; featured: 0 | 1; available: 0 | 1; image_url: string;
  };
} {
  const errors: Record<string, string> = {};
  const name = String(body.name ?? '').trim();
  const price = Number(body.price);
  const promoRaw =
    body.promo_price === '' || body.promo_price == null ? null : Number(body.promo_price);
  const stock = Math.floor(Number(body.stock ?? 0));

  if (name.length < 2) errors.name = 'El nombre es obligatorio';
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Ingresá un precio válido';
  if (promoRaw != null) {
    if (!Number.isFinite(promoRaw) || promoRaw <= 0) errors.promo_price = 'Precio promocional inválido';
    else if (Number.isFinite(price) && promoRaw >= price)
      errors.promo_price = 'Debe ser menor al precio normal';
  }
  if (!Number.isFinite(stock) || stock < 0) errors.stock = 'Stock inválido';

  const values = {
    name,
    description: String(body.description ?? '').trim(),
    category_id:
      body.category_id === '' || body.category_id == null ? null : Number(body.category_id) || null,
    price,
    promo_price: promoRaw,
    stock: Number.isFinite(stock) ? stock : 0,
    unit: String(body.unit ?? '').trim() || 'Unidad',
    sku: String(body.sku ?? '').trim(),
    featured: body.featured ? (1 as const) : (0 as const),
    available: body.available === false ? (0 as const) : (1 as const),
    image_url: String(body.image_url ?? '').trim(),
  };
  return { errors, values };
}
