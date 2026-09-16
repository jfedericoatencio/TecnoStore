#!/usr/bin/env node
// ============================================================
// SEED DEL SERVIDOR — crea la base, el administrador inicial
// (contraseña HASHEADA con bcrypt), categorías, 15 productos
// demo y la configuración inicial.
//
//   npm run db:seed          → siembra si la base está vacía
//   npm run db:reset         → borra la base y vuelve a sembrar (--force)
//
// Soporta tanto PostgreSQL/Supabase (si DATABASE_URL / POSTGRES_URL
// está definido) como SQLite (desarrollo local).
// ============================================================
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { SCHEMA_SQL, SCHEMA_POSTGRES } from '../src/db/schema.mjs';
import { DEFAULT_SETTINGS, CATEGORIES, PRODUCTS } from '../src/db/seedData.mjs';

// --- Carga de .env ---
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

const FORCE = process.argv.includes('--force');
const adminUser = process.env.ADMIN_INITIAL_USER || 'admin';
const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin2026!';
const hash = bcrypt.hashSync(adminPass, 10);

const pgUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

async function seedPostgres(connectionString) {
  console.log('🔌 Conectando a PostgreSQL / Supabase...');
  const isRemote =
    !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

  const client = new pg.Client({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  console.log('✔ Conexión exitosa a la base de datos.');

  if (FORCE) {
    console.log('⚠️  Reset forzado: eliminando tablas anteriores...');
    await client.query(
      'DROP TABLE IF EXISTS order_items, orders, products, categories, settings, users CASCADE;'
    );
  }

  await client.query(SCHEMA_POSTGRES);

  // Settings
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await client.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [k, v]
    );
  }

  // Categorías
  for (let i = 0; i < CATEGORIES.length; i++) {
    await client.query(
      'INSERT INTO categories (name, sort_order) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [CATEGORIES[i], i]
    );
  }

  // Administrador inicial
  const existingAdmin = await client.query('SELECT id FROM users WHERE username = $1', [
    adminUser,
  ]);
  if (existingAdmin.rows.length === 0) {
    await client.query(
      'INSERT INTO users (username, password_hash, must_change_password) VALUES ($1, $2, 1)',
      [adminUser, hash]
    );
    console.log(
      `✔ Administrador "${adminUser}" creado (contraseña hasheada con bcrypt, cambio obligatorio al primer ingreso).`
    );
  } else {
    console.log(`• El administrador "${adminUser}" ya existe. No se modifica.`);
  }

  // Productos
  const countRes = await client.query('SELECT COUNT(*) AS c FROM products');
  if (Number(countRes.rows[0].c) > 0) {
    console.log('• Los productos ya existen. No se duplican.');
  } else {
    const catMapRes = await client.query('SELECT id, name FROM categories');
    const catMap = new Map(catMapRes.rows.map((r) => [r.name.toLowerCase(), r.id]));

    for (const p of PRODUCTS) {
      const cId = catMap.get(String(p[2]).toLowerCase()) ?? null;
      await client.query(
        `INSERT INTO products (name, description, category_id, price, promo_price, stock, unit, sku, featured, available, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [p[0], p[1], cId, p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10]]
      );
    }
    console.log(`✔ ${PRODUCTS.length} productos de prueba cargados.`);
  }

  const counts = {
    categorias: Number((await client.query('SELECT COUNT(*) AS c FROM categories')).rows[0].c),
    productos: Number((await client.query('SELECT COUNT(*) AS c FROM products')).rows[0].c),
    usuarios: Number((await client.query('SELECT COUNT(*) AS c FROM users')).rows[0].c),
    settings: Number((await client.query('SELECT COUNT(*) AS c FROM settings')).rows[0].c),
  };
  console.log('✔ Base de datos PostgreSQL lista:', JSON.stringify(counts));
  await client.end();
}

async function seedSqlite() {
  console.log('📁 Usando SQLite local...');
  const { DatabaseSync } = await import('node:sqlite');
  const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');

  if (FORCE) {
    for (const suffix of ['', '-wal', '-shm']) {
      const f = DB_PATH + suffix;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);

  const upsertSetting = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
  );
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsertSetting.run(k, v);

  const insertCat = db.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?) ON CONFLICT(name) DO NOTHING'
  );
  CATEGORIES.forEach((name, i) => insertCat.run(name, i));

  const catId = (name) =>
    db.prepare('SELECT id FROM categories WHERE name = ?').get(name)?.id ?? null;

  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser);
  if (!existingAdmin) {
    db.prepare(
      'INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)'
    ).run(adminUser, hash);
    console.log(
      `✔ Administrador "${adminUser}" creado (contraseña hasheada con bcrypt, cambio obligatorio al primer ingreso).`
    );
  } else {
    console.log(`• El administrador "${adminUser}" ya existe. No se modifica.`);
  }

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
  console.log('✔ Base de datos SQLite lista:', JSON.stringify(counts));
  db.close();
}

async function main() {
  try {
    if (pgUrl) {
      await seedPostgres(pgUrl);
    } else {
      await seedSqlite();
    }
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

main();
