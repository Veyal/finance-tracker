import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /income-sources
router.get('/', (req, res) => {
    try {
        const userId = req.user.id;
        const { active } = req.query;

        let sql = 'SELECT * FROM income_sources WHERE user_id = ?';
        const params = [userId];

        if (active === 'true') {
            sql += ' AND is_active = 1';
        } else if (active === 'false') {
            sql += ' AND is_active = 0';
        }

        sql += ' ORDER BY name';

        const sources = db.prepare(sql).all(...params);
        res.json(sources);
    } catch (error) {
        console.error('Get income sources error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /income-sources
router.post('/', (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'name_required' });
        }

        const id = uuidv4();

        db.prepare(`
      INSERT INTO income_sources (id, user_id, name)
      VALUES (?, ?, ?)
    `).run(id, userId, name.trim());

        const source = db.prepare('SELECT * FROM income_sources WHERE id = ?').get(id);
        res.status(201).json(source);
    } catch (error) {
        console.error('Create income source error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// PATCH /income-sources/:id
router.patch('/:id', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM income_sources WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        const { name, is_active } = req.body;
        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'no_updates' });
        }

        updates.push(`updated_at = datetime('now')`);
        params.push(id);

        db.prepare(`UPDATE income_sources SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const source = db.prepare('SELECT * FROM income_sources WHERE id = ?').get(id);
        res.json(source);
    } catch (error) {
        console.error('Update income source error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// DELETE /income-sources/:id - archives instead of hard delete
router.delete('/:id', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM income_sources WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        db.prepare(`UPDATE income_sources SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);

        res.json({ message: 'archived' });
    } catch (error) {
        console.error('Delete income source error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
