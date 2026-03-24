import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /transactions
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, type, group_id, category_id, payment_method_id, needs_review, q, limit = 50, cursor, include_repayments, sort_by = 'date', sort_order = 'desc' } = req.query;

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

    // Determine sort column
    let sortColumn = 't.date';
    if (sort_by === 'amount') sortColumn = 't.amount';
    if (sort_by === 'merchant') sortColumn = 't.merchant';
    
    // Determine sort order
    const order = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortColumn} ${order}, t.sort_order ASC, t.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const transactions = db.prepare(sql).all(...params);

    // Get totals for the same filters
    // expense_total = SUM(expense - all its repayments) for all expenses in this period
    // PLUS SUM(-repayment) for any unlinked repayments in this period
    let totalsSql = `
      SELECT 
        SUM(expense_net) as expense_total,
        SUM(income_val) as income_total
      FROM (
        /* Part 1: Expenses and Incomes in this period */
        SELECT 
          CASE WHEN t.type = 'expense' THEN 
            t.amount - COALESCE((
              SELECT SUM(r.amount) FROM transactions r 
              WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
            ), 0)
          ELSE 0 END as expense_net,
          CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END as income_val
        FROM transactions t
        WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type != 'repayment'
    `;
    const totalsParams = [userId];

    if (from) {
      totalsSql += ` AND date(t.date) >= ?`;
      totalsParams.push(from);
    }
    if (to) {
      totalsSql += ` AND date(t.date) <= ?`;
      totalsParams.push(to);
    }
    if (type && type !== 'all') {
      totalsSql += ` AND t.type = ?`;
      totalsParams.push(type);
    }
    if (group_id) {
      totalsSql += ` AND t.group_id = ?`;
      totalsParams.push(group_id);
    }
    if (category_id) {
      totalsSql += ` AND t.category_id = ?`;
      totalsParams.push(category_id);
    }
    if (payment_method_id) {
      totalsSql += ` AND t.payment_method_id = ?`;
      totalsParams.push(payment_method_id);
    }
    if (q) {
      totalsSql += ` AND (t.note LIKE ? OR t.merchant LIKE ?)`;
      totalsParams.push(`%${q}%`, `%${q}%`);
    }

    // Part 2: Add unlinked repayments that occurred in this period
    // These reduce the total expense directly
    totalsSql += `
        UNION ALL
        SELECT 
          -r.amount as expense_net,
          0 as income_val
        FROM transactions r
        WHERE r.user_id = ? AND r.type = 'repayment' AND r.related_transaction_id IS NULL AND r.deleted_at IS NULL
    `;
    totalsParams.push(userId);

    if (from) {
      totalsSql += ` AND date(r.date) >= ?`;
      totalsParams.push(from);
    }
    if (to) {
      totalsSql += ` AND date(r.date) <= ?`;
      totalsParams.push(to);
    }

    totalsSql += `)`;

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

    // Get min sort order for this date to prepend to start (negative values allowed)
    const minOrder = db.prepare('SELECT MIN(sort_order) as min_order FROM transactions WHERE user_id = ? AND date(date) = date(?)').get(userId, txDate);
    const nextOrder = (minOrder?.min_order || 0) - 1;

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

