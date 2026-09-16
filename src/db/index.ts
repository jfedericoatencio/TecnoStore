// Base SQLite con catálogo de demostración para despliegues serverless.
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from './schema.mjs';

export type DbRow = Record<string, unknown>;
let _db: DatabaseSync | null = null;

const CATEGORIES = ['Gaseosas', 'Aguas', 'Jugos', 'Lácteos', 'Almacén', 'Snacks', 'Limpieza'];
const PRODUCTS: Array<[string, string, string, number, number | null, number, string, string, number, number, string]> = [
  ['Gaseosa Cola 2.25 L', 'Gaseosa sabor cola en botella descartable de 2.25 litros.', 'Gaseosas', 1850, 1590, 40, 'Caja x6', 'GA-001', 1, 1, '/demo/gaseosa-cola-225.jpg'],
  ['Gaseosa Lima-Limón 1.5 L', 'Gaseosa sabor lima-limón en botella descartable de 1.5 litros.', 'Gaseosas', 1390, null, 60, 'Pack x6', 'GA-002', 0, 1, '/demo/gaseosa-lima-limon.jpg'],
  ['Agua Mineral sin Gas 2 L', 'Agua mineral sin gas, botella descartable de 2 litros.', 'Aguas', 950, null, 120, 'Pack x8', 'AG-001', 0, 1, '/demo/agua-sin-gas.jpg'],
  ['Jugo de Naranja 1 L', 'Jugo de naranja listo para beber, botella de 1 litro.', 'Jugos', 1250, 999, 35, 'Caja x12', 'JU-001', 1, 1, '/demo/jugo-naranja.jpg'],
  ['Leche Entera 1 L', 'Leche entera pasteurizada, sachet de 1 litro.', 'Lácteos', 1180, null, 90, 'Pack x6', 'LA-001', 1, 1, '/demo/leche.jpg'],
  ['Arroz Blanco 1 kg', 'Arroz blanco doble carolina, paquete de 1 kilo.', 'Almacén', 980, 850, 150, 'Bolsa x10', 'AL-001', 1, 1, '/demo/arroz.jpg'],
  ['Aceite de Girasol 900 ml', 'Aceite de girasol refinado, botella de 900 mililitros.', 'Almacén', 1450, null, 70, 'Caja x12', 'AL-003', 1, 1, '/demo/aceite.jpg'],
  ['Papas Fritas 150 g', 'Snack de papas fritas, paquete de 150 gramos.', 'Snacks', 1100, 890, 45, 'Caja x14', 'SN-001', 1, 1, '/demo/papas.jpg'],
  ['Detergente Líquido 750 ml', 'Detergente líquido para ropa, botella de 750 mililitros.', 'Limpieza', 1750, null, 55, 'Pack x6', 'LI-001', 0, 1, '/demo/detergente.jpg'],
];

function seedDemoData(db: DatabaseSync): void {
  const count = Number((db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c);
  if (count > 0) return;
  const setting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING');
  for (const [key, value] of Object.entries({ business_name: 'Distribuidora Central', tagline: 'Mayorista de alimentos y bebidas. Precios de bodega para comercios, bares, kioscos y particulares.', whatsapp_phone: '5491123456789', address: 'Av. del Comercio 1234, San Martín, Buenos Aires', hours: 'Lunes a viernes de 8 a 18 h · Sábados de 8 a 13 h', min_order: '15000', bank_info: '', logo_url: '', hero_image_url: '/demo/hero.jpg' })) setting.run(key, value);
  const addCategory = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?) ON CONFLICT(name) DO NOTHING');
  CATEGORIES.forEach((name, index) => addCategory.run(name, index));
  const username = process.env.ADMIN_INITIAL_USER || 'admin';
  if (!db.prepare('SELECT id FROM users WHERE username = ?').get(username)) db.prepare('INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)').run(username, bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD || 'Admin2026!', 10));
  const findCategory = db.prepare('SELECT id FROM categories WHERE name = ?');
  const addProduct = db.prepare('INSERT INTO products (name, description, category_id, price, promo_price, stock, unit, sku, featured, available, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const item of PRODUCTS) {
    const category = findCategory.get(item[2]) as { id?: number } | undefined;
    addProduct.run(item[0], item[1], category?.id ?? null, item[3], item[4], item[5], item[6], item[7], item[8], item[9], item[10]);
  }
}

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const dbPath = process.env.DATABASE_PATH || (process.env.VERCEL ? path.join('/tmp', 'app.db') : path.join(process.cwd(), 'data', 'app.db'));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  seedDemoData(db);
  _db = db;
  return db;
}

export function tx<T>(fn: () => T): T { const db = getDb(); db.exec('BEGIN'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (err) { db.exec('ROLLBACK'); throw err; } }
export function lastId(res: { lastInsertRowid: number | bigint }): number { return Number(res.lastInsertRowid); }
export function changes(res: { changes: number | bigint }): number { return Number(res.changes); }
function plain<T>(v: T): T { return v == null ? v : JSON.parse(JSON.stringify(v)); }
export function qAll<T = DbRow>(sql: string, ...params: (string | number | null)[]): T[] { return (getDb().prepare(sql).all(...params) as unknown as T[]).map((row) => plain(row)); }
export function qGet<T = DbRow>(sql: string, ...params: (string | number | null)[]): T | undefined { return plain(getDb().prepare(sql).get(...params) as unknown as T | undefined); }
export function qRun(sql: string, ...params: (string | number | null)[]): { changes: number; lastInsertRowid: number } { const result = getDb().prepare(sql).run(...params); return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) }; }
