import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all lending sources with total repaid
router.get('/', authMiddleware, (req, res) => {
    try {
        const sources = db.prepare(`
            SELECT ls.*,
                   COALESCE((
                     SELECT SUM(t.amount) FROM transactions t 
                     WHERE t.lending_source_id = ls.id AND t.type = 'repayment' AND t.deleted_at IS NULL
                   ), 0) as total_repaid,
                   (
                     SELECT COUNT(*) FROM transactions t 
                     WHERE t.lending_source_id = ls.id AND t.type = 'repayment' AND t.deleted_at IS NULL
                   ) as repayment_count
            FROM lending_sources ls
            WHERE ls.user_id = ? AND ls.is_active = 1 
            ORDER BY ls.name ASC
        `).all(req.user.id);

        res.json(sources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get repayments by person
router.get('/:id/repayments', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        // First verify the source belongs to user
        const source = db.prepare(`
            SELECT * FROM lending_sources WHERE id = ? AND user_id = ?
        `).get(id, req.user.id);

        if (!source) {
            return res.status(404).json({ error: 'Source not found' });
        }

        // Get all repayments from this person
        const repayments = db.prepare(`
            SELECT r.*,
                   pm.name as payment_method_name,
                   orig.merchant as original_merchant,
                   orig.amount as original_amount,
                   orig.date as original_date
            FROM transactions r
            LEFT JOIN payment_methods pm ON r.payment_method_id = pm.id
            LEFT JOIN transactions orig ON r.related_transaction_id = orig.id
            WHERE r.lending_source_id = ? AND r.type = 'repayment' AND r.deleted_at IS NULL
            ORDER BY r.date DESC
        `).all(id);

        res.json({
            source,
            repayments,
            total: repayments.reduce((sum, r) => sum + r.amount, 0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create lending source
router.post('/', authMiddleware, (req, res) => {
    try {
        const { name, color } = req.body;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO lending_sources (id, user_id, name, color)
            VALUES (?, ?, ?, ?)
        `).run(id, req.user.id, name, color || null);

        const newSource = db.prepare('SELECT * FROM lending_sources WHERE id = ?').get(id);
        res.status(201).json(newSource);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lending source
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { name, color } = req.body;
        const { id } = req.params;

        const info = db.prepare(`
            UPDATE lending_sources 
            SET name = ?, color = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
        `).run(name, color || null, id, req.user.id);

        if (info.changes === 0) return res.status(404).json({ error: 'Source not found' });

        const updated = db.prepare('SELECT * FROM lending_sources WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete (archive) lending source
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        const info = db.prepare(`
            UPDATE lending_sources 
            SET is_active = 0, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
        `).run(id, req.user.id);

        if (info.changes === 0) return res.status(404).json({ error: 'Source not found' });

        res.json({ message: 'Source deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