// POST /transactions/bulk
router.post('/bulk', (req, res) => {
  try {
    const userId = req.user.id;
    const { transactions: bulkData } = req.body;
    const isDryRun = req.query.dryRun === 'true';

    if (!Array.isArray(bulkData)) {
      return res.status(400).json({ error: 'invalid_data_format' });
    }

    // Cache for name-to-ID mapping
    const categories = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(userId);
    const groups = db.prepare('SELECT id, name FROM groups WHERE user_id = ?').all(userId);
    const paymentMethods = db.prepare('SELECT id, name FROM payment_methods WHERE user_id = ?').all(userId);
    const incomeSources = db.prepare('SELECT id, name FROM income_sources WHERE user_id = ?').all(userId);
    const lendingSources = db.prepare('SELECT id, name FROM lending_sources WHERE user_id = ?').all(userId);
    const savingsAccounts = db.prepare('SELECT id, name FROM savings_accounts WHERE user_id = ?').all(userId);

    const findIdByName = (list, name) => {
      if (!name) return null;
      const match = list.find(item => item.name.toLowerCase() === name.toLowerCase());
      return match ? match.id : null;
    };

    let added = 0;
    let skipped = 0;
    const results = [];

    const insertStmt = db.prepare(`
      INSERT INTO transactions (
        id, user_id, type, amount, date, category_id, group_id, 
        payment_method_id, income_source_id, lending_source_id, 
        savings_account_id, note, merchant, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const checkDuplicateStmt = db.prepare(`
      SELECT id FROM transactions 
      WHERE user_id = ? 
        AND type = ? 
        AND ABS(amount - ?) < 0.01 
        AND date(date) = date(?)
        AND (merchant = ? OR (merchant IS NULL AND ? IS NULL))
        AND (note = ? OR (note IS NULL AND ? IS NULL))
        AND (category_id = ? OR (category_id IS NULL AND ? IS NULL))
        AND (group_id = ? OR (group_id IS NULL AND ? IS NULL))
        AND (payment_method_id = ? OR (payment_method_id IS NULL AND ? IS NULL))
        AND (income_source_id = ? OR (income_source_id IS NULL AND ? IS NULL))
        AND (lending_source_id = ? OR (lending_source_id IS NULL AND ? IS NULL))
        AND deleted_at IS NULL
    `);

    const runBulkInsert = db.transaction((data) => {
      for (const item of data) {
        const type = item.type || 'expense';
        const amount = parseFloat(item.amount);
        const date = item.date || new Date().toISOString();
        const merchant = item.merchant || null;
        const note = item.note || null;

        // Resolve IDs
        const category_id = item.category_id || findIdByName(categories, item.category_name);
        const group_id = item.group_id || findIdByName(groups, item.group_name);
        const payment_method_id = item.payment_method_id || findIdByName(paymentMethods, item.payment_method_name);
        const income_source_id = item.income_source_id || findIdByName(incomeSources, item.income_source_name);
        const lending_source_id = item.lending_source_id || findIdByName(lendingSources, item.lending_source_name);
        const savings_account_id = item.savings_account_id || findIdByName(savingsAccounts, item.savings_account_name);

        // Check for duplicate
        const duplicate = checkDuplicateStmt.get(
          userId, type, amount, date, 
          merchant, merchant, 
          note, note,
          category_id, category_id,
          group_id, group_id,
          payment_method_id, payment_method_id,
          income_source_id, income_source_id,
          lending_source_id, lending_source_id
        );

        if (duplicate) {
          skipped++;
          results.push({ ...item, status: 'skipped', reason: 'duplicate' });
          continue;
        }

        const id = uuidv4();
        const sort_order = 0; // Default for bulk

        insertStmt.run(
          id, userId, type, amount, date, category_id, group_id,
          payment_method_id, income_source_id, lending_source_id,
          savings_account_id, note, merchant, sort_order
        );

        added++;
        results.push({ ...item, id, status: 'added' });
      }

      if (isDryRun) {
        throw new Error('DRY_RUN_ROLLBACK');
      }
    });

    try {
      runBulkInsert(bulkData);
    } catch (e) {
      if (e.message !== 'DRY_RUN_ROLLBACK') throw e;
    }

    res.json({
      summary: {
        total: bulkData.length,
        added,
        skipped,
        isDryRun
      },
      results
    });
  } catch (error) {
    console.error('Bulk insert transactions error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

// GET /transactions/summary - daily summary for calendar
router.get('/summary', (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    let sql = `
      SELECT 
        day,
        SUM(expense) as expense,
        SUM(income) as income
      FROM (
        /* Expenses and Incomes grouped by their own date, with linked repayments subtracted */
        SELECT 
          date(t.date) as day,
          CASE 
            WHEN t.type = 'expense' THEN 
              t.amount - COALESCE((
                SELECT SUM(r.amount) FROM transactions r 
                WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
              ), 0)
            ELSE 0 
          END as expense,
          CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END as income
        FROM transactions t
        WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type != 'repayment'
        
        UNION ALL
        
        /* Unlinked repayments grouped by the day they occurred */
        SELECT 
          date(r.date) as day,
          -r.amount as expense,
          0 as income
        FROM transactions r
        WHERE r.user_id = ? AND r.type = 'repayment' AND r.related_transaction_id IS NULL AND r.deleted_at IS NULL
      )
      WHERE 1=1
    `;
    const params = [userId, userId];

    if (from) {
      sql += ` AND day >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND day <= ?`;
      params.push(to);
    }

    sql += ` GROUP BY day ORDER BY day`;
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
      GROUP BY c.id
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
      GROUP BY g.id
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
      GROUP BY pm.id
      ORDER BY total DESC
    `).all(userId, type, ...dateParams);

    // Totals
    const totals = db.prepare(`
      SELECT 
        SUM(expense_net) as expense,
        SUM(income_val) as income
      FROM (
        /* Part 1: Linked Net Expenses and Incomes in this period */
        SELECT 
          CASE WHEN t.type = 'expense' THEN 
            t.amount - COALESCE((
              SELECT SUM(r.amount) FROM transactions r 
              WHERE r.related_transaction_id = t.id AND r.type = 'repayment' AND r.deleted_at IS NULL
            ), 0)
          ELSE 0 END as expense_net,
          CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END as income_val
        FROM transactions t
        WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type != 'repayment' ${dateFilter}
        
        UNION ALL
        
        /* Part 2: Unlinked Repayments in this period */
        SELECT 
          -r.amount as expense_net,
          0 as income_val
        FROM transactions r
        WHERE r.user_id = ? AND r.type = 'repayment' AND r.related_transaction_id IS NULL AND r.deleted_at IS NULL ${dateFilter.replace(/date\(/g, 'date(r.')}
      )
    `).get(userId, ...dateParams, userId, ...dateParams);

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
