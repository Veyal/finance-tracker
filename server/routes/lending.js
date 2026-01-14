import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all lending sources
router.get('/', authMiddleware, (req, res) => {
    try {
        const sources = db.prepare(`
            SELECT * FROM lending_sources 
            WHERE user_id = ? AND is_active = 1 
            ORDER BY name ASC
        `).all(req.user.id);

        // Calculate balance for each source
        // This is a naive implementation, better done with a JOIN or separate query if needed
        // For now, let's keep it simple and just return the sources
        res.json(sources);
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
