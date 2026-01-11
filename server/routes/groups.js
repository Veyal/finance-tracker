import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /groups
router.get('/', (req, res) => {
    try {
        const userId = req.user.id;
        const { active } = req.query;

        let sql = 'SELECT * FROM groups WHERE user_id = ?';
        const params = [userId];

        if (active === 'true') {
            sql += ' AND is_active = 1';
        } else if (active === 'false') {
            sql += ' AND is_active = 0';
        }

        sql += ' ORDER BY name';

        const groups = db.prepare(sql).all(...params);
        res.json(groups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /groups
router.post('/', (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'name_required' });
        }

        const id = uuidv4();

        db.prepare(`
      INSERT INTO groups (id, user_id, name)
      VALUES (?, ?, ?)
    `).run(id, userId, name.trim());

        const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
        res.status(201).json(group);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// PATCH /groups/:id
router.patch('/:id', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM groups WHERE id = ? AND user_id = ?').get(id, userId);
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

        db.prepare(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
        res.json(group);
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// DELETE /groups/:id - archives instead of hard delete
router.delete('/:id', (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM groups WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'not_found' });
        }

        db.prepare(`UPDATE groups SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);

        res.json({ message: 'archived' });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
