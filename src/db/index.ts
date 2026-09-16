// ============================================================
// Conexión a la base de datos.
// Desarrollo: SQLite (módulo nativo `node:sqlite` de Node 22+).
// Producción: ver README — misma estructura portable a
// PostgreSQL / Supabase cambiando la capa de acceso.
// ============================================================
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema.mjs';

export type DbRow = Record<string, unknown>;

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  _db = db;
  return db;
}

/** Ejecuta `fn` dentro de una transacción (BEGIN/COMMIT con ROLLBACK ante error). */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function lastId(res: { lastInsertRowid: number | bigint }): number {
  return Number(res.lastInsertRowid);
}

export function changes(res: { changes: number | bigint }): number {
  return Number(res.changes);
}

/** Convierte filas de node:sqlite (prototipo nulo) en objetos planos */
function plain<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

/** Helpers de consulta tipados en forma liviana */
export function qAll<T = DbRow>(sql: string, ...params: (string | number | null)[]): T[] {
  const rows = getDb().prepare(sql).all(...params) as unknown as T[];
  return rows.map((r) => plain(r));
}

export function qGet<T = DbRow>(sql: string, ...params: (string | number | null)[]): T | undefined {
  const row = getDb().prepare(sql).get(...params) as unknown as T | undefined;
  return plain(row);
}

export function qRun(sql: string, ...params: (string | number | null)[]): { changes: number; lastInsertRowid: number } {
  const r = getDb().prepare(sql).run(...params);
  return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
}
