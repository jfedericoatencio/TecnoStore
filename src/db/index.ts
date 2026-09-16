// ============================================================
// Conexión a la base de datos con soporte dual:
// - Producción (Vercel / Supabase): PostgreSQL vía `pg`
// - Desarrollo local / fallback: SQLite (módulo nativo `node:sqlite`)
// ============================================================
import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL, SCHEMA_POSTGRES } from './schema.mjs';
import { DEFAULT_SETTINGS, CATEGORIES, PRODUCTS } from './seedData.mjs';

export type DbRow = Record<string, unknown>;

// Configurar type parsers para que PostgreSQL devuelva números y fechas nativamente
// OID 20: INT8 (bigint), ej. COUNT(*)
pg.types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));
// OID 21: INT2 (smallint)
pg.types.setTypeParser(21, (val: string) => (val === null ? null : parseInt(val, 10)));
// OID 23: INT4 (integer)
pg.types.setTypeParser(23, (val: string) => (val === null ? null : parseInt(val, 10)));
// OID 1700: NUMERIC / DECIMAL
pg.types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));
// OID 700: FLOAT4
pg.types.setTypeParser(700, (val: string) => (val === null ? null : parseFloat(val)));
// OID 701: FLOAT8
pg.types.setTypeParser(701, (val: string) => (val === null ? null : parseFloat(val)));

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
  // eslint-disable-next-line no-var
  var __sqliteDb: any | undefined;
  // eslint-disable-next-line no-var
  var __schemaInitialized: boolean | undefined;
}

const txStorage = new AsyncLocalStorage<pg.PoolClient>();

/** Determina si se utiliza PostgreSQL (Supabase / Postgres) o SQLite local */
export function isPostgres(): boolean {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  return Boolean(url && url.trim().length > 0);
}

function getConnectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  );
}

export function getPgPool(): pg.Pool {
  if (globalThis.__pgPool) return globalThis.__pgPool;
  const connectionString = getConnectionString();
  const isRemote =
    connectionString &&
    !connectionString.includes('localhost') &&
    !connectionString.includes('127.0.0.1');

  const pool = new pg.Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err) => {
    console.error('Error inesperado en cliente del pool de Postgres:', err);
  });

  globalThis.__pgPool = pool;
  return pool;
}

function getSqliteDb(): any {
  if (globalThis.__sqliteDb) return globalThis.__sqliteDb;
  // Carga diferida de node:sqlite solo si se utiliza SQLite
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  globalThis.__sqliteDb = db;
  return db;
}

let _initPromise: Promise<void> | null = null;

