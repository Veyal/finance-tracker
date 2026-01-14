import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'finance.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Auto-migration for existing tables
try {
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('income_source_id')) {
        console.log('Migrating: Adding income_source_id to transactions table...');
        db.prepare("ALTER TABLE transactions ADD COLUMN income_source_id TEXT REFERENCES income_sources(id)").run();
    }

    if (!columns.includes('sort_order')) {
        console.log('Migrating: Adding sort_order to transactions table...');
        db.prepare("ALTER TABLE transactions ADD COLUMN sort_order INTEGER DEFAULT 0").run();
    }

    if (!columns.includes('lending_source_id')) {
        console.log('Migrating: Adding lending_source_id to transactions table...');
        db.prepare("ALTER TABLE transactions ADD COLUMN lending_source_id TEXT REFERENCES lending_sources(id)").run();
    }

    if (!columns.includes('related_transaction_id')) {
        console.log('Migrating: Adding related_transaction_id to transactions table...');
        db.prepare("ALTER TABLE transactions ADD COLUMN related_transaction_id TEXT REFERENCES transactions(id)").run();
    }
} catch (error) {
    console.error('Migration error:', error);
}

export default db;
