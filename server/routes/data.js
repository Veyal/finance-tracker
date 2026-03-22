import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Scoped to current user export
router.get('/export', (req, res) => {
    try {
        const userId = req.user.id;

        const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId);
        const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
        const groups = db.prepare('SELECT * FROM groups WHERE user_id = ?').all(userId);
        const paymentMethods = db.prepare('SELECT * FROM payment_methods WHERE user_id = ?').all(userId);
        const incomeSources = db.prepare('SELECT * FROM income_sources WHERE user_id = ?').all(userId);
        const lendingSources = db.prepare('SELECT * FROM lending_sources WHERE user_id = ?').all(userId);
        const savingsAccounts = db.prepare('SELECT * FROM savings_accounts WHERE user_id = ?').all(userId);

        const data = {
            transactions,
            categories,
            groups,
            payment_methods: paymentMethods,
            income_sources: incomeSources,
            lending_sources: lendingSources,
            savings_accounts: savingsAccounts,
            exported_at: new Date().toISOString()
        };

        res.json(data);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Transaction function for import
const importData = db.transaction((data, userId) => {
    // Disable foreign keys to allow deleting/inserting in any order
    db.pragma('foreign_keys = OFF');

    // Delete ONLY existing data for this user
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM groups WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM payment_methods WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM income_sources WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM lending_sources WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM savings_accounts WHERE user_id = ?').run(userId);

    // Helper to sanitize objects before insertion
    const sanitize = (obj, fields) => {
        const result = {};
        for (const field of fields) {
            result[field] = obj[field] !== undefined ? obj[field] : null;
        }
        return result;
    };

    // Insert categories
    const insertCategory = db.prepare('INSERT INTO categories (id, user_id, name, type, is_active, created_at, updated_at) VALUES (@id, @user_id, @name, @type, @is_active, @created_at, @updated_at)');
    for (const cat of data.categories || []) {
        const row = sanitize(cat, ['id', 'name', 'type', 'is_active', 'created_at', 'updated_at']);
        row.user_id = userId;
        row.is_active = row.is_active ?? 1;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertCategory.run(row);
    }

    // Insert groups
    const insertGroup = db.prepare('INSERT INTO groups (id, user_id, name, is_active, created_at, updated_at) VALUES (@id, @user_id, @name, @is_active, @created_at, @updated_at)');
    for (const grp of data.groups || []) {
        const row = sanitize(grp, ['id', 'name', 'is_active', 'created_at', 'updated_at']);
        row.user_id = userId;
        row.is_active = row.is_active ?? 1;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertGroup.run(row);
    }

    // Insert payment methods
    const insertPaymentMethod = db.prepare('INSERT INTO payment_methods (id, user_id, name, type, is_active, created_at, updated_at) VALUES (@id, @user_id, @name, @type, @is_active, @created_at, @updated_at)');
    for (const pm of data.payment_methods || []) {
        const row = sanitize(pm, ['id', 'name', 'type', 'is_active', 'created_at', 'updated_at']);
        row.user_id = userId;
        row.is_active = row.is_active ?? 1;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertPaymentMethod.run(row);
    }

    // Insert income sources
    const insertIncomeSource = db.prepare('INSERT INTO income_sources (id, user_id, name, is_active, created_at, updated_at) VALUES (@id, @user_id, @name, @is_active, @created_at, @updated_at)');
    for (const is of data.income_sources || []) {
        const row = sanitize(is, ['id', 'name', 'is_active', 'created_at', 'updated_at']);
        row.user_id = userId;
        row.is_active = row.is_active ?? 1;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertIncomeSource.run(row);
    }

    // Insert lending sources
    const insertLendingSource = db.prepare('INSERT INTO lending_sources (id, user_id, name, color, is_active, created_at, updated_at) VALUES (@id, @user_id, @name, @color, @is_active, @created_at, @updated_at)');
    for (const ls of data.lending_sources || []) {
        const row = sanitize(ls, ['id', 'name', 'color', 'is_active', 'created_at', 'updated_at']);
        row.user_id = userId;
        row.is_active = row.is_active ?? 1;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertLendingSource.run(row);
    }

    // Insert savings accounts
    const insertSavingsAccount = db.prepare('INSERT INTO savings_accounts (id, user_id, name, target_amount, color, is_active, created_at, updated_at) VALUES (@id, @user_id, @name, @target_amount, @color, @is_active, @created_at, @updated_at)');
    for (const sa of data.savings_accounts || []) {
        const row = sanitize(sa, ['id', 'name', 'target_amount', 'color', 'is_active', 'created_at', 'updated_at']);
        row.user_id = userId;
        row.is_active = row.is_active ?? 1;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertSavingsAccount.run(row);
    }

    // Insert transactions
    const insertTransaction = db.prepare(`
         INSERT INTO transactions (
             id, user_id, type, amount, currency, date, 
             category_id, group_id, payment_method_id, income_source_id, lending_source_id,
             savings_account_id, related_transaction_id, note, merchant, created_at, updated_at, deleted_at, sort_order
         ) VALUES (
             @id, @user_id, @type, @amount, @currency, @date,
             @category_id, @group_id, @payment_method_id, @income_source_id, @lending_source_id,
             @savings_account_id, @related_transaction_id, @note, @merchant, @created_at, @updated_at, @deleted_at, @sort_order
         )
     `);
    for (const tx of data.transactions || []) {
        const row = sanitize(tx, [
            'id', 'type', 'amount', 'currency', 'date', 
            'category_id', 'group_id', 'payment_method_id', 'income_source_id', 'lending_source_id',
            'savings_account_id', 'related_transaction_id', 'note', 'merchant', 'created_at', 'updated_at', 'deleted_at', 'sort_order'
        ]);
        row.user_id = userId;
        row.currency = row.currency || 'IDR';
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        insertTransaction.run(row);
    }

    db.pragma('foreign_keys = ON');
});

router.post('/import', (req, res) => {
    try {
        const data = req.body;
        if (!data.transactions || !data.categories) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const userId = req.user.id;
        importData(data, userId);

        res.json({ success: true, message: 'Data imported successfully' });
    } catch (error) {
        console.error('Import error:', error);
        db.pragma('foreign_keys = ON'); // Safety net
        res.status(500).json({ error: 'Failed to import data: ' + error.message });
    }
});

export default router;
