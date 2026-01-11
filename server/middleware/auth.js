import db from '../db/database.js';

export function authMiddleware(req, res, next) {
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
        return res.status(401).json({ error: 'unauthorized' });
    }

    const session = db.prepare(`
    SELECT s.*, u.id as user_id, u.username, u.is_active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId);

    if (!session || !session.is_active) {
        res.clearCookie('session_id');
        return res.status(401).json({ error: 'unauthorized' });
    }

    // Update last seen
    db.prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`).run(sessionId);

    req.user = {
        id: session.user_id,
        username: session.username
    };

    next();
}
