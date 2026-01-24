import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Scoped to current user export
router.get('/export', (req, res) => {
    try {
        const userId = req.user.id;

        // Only export data belonging to the current user
        // We do NOT export the user record itself to prevent self-overwrite issues on import

        const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId);
        const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
        const groups = db.prepare('SELECT * FROM groups WHERE user_id = ?').all(userId);
        const paymentMethods = db.prepare('SELECT * FROM payment_methods WHERE user_id = ?').all(userId);
        const incomeSources = db.prepare('SELECT * FROM income_sources WHERE user_id = ?').all(userId);
        const lendingSources = db.prepare('SELECT * FROM lending_sources WHERE user_id = ?').all(userId);

        const data = {
            transactions,
            categories,
            groups,
            payment_methods: paymentMethods,
            income_sources: incomeSources,
            lending_sources: lendingSources,
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

    // We do NOT delete the user record

    // Insert new data - FORCING user_id to match the authenticated user

    const insertCategory = db.prepare('INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at) VALUES (@id, @user_id, @name, @type, @icon, @color, @is_default, @created_at)');
    for (const cat of data.categories) {
        cat.user_id = userId; // Force user_id
        insertCategory.run(cat);
    }

    const insertGroup = db.prepare('INSERT INTO groups (id, user_id, name, description, created_at) VALUES (@id, @user_id, @name, @description, @created_at)');
    for (const grp of data.groups) {
        grp.user_id = userId; // Force user_id
        insertGroup.run(grp);
    }

    const insertPaymentMethod = db.prepare('INSERT INTO payment_methods (id, user_id, name, type, details, is_default, created_at) VALUES (@id, @user_id, @name, @type, @details, @is_default, @created_at)');
    for (const pm of data.payment_methods) {
        pm.user_id = userId; // Force user_id
        insertPaymentMethod.run(pm);
    }

    const insertIncomeSource = db.prepare('INSERT INTO income_sources (id, user_id, name, description, created_at) VALUES (@id, @user_id, @name, @description, @created_at)');
    for (const is of data.income_sources) {
        is.user_id = userId; // Force user_id
        insertIncomeSource.run(is);
    }

    const insertLendingSource = db.prepare('INSERT INTO lending_sources (id, user_id, name, type, created_at) VALUES (@id, @user_id, @name, @type, @created_at)');
    for (const ls of data.lending_sources || []) {
        ls.user_id = userId; // Force user_id
        insertLendingSource.run(ls);
    }

    const insertTransaction = db.prepare(`
         INSERT INTO transactions (
             id, user_id, type, amount, currency, date, 
             category_id, group_id, payment_method_id, income_source_id, lending_source_id,
             related_transaction_id, note, merchant, created_at, updated_at, deleted_at, sort_order
         ) VALUES (
             @id, @user_id, @type, @amount, @currency, @date,
             @category_id, @group_id, @payment_method_id, @income_source_id, @lending_source_id,
             @related_transaction_id, @note, @merchant, @created_at, @updated_at, @deleted_at, @sort_order
         )
     `);
    for (const tx of data.transactions) {
        tx.user_id = userId; // Force user_id
        insertTransaction.run(tx);
    }

    db.pragma('foreign_keys = ON');
});

router.post('/import', (req, res) => {
    try {
        const data = req.body;
        // Basic validation - check for required arrays
        // Note: data.users is NO LONGER required or expected to be imported
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
