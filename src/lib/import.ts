// ============================================================
// Utilidades de importación masiva (Excel/CSV).
// Se usan SOLO del lado del servidor (API routes).
// ============================================================

export const IMPORT_COLUMNS = [
  'nombre',
  'descripcion',
  'categoria',
  'precio',
  'precio_promocional',
  'stock',
  'unidad',
  'sku',
  'destacado',
  'disponible',
  'url_imagen',
] as const;

const HEADER_MAP: Record<string, string> = {
  nombre: 'nombre',
  name: 'nombre',
  producto: 'nombre',
  descripcion: 'descripcion',
  description: 'descripcion',
  detalle: 'descripcion',
  categoria: 'categoria',
  category: 'categoria',
  rubro: 'categoria',
  precio: 'precio',
  price: 'precio',
  precio_venta: 'precio',
  precio_promocional: 'precio_promocional',
  precio_promo: 'precio_promocional',
  precio_anterior: 'precio_promocional',
  oferta: 'precio_promocional',
  stock: 'stock',
  existencia: 'stock',
  existencias: 'stock',
  cantidad: 'stock',
  unidad: 'unidad',
  unidad_venta: 'unidad',
  presentacion: 'unidad',
  sku: 'sku',
  codigo: 'sku',
  cod: 'sku',
  destacado: 'destacado',
  destacados: 'destacado',
  disponible: 'disponible',
  disponibilidad: 'disponible',
  activo: 'disponible',
  habilitado: 'disponible',
  url_imagen: 'url_imagen',
  imagen: 'url_imagen',
  imagen_url: 'url_imagen',
  foto: 'url_imagen',
  image: 'url_imagen',
};

export function normKey(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function mapHeader(h: unknown): string | null {
  return HEADER_MAP[normKey(h)] ?? null;
}

/** Acepta números de Excel, "1850", "$ 1.850,50", "1850.50"… */
export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  let s = String(v).trim().replace(/[$\s]/g, '');
  if (!s) return null;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) s = s.replace(/\./g, '').replace(/,/g, '.');
  else if (hasComma) s = s.replace(/,/g, '.');
  else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TRUE_WORDS = new Set(['si', 'sí', 's', 'yes', 'y', 'true', 'verdadero', '1', 'x', 'ok']);
const FALSE_WORDS = new Set(['no', 'n', 'false', 'falso', '0']);

/** Devuelve true/false, o null si viene vacío/ilegible */
export function parseBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v == null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (TRUE_WORDS.has(s)) return true;
  if (FALSE_WORDS.has(s)) return false;
  return null;
}

export interface ImportRow {
  rowIndex: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number | null;
  precio_promocional: number | null;
  stock: number | null;
  unidad: string;
  sku: string;
  destacado: boolean;
  disponible: boolean;
  url_imagen: string;
  errors: string[];
  warnings: string[];
}

export interface RawRow extends Record<string, unknown> {}

/** Convierte una fila cruda del Excel en ImportRow validada */
export function buildImportRow(
  raw: RawRow,
  rowIndex: number,
  existingCats: Map<string, string>
): ImportRow {
  const row: ImportRow = {
    rowIndex,
    nombre: '',
    descripcion: '',
    categoria: '',
    precio: null,
    precio_promocional: null,
    stock: null,
    unidad: 'Unidad',
    sku: '',
    destacado: false,
    disponible: true,
    url_imagen: '',
    errors: [],
    warnings: [],
  };

  for (const [rawKey, value] of Object.entries(raw)) {
    const key = mapHeader(rawKey);
    if (!key) continue;
    switch (key) {
      case 'nombre':
        row.nombre = String(value ?? '').trim();
        break;
      case 'descripcion':
        row.descripcion = String(value ?? '').trim();
        break;
      case 'categoria':
        row.categoria = String(value ?? '').trim();
        break;
      case 'precio': {
        if (value === '' || value == null) break;
        const n = parseNumber(value);
        row.precio = n;
        break;
      }
      case 'precio_promocional': {
        if (value === '' || value == null) break;
        row.precio_promocional = parseNumber(value);
        break;
      }
      case 'stock': {
        if (value === '' || value == null) break;
        const n = parseNumber(value);
        if (n != null) row.stock = Math.round(n);
        break;
      }
      case 'unidad':
        if (String(value ?? '').trim()) row.unidad = String(value).trim();
        break;
      case 'sku':
        row.sku = String(value ?? '').trim();
        break;
      case 'destacado': {
        const b = parseBool(value);
        if (b == null && String(value ?? '').trim()) {
          row.warnings.push('Destacado ilegible → se tomó como "no"');
        }
        row.destacado = b ?? false;
        break;
      }
      case 'disponible': {
        const b = parseBool(value);
        if (b == null && String(value ?? '').trim()) {
          row.warnings.push('Disponible ilegible → se tomó como "sí"');
        }
        row.disponible = b ?? true;
        break;
      }
      case 'url_imagen':
        row.url_imagen = String(value ?? '').trim();
        break;
    }
  }

  // ---- Validaciones ----
  if (!row.nombre) row.errors.push('Falta el nombre');
  if (row.precio == null) row.errors.push('Falta el precio');
  else if (row.precio <= 0) row.errors.push('El precio debe ser mayor a 0');

  if (row.precio_promocional != null) {
    if (row.precio_promocional <= 0) {
      row.precio_promocional = null;
      row.warnings.push('Precio promocional inválido → se ignora');
    } else if (row.precio != null && row.precio_promocional >= row.precio) {
      row.errors.push('El precio promocional debe ser MENOR al precio normal');
    }
  }

  if (row.stock == null) {
    row.stock = 0;
  } else if (row.stock < 0) {
    row.errors.push('El stock no puede ser negativo');
  }

  if (row.categoria) {
    const canonical = existingCats.get(row.categoria.toLowerCase());
    if (canonical) {
      row.categoria = canonical;
    } else {
      row.warnings.push(`Categoría "${row.categoria}" no existe todavía`);
    }
  }

  return row;
}
