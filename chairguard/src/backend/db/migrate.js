import { initDatabase, closeDb } from './database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Running database migrations...');

try {
  const schemaPath = join(__dirname, 'schema.sql');
  initDatabase(schemaPath);
  console.log('✅ Migration complete');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  closeDb();
}