/** Inicializa las tablas y datos base si aún no existen */
export async function ensureInitialized(): Promise<void> {
  if (globalThis.__schemaInitialized) return;
  if (!_initPromise) {
    _initPromise = (async () => {
      try {
        if (isPostgres()) {
          const pool = getPgPool();
          await pool.query(SCHEMA_POSTGRES);

          // Verificar si ya existe usuario admin; si la base está vacía, sembramos lo esencial
          const usersRes = await pool.query('SELECT COUNT(*) AS c FROM users');
          const userCount = Number(usersRes.rows[0]?.c ?? 0);

          if (userCount === 0) {
            console.log('⚡ Base PostgreSQL vacía detectada. Inicializando datos esenciales...');
            const adminUser = process.env.ADMIN_INITIAL_USER || 'admin';
            const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin2026!';
            const hash = bcrypt.hashSync(adminPass, 10);
            await pool.query(
              'INSERT INTO users (username, password_hash, must_change_password) VALUES ($1, $2, 1) ON CONFLICT (username) DO NOTHING',
              [adminUser, hash]
            );

            // Settings
            for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
              await pool.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                [k, v]
              );
            }

            // Categorías
            for (let i = 0; i < CATEGORIES.length; i++) {
              await pool.query(
                'INSERT INTO categories (name, sort_order) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [CATEGORIES[i], i]
              );
            }

            // Productos demo
            const prodRes = await pool.query('SELECT COUNT(*) AS c FROM products');
            if (Number(prodRes.rows[0]?.c ?? 0) === 0) {
              const catMapRes = await pool.query('SELECT id, name FROM categories');
              const catMap = new Map<string, number>(
                catMapRes.rows.map((r: any) => [r.name.toLowerCase(), Number(r.id)])
              );

              for (const p of PRODUCTS) {
                const cId = catMap.get(String(p[2]).toLowerCase()) ?? null;
                await pool.query(
                  `INSERT INTO products (name, description, category_id, price, promo_price, stock, unit, sku, featured, available, image_url)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                  [p[0], p[1], cId, p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10]]
                );
              }
            }
            console.log('✔ Inicialización completada con éxito.');
          }
        } else {
          const db = getSqliteDb();
          db.exec(SCHEMA_SQL);
        }
        globalThis.__schemaInitialized = true;
      } catch (err) {
        console.error('Error durante ensureInitialized:', err);
        throw err;
      }
    })();
  }
  await _initPromise;
}

/** Convierte placeholders de SQLite (?) a PostgreSQL ($1, $2, ...) respetando strings */
export function toPgSql(sql: string): string {
  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (char === "'" && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '"' && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      result += char;
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }

  // Normalizar funciones de fecha
  return result
    .replace(/\bdatetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bdate\('now'\)/gi, 'CURRENT_DATE');
}

/** Ejecuta `fn` dentro de una transacción */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  await ensureInitialized();

  if (isPostgres()) {
    const activeClient = txStorage.getStore();
    if (activeClient) {
      // Ya estamos dentro de una transacción activa
      return await fn();
    }

    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await txStorage.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const db = getSqliteDb();
    db.exec('BEGIN');
    try {
      const result = await fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

export function lastId(res: { lastInsertRowid: number | bigint }): number {
  return Number(res?.lastInsertRowid ?? 0);
}

export function changes(res: { changes: number | bigint }): number {
  return Number(res?.changes ?? 0);
}

/** Convierte filas a objetos planos */
function plain<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

/** Consultas que devuelven múltiples filas */
export async function qAll<T = DbRow>(
  sql: string,
  ...params: (string | number | boolean | null | undefined)[]
): Promise<T[]> {
  await ensureInitialized();

  if (isPostgres()) {
    const runner = txStorage.getStore() || getPgPool();
    const pgSql = toPgSql(sql);
    const cleanParams = params.map((p) => (p === undefined ? null : p));
    const res = await runner.query(pgSql, cleanParams);
    return res.rows.map((r: any) => plain(r));
  } else {
    const db = getSqliteDb();
    const rows = db.prepare(sql).all(...params) as unknown as T[];
    return rows.map((r: any) => plain(r));
  }
}

/** Consultas que devuelven una sola fila o undefined */
export async function qGet<T = DbRow>(
  sql: string,
  ...params: (string | number | boolean | null | undefined)[]
): Promise<T | undefined> {
  await ensureInitialized();

  if (isPostgres()) {
    const runner = txStorage.getStore() || getPgPool();
    const pgSql = toPgSql(sql);
    const cleanParams = params.map((p) => (p === undefined ? null : p));
    const res = await runner.query(pgSql, cleanParams);
    const row = res.rows[0];
    return row ? plain(row) : undefined;
  } else {
    const db = getSqliteDb();
    const row = db.prepare(sql).get(...params) as unknown as T | undefined;
    return plain(row);
  }
}

/** Ejecuta INSERT/UPDATE/DELETE devolviendo changes y lastInsertRowid */
export async function qRun(
  sql: string,
  ...params: (string | number | boolean | null | undefined)[]
): Promise<{ changes: number; lastInsertRowid: number }> {
  await ensureInitialized();

  if (isPostgres()) {
    const runner = txStorage.getStore() || getPgPool();
    let pgSql = toPgSql(sql).trim();

    // Si es un INSERT y la tabla tiene ID autoincremental, agregar RETURNING id si no lo tiene
    const isInsert = /^insert\s+into\s+/i.test(pgSql);
    const isSettings = /into\s+settings\b/i.test(pgSql);
    const hasReturning = /\breturning\b/i.test(pgSql);

    if (isInsert && !isSettings && !hasReturning) {
      pgSql += ' RETURNING id';
    }

    const cleanParams = params.map((p) => (p === undefined ? null : p));
    const res = await runner.query(pgSql, cleanParams);

    const lastInsertRowid = res.rows[0]?.id ? Number(res.rows[0].id) : 0;
    const count = res.rowCount ?? 0;
    return { changes: count, lastInsertRowid };
  } else {
    const db = getSqliteDb();
    const r = db.prepare(sql).run(...params);
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  }
}
