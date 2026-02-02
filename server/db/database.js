import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, 'finance.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // Temporarily disable for migration

// Initialize schema (creates tables if not exist)
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Auto-migration for existing tables
try {
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    const columns = tableInfo.map(c => c.name);

    // Check if we need to migrate the CHECK constraint (SQLite can't ALTER constraints)
    // We detect this by trying to insert a 'repayment' type - if it fails, we need to migrate
    const needsTypeMigration = (() => {
        try {
            // Check current constraint by looking at table SQL
            const tableSQL = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get();
            return tableSQL && !tableSQL.sql.includes("'repayment'");
        } catch {
            return false;
        }
    })();

    if (needsTypeMigration) {
        console.log('Migrating: Updating transactions table to support repayment type...');

        // Get existing columns from old table
        const oldColumns = columns;

        // All possible columns in new table
        const newTableColumns = [
            'id', 'user_id', 'type', 'amount', 'currency', 'date', 'category_id', 'group_id',
            'payment_method_id', 'income_source_id', 'lending_source_id', 'related_transaction_id',
            'note', 'merchant', 'created_at', 'updated_at', 'deleted_at', 'sort_order'
        ];

        // Only copy columns that exist in both old and new tables
        const columnsToMigrate = newTableColumns.filter(col => oldColumns.includes(col));
        const columnList = columnsToMigrate.join(', ');

        // Create new table with updated constraint
        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions_new (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                type TEXT DEFAULT 'expense' CHECK(type IN ('expense', 'income', 'repayment')),
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'IDR',
                date TEXT DEFAULT (datetime('now')),
                category_id TEXT REFERENCES categories(id),
                group_id TEXT REFERENCES groups(id),
                payment_method_id TEXT REFERENCES payment_methods(id),
                income_source_id TEXT REFERENCES income_sources(id),
                lending_source_id TEXT REFERENCES lending_sources(id),
                related_transaction_id TEXT,
                note TEXT,
                merchant TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                deleted_at TEXT,
                sort_order INTEGER DEFAULT 0
            )
        `);

        // Copy data from old table (only columns that exist)
        db.exec(`INSERT INTO transactions_new (${columnList}) SELECT ${columnList} FROM transactions`);

        // Drop old table
        db.exec('DROP TABLE transactions');

        // Rename new table
        db.exec('ALTER TABLE transactions_new RENAME TO transactions');

        // Recreate indexes
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');

        console.log('Migration complete: transactions table now supports repayment type');
    }

    // Existing column migrations (for fresh installs or partial migrations)
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

    // Migrate existing repayment income transactions to proper 'repayment' type
    const repaymentCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE type = 'income' AND related_transaction_id IS NOT NULL").get();
    if (repaymentCount.count > 0) {
        console.log(`Migrating: Converting ${repaymentCount.count} income repayments to repayment type...`);
        db.prepare("UPDATE transactions SET type = 'repayment' WHERE type = 'income' AND related_transaction_id IS NOT NULL").run();
    }

    // Add savings_account_id column if not exists
    if (!columns.includes('savings_account_id')) {
        console.log('Migrating: Adding savings_account_id to transactions table...');
        db.prepare("ALTER TABLE transactions ADD COLUMN savings_account_id TEXT REFERENCES savings_accounts(id)").run();
    }

    // Check if we need to migrate the CHECK constraint for savings types
    const needsSavingsTypeMigration = (() => {
        try {
            const tableSQL = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get();
            return tableSQL && !tableSQL.sql.includes("'savings_deposit'");
        } catch {
            return false;
        }
    })();

    if (needsSavingsTypeMigration) {
        console.log('Migrating: Updating transactions table to support savings types...');

        const currentColumns = db.prepare("PRAGMA table_info(transactions)").all().map(c => c.name);

        const newTableColumns = [
            'id', 'user_id', 'type', 'amount', 'currency', 'date', 'category_id', 'group_id',
            'payment_method_id', 'income_source_id', 'lending_source_id', 'savings_account_id',
            'related_transaction_id', 'note', 'merchant', 'created_at', 'updated_at', 'deleted_at', 'sort_order'
        ];

        const columnsToMigrate = newTableColumns.filter(col => currentColumns.includes(col));
        const columnList = columnsToMigrate.join(', ');

        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions_new (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                type TEXT DEFAULT 'expense' CHECK(type IN ('expense', 'income', 'repayment', 'savings_deposit', 'savings_withdrawal')),
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'IDR',
                date TEXT DEFAULT (datetime('now')),
                category_id TEXT REFERENCES categories(id),
                group_id TEXT REFERENCES groups(id),
                payment_method_id TEXT REFERENCES payment_methods(id),
                income_source_id TEXT REFERENCES income_sources(id),
                lending_source_id TEXT REFERENCES lending_sources(id),
                savings_account_id TEXT REFERENCES savings_accounts(id),
                related_transaction_id TEXT,
                note TEXT,
                merchant TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                deleted_at TEXT,
                sort_order INTEGER DEFAULT 0
            )
        `);

        db.exec(`INSERT INTO transactions_new (${columnList}) SELECT ${columnList} FROM transactions`);
        db.exec('DROP TABLE transactions');
        db.exec('ALTER TABLE transactions_new RENAME TO transactions');
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');

        console.log('Migration complete: transactions table now supports savings types');
    }
} catch (error) {
    console.error('Migration error:', error);
}

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

export default db;
