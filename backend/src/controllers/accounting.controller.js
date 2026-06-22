// ============================================================
// KALA IS ART - Expense & Income Controllers
// ============================================================
const { query } = require('../config/database');
const logger = require('../config/logger');

// ─── EXPENSES ─────────────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const { type, category, date_from, date_to, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.user.role !== 'super_admin') {
      conditions.push(`user_id = $${idx++}`);
      params.push(req.user.id);
    }
    if (type) { conditions.push(`type = $${idx++}`); params.push(type); }
    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (date_from) { conditions.push(`expense_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`expense_date <= $${idx++}`); params.push(date_to); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(`SELECT COUNT(*) FROM expenses ${where}`, params);
    const result = await query(
      `SELECT * FROM expenses ${where} ORDER BY expense_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    // Get category summary
    const summaryResult = await query(
      `SELECT type, category, COALESCE(SUM(amount), 0) as total
       FROM expenses ${where}
       GROUP BY type, category`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      summary: summaryResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

const createExpense = async (req, res) => {
  const { type, category, title, description, amount, expense_date, payment_method,
    vendor_name, project_id, client_id, is_reimbursable, tags } = req.body;

  try {
    const result = await query(
      `INSERT INTO expenses (user_id, type, category, title, description, amount, expense_date,
        payment_method, vendor_name, project_id, client_id, is_reimbursable, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [req.user.id, type, category, title, description || null, amount,
       expense_date || new Date().toISOString().split('T')[0],
       payment_method || 'cash', vendor_name || null, project_id || null,
       client_id || null, is_reimbursable || false, tags || []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Expense recorded' });
  } catch (error) {
    logger.error('Create expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};

const updateExpense = async (req, res) => {
  const { type, category, title, description, amount, expense_date, payment_method,
    vendor_name, project_id, client_id } = req.body;

  try {
    const result = await query(
      `UPDATE expenses SET
        type = COALESCE($1, type), category = COALESCE($2, category),
        title = COALESCE($3, title), description = COALESCE($4, description),
        amount = COALESCE($5, amount), expense_date = COALESCE($6, expense_date),
        payment_method = COALESCE($7, payment_method), vendor_name = COALESCE($8, vendor_name)
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [type, category, title, description, amount, expense_date, payment_method, vendor_name,
       req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: result.rows[0], message: 'Expense updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

const getExpenseReport = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    const userFilter = req.user.role !== 'super_admin' ? `AND user_id = '${req.user.id}'` : '';

    let groupBy, dateFilter;
    if (period === 'monthly') {
      groupBy = "DATE_TRUNC('month', expense_date)";
      dateFilter = `EXTRACT(YEAR FROM expense_date) = ${parseInt(year)}`;
    } else if (period === 'quarterly') {
      groupBy = "DATE_TRUNC('quarter', expense_date)";
      dateFilter = `EXTRACT(YEAR FROM expense_date) = ${parseInt(year)}`;
    } else {
      groupBy = "DATE_TRUNC('year', expense_date)";
      dateFilter = `expense_date >= NOW() - INTERVAL '5 years'`;
    }

    const result = await query(
      `SELECT ${groupBy} as period, type, category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM expenses
       WHERE ${dateFilter} ${userFilter}
       GROUP BY ${groupBy}, type, category
       ORDER BY period DESC, total DESC`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

// ─── INCOME ───────────────────────────────────────────────────
const getIncome = async (req, res) => {
  try {
    const { category, date_from, date_to, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.user.role !== 'super_admin') {
      conditions.push(`user_id = $${idx++}`);
      params.push(req.user.id);
    }
    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (date_from) { conditions.push(`income_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`income_date <= $${idx++}`); params.push(date_to); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(`SELECT COUNT(*) FROM income ${where}`, params);
    const result = await query(
      `SELECT * FROM income ${where} ORDER BY income_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    const summaryResult = await query(
      `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM income ${where} GROUP BY category`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      summary: summaryResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch income' });
  }
};

const createIncome = async (req, res) => {
  const { category, title, description, amount, income_date, payment_method,
    client_id, project_id, invoice_number, is_gst_applicable, gst_amount, tags } = req.body;

  try {
    const result = await query(
      `INSERT INTO income (user_id, category, title, description, amount, income_date,
        payment_method, client_id, project_id, invoice_number, is_gst_applicable, gst_amount, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [req.user.id, category, title, description || null, amount,
       income_date || new Date().toISOString().split('T')[0],
       payment_method || 'bank_transfer', client_id || null, project_id || null,
       invoice_number || null, is_gst_applicable || false, gst_amount || 0, tags || []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Income recorded' });
  } catch (error) {
    logger.error('Create income error:', error);
    res.status(500).json({ success: false, message: 'Failed to record income' });
  }
};

const updateIncome = async (req, res) => {
  const { category, title, description, amount, income_date, payment_method } = req.body;
  try {
    const result = await query(
      `UPDATE income SET
        category = COALESCE($1, category), title = COALESCE($2, title),
        description = COALESCE($3, description), amount = COALESCE($4, amount),
        income_date = COALESCE($5, income_date), payment_method = COALESCE($6, payment_method)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [category, title, description, amount, income_date, payment_method, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update income' });
  }
};

const deleteIncome = async (req, res) => {
  try {
    await query('DELETE FROM income WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Income record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
};

const getIncomeReport = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    const userFilter = req.user.role !== 'super_admin' ? `AND user_id = '${req.user.id}'` : '';

    let groupBy;
    if (period === 'daily') groupBy = "DATE_TRUNC('day', income_date)";
    else if (period === 'weekly') groupBy = "DATE_TRUNC('week', income_date)";
    else if (period === 'quarterly') groupBy = "DATE_TRUNC('quarter', income_date)";
    else if (period === 'yearly') groupBy = "DATE_TRUNC('year', income_date)";
    else groupBy = "DATE_TRUNC('month', income_date)";

    const result = await query(
      `SELECT ${groupBy} as period, category,
              COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM income
       WHERE EXTRACT(YEAR FROM income_date) = $1 ${userFilter}
       GROUP BY ${groupBy}, category
       ORDER BY period DESC`,
      [parseInt(year)]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate income report' });
  }
};

module.exports = {
  getExpenses, createExpense, updateExpense, deleteExpense, getExpenseReport,
  getIncome, createIncome, updateIncome, deleteIncome, getIncomeReport,
};
