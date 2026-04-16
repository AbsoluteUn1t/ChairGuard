import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = join(__dirname, '../../../data');
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_URL || join(dataDir, 'chairguard.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Prepare statements for reuse
const statements = {};

/**
 * Initialize database with schema
 */
export function initDatabase(schemaPath = join(__dirname, 'schema.sql')) {
  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolon to get individual statements, filter empty
  const queries = schema
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0);
  
  const transaction = db.transaction(() => {
    for (const query of queries) {
      db.exec(query);
    }
  });
  
  transaction();
  console.log('✅ Database initialized');
}

/**
 * Get database instance
 */
export function getDb() {
  return db;
}

/**
 * Run a query with params
 */
export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(params);
}

/**
 * Run an insert/update and return the changes
 */
export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.run(params);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid
  };
}

/**
 * Get a single row
 */
export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(params);
}

/**
 * Insert and return the inserted row
 */
export function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = run(sql, values);
  
  return { ...data, changes: result.changes };
}

/**
 * Update by id
 */
export function update(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  
  const sql = `UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`;
  return run(sql, [...values, id]);
}

/**
 * Close database connection
 */
export function closeDb() {
  db.close();
}

export default db;
