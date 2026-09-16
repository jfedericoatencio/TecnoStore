#!/usr/bin/env node
// ============================================================
// SEED DEL SERVIDOR — crea la base, el administrador inicial
// (contraseña HASHEADA con bcrypt), categorías, 15 productos
// demo y la configuración inicial.
//
//   npm run db:seed          → siembra si la base está vacía
//   npm run db:reset         → borra la base y vuelve a sembrar
//
// Las credenciales iniciales se leen de variables de entorno
// del SERVIDOR (ADMIN_INITIAL_USER / ADMIN_INITIAL_PASSWORD).
// Nunca aparecen en el código del frontend.
// ============================================================
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from '../src/db/schema.mjs';

// --- Carga mínima de .env (Node no lo hace automáticamente) ---
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');
const FORCE = process.argv.includes('--force');

// --- Reset opcional ---
for (const suffix of ['', '-wal', '-shm']) {
  const f = DB_PATH + suffix;
  if (FORCE && fs.existsSync(f)) fs.unlinkSync(f);
}
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(SCHEMA_SQL);

// --- Configuración inicial del negocio ---
const DEFAULT_SETTINGS = {
  business_name: 'Distribuidora Central',
  tagline:
    'Mayorista de alimentos y bebidas. Precios de bodega para comercios, bares, kioscos y particulares. Pedidos con entrega a domicilio.',
  whatsapp_phone: '5491123456789',
  address: 'Av. del Comercio 1234, San Martín, Buenos Aires',
  hours: 'Lunes a viernes de 8 a 18 h · Sábados de 8 a 13 h',
  min_order: '15000',
  bank_info:
    'Banco Nación · CBU 0110599930000001234567 · Alias DISTRIB.CENTRAL · Titular: Distribuidora Central SRL · CUIT 30-12345678-9',
  logo_url: '',
  hero_image_url: '/demo/hero.jpg',
};

const upsertSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
);
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsertSetting.run(k, v);

// --- Categorías ---
const CATEGORIES = ['Gaseosas', 'Aguas', 'Jugos', 'Lácteos', 'Almacén', 'Snacks', 'Limpieza'];
const insertCat = db.prepare(
  'INSERT INTO categories (name, sort_order) VALUES (?, ?) ON CONFLICT(name) DO NOTHING'
);
CATEGORIES.forEach((name, i) => insertCat.run(name, i));

const catId = (name) =>
  db.prepare('SELECT id FROM categories WHERE name = ?').get(name)?.id ?? null;

// --- Administrador inicial (contraseña hasheada, jamás en texto plano) ---
const adminUser = process.env.ADMIN_INITIAL_USER || 'admin';
const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin2026!';
const hash = bcrypt.hashSync(adminPass, 10);

const existingAdmin = db
  .prepare('SELECT id FROM users WHERE username = ?')
  .get(adminUser);

if (!existingAdmin) {
  db.prepare(
    'INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)'
  ).run(adminUser, hash);
  console.log(`✔ Administrador "${adminUser}" creado (contraseña hasheada con bcrypt, cambio obligatorio al primer ingreso).`);
} else {
  console.log(`• El administrador "${adminUser}" ya existe. No se modifica.`);
}

// --- 15 productos de prueba ---
const PRODUCTS = [
  ['Gaseosa Cola 2.25 L', 'Gaseosa sabor cola en botella descartable de 2.25 litros.', 'Gaseosas', 1850, 1590, 40, 'Caja x6', 'GA-001', 1, 1, '/demo/gaseosa-cola-225.jpg'],
  ['Gaseosa Lima-Limón 1.5 L', 'Gaseosa sabor lima-limón en botella descartable de 1.5 litros.', 'Gaseosas', 1390, null, 60, 'Pack x6', 'GA-002', 0, 1, '/demo/gaseosa-lima-limon.jpg'],
  ['Agua Mineral sin Gas 2 L', 'Agua mineral sin gas, botella descartable de 2 litros.', 'Aguas', 950, null, 120, 'Pack x8', 'AG-001', 0, 1, '/demo/agua-sin-gas.jpg'],
  ['Agua Mineral con Gas 2 L', 'Agua mineral gasificada, botella descartable de 2 litros.', 'Aguas', 1050, null, 80, 'Pack x8', 'AG-002', 0, 1, '/demo/agua-con-gas.jpg'],
  ['Jugo de Naranja 1 L', 'Jugo de naranja listopara beber, botella de 1 litro.', 'Jugos', 1250, 999, 35, 'Caja x12', 'JU-001', 1, 1, '/demo/jugo-naranja.jpg'],
  ['Jugo de Manzana 1 L', 'Jugo de manzana claro, botella de 1 litro.', 'Jugos', 1300, null, 28, 'Caja x12', 'JU-002', 0, 1, '/demo/jugo-manzana.jpg'],
  ['Leche Entera 1 L', 'Leche entera pasteurizada, sachet de 1 litro.', 'Lácteos', 1180, null, 90, 'Pack x6', 'LA-001', 1, 1, '/demo/leche.jpg'],
  ['Yogur Vainilla 1 kg', 'Yogur batido sabor vainilla, pote de 1 kilo.', 'Lácteos', 1980, null, 4, 'Unidad', 'LA-002', 0, 1, '/demo/yogur.jpg'],
  ['Arroz Blanco 1 kg', 'Arroz blanco doble ceraus, paquete de 1 kilo.', 'Almacén', 980, 850, 150, 'Bolsa x10', 'AL-001', 1, 1, '/demo/arroz.jpg'],
  ['Fideos Spaghetti 500 g', 'Fideos secos de sémola, formato spaghetti, 500 gramos.', 'Almacén', 720, null, 200, 'Bolsa x20', 'AL-002', 0, 1, '/demo/fideos.jpg'],
  ['Aceite de Girasol 900 ml', 'Aceite de girasol refinado, botella de 900 mililitros.', 'Almacén', 1450, null, 70, 'Caja x12', 'AL-003', 1, 1, '/demo/aceite.jpg'],
  ['Papas Fritas 150 g', 'Snack de papas fritas ultracongeladas al aire, paquete de 150 gramos.', 'Snacks', 1100, 890, 45, 'Caja x14', 'SN-001', 1, 1, '/demo/papas.jpg'],
  ['Maní Salado 250 g', 'Maní tostado y salado, paquete de 250 gramos.', 'Snacks', 1500, null, 0, 'Caja x10', 'SN-002', 0, 1, '/demo/mani.jpg'],
  ['Detergente Líquido 750 ml', 'Detergente líquido para ropa, botella de 750 mililitros.', 'Limpieza', 1750, null, 55, 'Pack x6', 'LI-001', 0, 1, '/demo/detergente.jpg'],
  ['Lavandina 1 L', 'Agua lavandina concentrada, botella de 1 litro.', 'Limpieza', 890, null, 3, 'Pack x12', 'LI-002', 0, 1, '/demo/lavandina.jpg'],
];

const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (productCount > 0) {
  console.log('• Los productos ya existen. No se duplican.');
} else {
  const insertProd = db.prepare(`
    INSERT INTO products (name, description, category_id, price, promo_price, stock, unit, sku, featured, available, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of PRODUCTS) {
    insertProd.run(p[0], p[1], catId(p[2]), p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10]);
  }
  console.log(`✔ ${PRODUCTS.length} productos de prueba cargados.`);
}

const counts = {
  categorias: db.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
  productos: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
  usuarios: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
  settings: db.prepare('SELECT COUNT(*) AS c FROM settings').get().c,
};
console.log('✔ Base de datos lista:', JSON.stringify(counts));
db.close();
