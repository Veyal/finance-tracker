import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /savings - List savings accounts with balances
router.get('/', (req, res) => {
    try {
        const userId = req.user.id;

        const accounts = db.prepare(`
            SELECT 
                sa.*,
                COALESCE((
                    SELECT SUM(CASE 
                        WHEN t.type = 'savings_deposit' THEN t.amount 
                        WHEN t.type = 'savings_withdrawal' THEN -t.amount 
                        ELSE 0 
                    END)
                    FROM transactions t 
                    WHERE t.savings_account_id = sa.id AND t.deleted_at IS NULL
                ), 0) as balance,
                (SELECT COUNT(*) FROM transactions t WHERE t.savings_account_id = sa.id AND t.deleted_at IS NULL) as transaction_count
            FROM savings_accounts sa
            WHERE sa.user_id = ? AND sa.is_active = 1
            ORDER BY sa.created_at DESC
        `).all(userId);

        // Calculate total savings
        const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

        res.json({ accounts, totalBalance });
    } catch (error) {
        console.error('Get savings accounts error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /savings - Create new savings account
router.post('/', (req, res) => {
    try {
        const userId = req.user.id;
        const { name, target_amount, color } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'name_required' });
        }

        const id = uuidv4();

        db.prepare(`
            INSERT INTO savings_accounts (id, user_id, name, target_amount, color)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, userId, name.trim(), target_amount || null, color || null);

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(id);

        res.status(201).json(account);
    } catch (error) {
        console.error('Create savings account error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// PATCH /savings/:id - Update savings account
router.patch('/:id', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM savings_accounts WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        const updates = [];
        const params = [];

        const fields = ['name', 'target_amount', 'color', 'is_active'];
        for (const field of fields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'no_updates' });
        }

        updates.push(`updated_at = datetime('now')`);
        params.push(id, userId);

        db.prepare(`UPDATE savings_accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(id);
        res.json(account);
    } catch (error) {
        console.error('Update savings account error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// DELETE /savings/:id - Soft delete savings account
router.delete('/:id', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM savings_accounts WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        // Soft delete by setting is_active to 0
        db.prepare(`UPDATE savings_accounts SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);

        res.json({ message: 'deleted' });
    } catch (error) {
        console.error('Delete savings account error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// GET /savings/:id/transactions - Get transactions for a savings account
router.get('/:id/transactions', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ? AND user_id = ?').get(id, userId);
        if (!account) {
            return res.status(404).json({ error: 'not_found' });
        }

        const transactions = db.prepare(`
            SELECT t.*, pm.name as payment_method_name
            FROM transactions t
            LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE t.savings_account_id = ? AND t.user_id = ? AND t.deleted_at IS NULL
            ORDER BY t.date DESC, t.created_at DESC
        `).all(id, userId);

        res.json({ account, transactions });
    } catch (error) {
        console.error('Get savings transactions error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /savings/:id/deposit - Add money to savings
router.post('/:id/deposit', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { amount, date, payment_method_id, note } = req.body;

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ? AND user_id = ?').get(id, userId);
        if (!account) {
            return res.status(404).json({ error: 'not_found' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'invalid_amount' });
        }

        const txId = uuidv4();
        const txDate = date || new Date().toISOString();

        db.prepare(`
            INSERT INTO transactions (id, user_id, type, amount, date, savings_account_id, payment_method_id, note)
            VALUES (?, ?, 'savings_deposit', ?, ?, ?, ?, ?)
        `).run(txId, userId, amount, txDate, id, payment_method_id || null, note || null);

        const transaction = db.prepare(`
            SELECT t.*, pm.name as payment_method_name
            FROM transactions t
            LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE t.id = ?
        `).get(txId);

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Deposit to savings error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /savings/:id/withdraw - Withdraw from savings
router.post('/:id/withdraw', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { amount, date, payment_method_id, note } = req.body;

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ? AND user_id = ?').get(id, userId);
        if (!account) {
            return res.status(404).json({ error: 'not_found' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'invalid_amount' });
        }

        const txId = uuidv4();
        const txDate = date || new Date().toISOString();

        db.prepare(`
            INSERT INTO transactions (id, user_id, type, amount, date, savings_account_id, payment_method_id, note)
            VALUES (?, ?, 'savings_withdrawal', ?, ?, ?, ?, ?)
        `).run(txId, userId, amount, txDate, id, payment_method_id || null, note || null);

        const transaction = db.prepare(`
            SELECT t.*, pm.name as payment_method_name
            FROM transactions t
            LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE t.id = ?
        `).get(txId);

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Withdraw from savings error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// PATCH /savings/transactions/:txId - Update a savings transaction
router.patch('/transactions/:txId', (req, res) => {
    try {
        const userId = req.user.id;
        const { txId } = req.params;

        const existing = db.prepare(`
            SELECT * FROM transactions 
            WHERE id = ? AND user_id = ? AND type IN ('savings_deposit', 'savings_withdrawal') AND deleted_at IS NULL
        `).get(txId, userId);

        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        const updates = [];
        const params = [];

        const fields = ['amount', 'date', 'payment_method_id', 'note'];
        for (const field of fields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'no_updates' });
        }

        updates.push(`updated_at = datetime('now')`);
        params.push(txId, userId);

        db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

        const transaction = db.prepare(`
            SELECT t.*, pm.name as payment_method_name
            FROM transactions t
            LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE t.id = ?
        `).get(txId);

        res.json(transaction);
    } catch (error) {
        console.error('Update savings transaction error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// DELETE /savings/transactions/:txId - Delete a savings transaction
router.delete('/transactions/:txId', (req, res) => {
    try {
        const userId = req.user.id;
        const { txId } = req.params;

        const existing = db.prepare(`
            SELECT * FROM transactions 
            WHERE id = ? AND user_id = ? AND type IN ('savings_deposit', 'savings_withdrawal') AND deleted_at IS NULL
        `).get(txId, userId);

        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        // Soft delete
        db.prepare(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`).run(txId);

        res.json({ message: 'deleted' });
    } catch (error) {
        console.error('Delete savings transaction error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
