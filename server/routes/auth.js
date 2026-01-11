import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();
const SALT_ROUNDS = 12;
const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 3;
const WINDOW_MINUTES = 10;

// Helper: normalize username
function normalizeUsername(username) {
    return username.toLowerCase().trim();
}

// Helper: check rate limit
function checkRateLimit(usernameNorm) {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const attempt = db.prepare(`
    SELECT * FROM auth_attempts 
    WHERE username_norm = ? AND first_fail_at > ?
  `).get(usernameNorm, windowStart);

    if (attempt && attempt.fail_count >= MAX_ATTEMPTS) {
        const firstFailAt = new Date(attempt.first_fail_at);
        const retryAfter = Math.ceil((firstFailAt.getTime() + WINDOW_MINUTES * 60 * 1000 - Date.now()) / 1000);
        return { blocked: true, retryAfter };
    }

    return { blocked: false, attempt };
}

// Helper: record failed attempt
function recordFailedAttempt(usernameNorm, existingAttempt) {
    const now = new Date().toISOString();

    if (existingAttempt) {
        db.prepare(`
      UPDATE auth_attempts 
      SET fail_count = fail_count + 1, last_fail_at = ?
      WHERE id = ?
    `).run(now, existingAttempt.id);
    } else {
        db.prepare(`
      INSERT INTO auth_attempts (username_norm, first_fail_at, last_fail_at, fail_count)
      VALUES (?, ?, ?, 1)
    `).run(usernameNorm, now, now);
    }
}

// Helper: clear failed attempts
function clearFailedAttempts(usernameNorm) {
    db.prepare(`DELETE FROM auth_attempts WHERE username_norm = ?`).run(usernameNorm);
}

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, pin } = req.body;

        // Validate username
        if (!username || !/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
            return res.status(400).json({
                error: 'invalid_username',
                message: 'Username must be 3-32 characters (letters, numbers, . _ -)'
            });
        }

        // Validate PIN
        if (!pin || !/^\d{6}$/.test(pin)) {
            return res.status(400).json({
                error: 'invalid_pin',
                message: 'PIN must be exactly 6 digits'
            });
        }

        const usernameNorm = normalizeUsername(username);

        // Check if username exists
        const existing = db.prepare('SELECT id FROM users WHERE username_norm = ?').get(usernameNorm);
        if (existing) {
            return res.status(409).json({ error: 'username_taken' });
        }

        // Hash PIN and create user
        const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
        const userId = uuidv4();

        db.prepare(`
      INSERT INTO users (id, username, username_norm, pin_hash)
      VALUES (?, ?, ?, ?)
    `).run(userId, username, usernameNorm, pinHash);

        // Create default categories
        const defaultCategories = ['Food & Drinks', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Salary', 'Other'];
        for (const name of defaultCategories) {
            db.prepare(`INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)`).run(uuidv4(), userId, name);
        }

        // Create default groups
        const defaultGroups = ['Personal', 'Family'];
        for (const name of defaultGroups) {
            db.prepare(`INSERT INTO groups (id, user_id, name) VALUES (?, ?, ?)`).run(uuidv4(), userId, name);
        }

        // Create default payment methods
        const defaultPaymentMethods = [
            { name: 'Cash', type: 'cash' },
            { name: 'Debit Card', type: 'debit' },
            { name: 'Credit Card', type: 'credit_card' },
            { name: 'E-Wallet', type: 'ewallet' }
        ];
        for (const pm of defaultPaymentMethods) {
            db.prepare(`INSERT INTO payment_methods (id, user_id, name, type) VALUES (?, ?, ?, ?)`).run(uuidv4(), userId, pm.name, pm.type);
        }

        res.status(201).json({ message: 'registered' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, pin } = req.body;

        if (!username || !pin) {
            return res.status(400).json({ error: 'missing_credentials' });
        }

        const usernameNorm = normalizeUsername(username);

        // Check rate limit
        const rateLimit = checkRateLimit(usernameNorm);
        if (rateLimit.blocked) {
            return res.status(429).json({
                error: 'too_many_attempts',
                retry_after_seconds: rateLimit.retryAfter
            });
        }

        // Find user
        const user = db.prepare('SELECT * FROM users WHERE username_norm = ? AND is_active = 1').get(usernameNorm);

        if (!user) {
            recordFailedAttempt(usernameNorm, rateLimit.attempt);
            return res.status(401).json({ error: 'invalid_credentials' });
        }

        // Verify PIN
        const validPin = await bcrypt.compare(pin, user.pin_hash);

        if (!validPin) {
            recordFailedAttempt(usernameNorm, rateLimit.attempt);
            return res.status(401).json({ error: 'invalid_credentials' });
        }

        // Clear failed attempts on success
        clearFailedAttempts(usernameNorm);

        // Create session
        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

        db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, user_agent, ip_prefix)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, user.id, expiresAt, req.headers['user-agent'] || null, req.ip?.substring(0, 12) || null);

        // Set cookie
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
        });

        res.json({ message: 'logged_in', user: { id: user.id, username: user.username } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    const sessionId = req.cookies.session_id;

    if (sessionId) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }

    res.clearCookie('session_id');
    res.json({ message: 'logged_out' });
});

// POST /auth/change-pin
router.post('/change-pin', async (req, res) => {
    try {
        const sessionId = req.cookies.session_id;

        if (!sessionId) {
            return res.status(401).json({ error: 'not_authenticated' });
        }

        // Get user from session
        const session = db.prepare(`
            SELECT s.*, u.id as user_id, u.pin_hash 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ? AND s.expires_at > datetime('now')
        `).get(sessionId);

        if (!session) {
            return res.status(401).json({ error: 'session_expired' });
        }

        const { currentPin, newPin } = req.body;

        // Validate inputs
        if (!currentPin || !newPin) {
            return res.status(400).json({ error: 'missing_fields', message: 'Both current and new PIN are required' });
        }

        // Validate new PIN format
        if (!/^\d{6}$/.test(newPin)) {
            return res.status(400).json({ error: 'invalid_pin', message: 'New PIN must be exactly 6 digits' });
        }

        // Verify current PIN
        const validCurrentPin = await bcrypt.compare(currentPin, session.pin_hash);
        if (!validCurrentPin) {
            return res.status(401).json({ error: 'wrong_pin', message: 'Current PIN is incorrect' });
        }

        // Hash new PIN
        const newPinHash = await bcrypt.hash(newPin, SALT_ROUNDS);

        // Update PIN in database
        db.prepare("UPDATE users SET pin_hash = ?, updated_at = datetime('now') WHERE id = ?")
            .run(newPinHash, session.user_id);

        res.json({ message: 'pin_changed' });
    } catch (error) {
        console.error('Change PIN error:', error);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;

