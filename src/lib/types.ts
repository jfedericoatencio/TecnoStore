// Tipos compartidos de la aplicación

export interface Category {
  id: number;
  name: string;
  sort_order: number;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category_id: number | null;
  category_name?: string | null;
  price: number;
  promo_price: number | null;
  stock: number;
  unit: string;
  sku: string;
  featured: boolean;
  available: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'nuevo'
  | 'confirmado'
  | 'preparando'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number | null;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  number: string;
  customer_name: string;
  phone: string;
  address: string;
  location: string;
  reference: string;
  payment_method: string;
  notes: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  items?: OrderItem[];
}

export type SettingsMap = Record<string, string>;

export interface PublicSettings {
  business_name: string;
  tagline: string;
  whatsapp_phone: string;
  address: string;
  hours: string;
  min_order: string;
  bank_info: string;
  logo_url: string;
  hero_image_url: string;
}

export const ORDER_STATUSES: { key: OrderStatus; label: string }[] = [
  { key: 'nuevo', label: 'Nuevo' },
  { key: 'confirmado', label: 'Confirmado' },
  { key: 'preparando', label: 'Preparando' },
  { key: 'en_camino', label: 'En camino' },
  { key: 'entregado', label: 'Entregado' },
  { key: 'cancelado', label: 'Cancelado' },
];
