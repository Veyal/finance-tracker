import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /transactions
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, type, group_id, category_id, payment_method_id, needs_review, q, limit = 50, cursor, include_repayments } = req.query;

    let sql = `
      SELECT t.*, 
             c.name as category_name,
             g.name as group_name,
             pm.name as payment_method_name,
             isrc.name as income_source_name,
             ls.name as lending_source_name,
             COALESCE((
               SELECT SUM(r.amount) FROM transactions r 
               WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
             ), 0) as repayment_total,
             (t.amount - COALESCE((
               SELECT SUM(r.amount) FROM transactions r 
               WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
             ), 0)) as net_amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN groups g ON t.group_id = g.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      LEFT JOIN income_sources isrc ON t.income_source_id = isrc.id
      LEFT JOIN lending_sources ls ON t.lending_source_id = ls.id
      WHERE t.user_id = ? AND t.deleted_at IS NULL
    `;
    const params = [userId];

    // Exclude repayment type by default unless explicitly requested
    if (include_repayments !== 'true') {
      sql += ` AND t.type != 'repayment'`;
    }

    if (from) {
      sql += ` AND date(t.date) >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND date(t.date) <= ?`;
      params.push(to);
    }
    if (type && type !== 'all') {
      sql += ` AND t.type = ?`;
      params.push(type);
    }
    if (group_id) {
      sql += ` AND t.group_id = ?`;
      params.push(group_id);
    }
    if (category_id) {
      sql += ` AND t.category_id = ?`;
      params.push(category_id);
    }
    if (payment_method_id) {
      sql += ` AND t.payment_method_id = ?`;
      params.push(payment_method_id);
    }
    if (needs_review === 'true') {
      sql += ` AND (t.category_id IS NULL OR t.group_id IS NULL OR t.payment_method_id IS NULL)`;
    }
    if (q) {
      sql += ` AND (t.note LIKE ? OR t.merchant LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    if (cursor) {
      sql += ` AND t.id < ?`;
      params.push(cursor);
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const transactions = db.prepare(sql).all(...params);

    // Get totals for the same filters (exclude repayment type from income)
    let totalsSql = `
      SELECT 
        COALESCE(SUM(CASE 
          WHEN t.type = 'expense' THEN 
            t.amount - COALESCE((
              SELECT SUM(r.amount) 
              FROM transactions r 
              WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
            ), 0)
          ELSE 0 
        END), 0) as expense_total,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income_total
      FROM transactions t
      WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type != 'repayment'
    `;
    const totalsParams = [userId];

    if (from) {
      totalsSql += ` AND date(date) >= ?`;
      totalsParams.push(from);
    }
    if (to) {
      totalsSql += ` AND date(date) <= ?`;
      totalsParams.push(to);
    }

    const totals = db.prepare(totalsSql).get(...totalsParams);

    res.json({
      transactions,
      totals: {
        expense: totals.expense_total,
        income: totals.income_total,
        net: totals.income_total - totals.expense_total
      },
      next_cursor: transactions.length === parseInt(limit) ? transactions[transactions.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /transactions/reorder
router.post('/reorder', (req, res) => {
  try {
    const userId = req.user.id;
    const { updates } = req.body; // Array of { id, sort_order, date (optional) }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'invalid_updates' });
    }

    const stmt = db.prepare(`
            UPDATE transactions 
            SET sort_order = ?, date = COALESCE(?, date), updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
        `);

    const updateTx = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.sort_order, item.date || null, item.id, userId);
      }
    });

    updateTx(updates);

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder transactions error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /transactions/:id/details - Get transaction with full repayments list
router.get('/:id/details', (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get the transaction with calculated totals
    const transaction = db.prepare(`
            SELECT t.*, 
                   c.name as category_name,
                   g.name as group_name,
                   pm.name as payment_method_name,
                   isrc.name as income_source_name,
                   ls.name as lending_source_name,
                   COALESCE((
                     SELECT SUM(r.amount) FROM transactions r 
                     WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
                   ), 0) as repayment_total,
                   (t.amount - COALESCE((
                     SELECT SUM(r.amount) FROM transactions r 
                     WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
                   ), 0)) as net_amount
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN groups g ON t.group_id = g.id
            LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
            LEFT JOIN income_sources isrc ON t.income_source_id = isrc.id
            LEFT JOIN lending_sources ls ON t.lending_source_id = ls.id
            WHERE t.id = ? AND t.user_id = ? AND t.deleted_at IS NULL
        `).get(id, userId);

    if (!transaction) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Get all repayments for this transaction
    const repayments = db.prepare(`
            SELECT r.*, 
                   ls.name as lending_source_name,
                   pm.name as payment_method_name
            FROM transactions r
            LEFT JOIN lending_sources ls ON r.lending_source_id = ls.id
            LEFT JOIN payment_methods pm ON r.payment_method_id = pm.id
            WHERE r.related_transaction_id = ? AND r.type = 'repayment' AND r.deleted_at IS NULL
            ORDER BY r.date DESC
        `).all(id);

    res.json({
      ...transaction,
      repayments
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /transactions
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'expense', amount, date, category_id, group_id, payment_method_id, income_source_id, lending_source_id, related_transaction_id, note, merchant } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount_required' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }

    const id = uuidv4();
    const txDate = date || new Date().toISOString();

    // Get max sort order for this date to append to end
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM transactions WHERE user_id = ? AND date(date) = date(?)').get(userId, txDate);
    const nextOrder = (maxOrder?.max_order || 0) + 1;

    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, date, category_id, group_id, payment_method_id, income_source_id, lending_source_id, related_transaction_id, note, merchant, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, amount, txDate, category_id || null, group_id || null, payment_method_id || null, income_source_id || null, lending_source_id || null, related_transaction_id || null, note || null, merchant || null, nextOrder);

    const transaction = db.prepare(`
      SELECT t.*, 
             c.name as category_name,
             g.name as group_name,
             pm.name as payment_method_name,
             isrc.name as income_source_name,
             ls.name as lending_source_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN groups g ON t.group_id = g.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      LEFT JOIN income_sources isrc ON t.income_source_id = isrc.id
      LEFT JOIN lending_sources ls ON t.lending_source_id = ls.id
      WHERE t.id = ?
    `).get(id);

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// PATCH /transactions/:id
router.patch('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'not_found' });
    }

    const updates = [];
    const params = [];

    const fields = ['type', 'amount', 'date', 'category_id', 'group_id', 'payment_method_id', 'income_source_id', 'lending_source_id', 'note', 'merchant', 'sort_order'];
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

    db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

    const transaction = db.prepare(`
      SELECT t.*, 
             c.name as category_name,
             g.name as group_name,
             pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN groups g ON t.group_id = g.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.id = ?
    `).get(id);

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// DELETE /transactions/:id
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Soft delete
    db.prepare(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`).run(id);

    res.json({ message: 'deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /transactions/summary - daily summary for calendar
router.get('/summary', (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    let sql = `
      SELECT 
        date(t.date) as day,
        SUM(CASE 
          WHEN t.type = 'expense' THEN 
            t.amount - COALESCE((
              SELECT SUM(r.amount) 
              FROM transactions r 
              WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
            ), 0)
          ELSE 0 
        END) as expense,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income
      FROM transactions t
      WHERE t.user_id = ? AND t.deleted_at IS NULL
    `;
    const params = [userId];

    if (from) {
      sql += ` AND date(date) >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND date(date) <= ?`;
      params.push(to);
    }

    sql += ` GROUP BY date(date) ORDER BY day`;

    const summary = db.prepare(sql).all(...params);

    res.json(summary);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /transactions/insights - breakdown by category/group/payment method
router.get('/insights', (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, type = 'expense' } = req.query;

    let dateFilter = '';
    const dateParams = [];

    if (from) {
      dateFilter += ` AND date(date) >= ?`;
      dateParams.push(from);
    }
    if (to) {
      dateFilter += ` AND date(date) <= ?`;
      dateParams.push(to);
    }

    // By category
    const byCategory = db.prepare(`
      SELECT 
        c.id, c.name, 
        SUM(
          t.amount - COALESCE((
            SELECT SUM(r.amount) 
            FROM transactions r 
            WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
          ), 0)
        ) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type = ? ${dateFilter}
      GROUP BY t.category_id
      ORDER BY total DESC
    `).all(userId, type, ...dateParams);

    // By group
    const byGroup = db.prepare(`
      SELECT 
        g.id, g.name, 
        SUM(
          t.amount - COALESCE((
            SELECT SUM(r.amount) 
            FROM transactions r 
            WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
          ), 0)
        ) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type = ? ${dateFilter}
      GROUP BY t.group_id
      ORDER BY total DESC
    `).all(userId, type, ...dateParams);

    // By payment method
    const byPaymentMethod = db.prepare(`
      SELECT 
        pm.id, pm.name, 
        SUM(
          t.amount - COALESCE((
            SELECT SUM(r.amount) 
            FROM transactions r 
            WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
          ), 0)
        ) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type = ? ${dateFilter}
      GROUP BY t.payment_method_id
      ORDER BY total DESC
    `).all(userId, type, ...dateParams);

    // Totals
    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN t.type = 'expense' THEN 
            t.amount - COALESCE((
              SELECT SUM(r.amount) 
              FROM transactions r 
              WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
            ), 0)
          ELSE 0 
        END), 0) as expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income
      FROM transactions t
      WHERE t.user_id = ? AND t.deleted_at IS NULL ${dateFilter}
    `).get(userId, ...dateParams);

    res.json({
      byCategory,
      byGroup,
      byPaymentMethod,
      totals: {
        expense: totals.expense,
        income: totals.income,
        net: totals.income - totals.expense
      }
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
