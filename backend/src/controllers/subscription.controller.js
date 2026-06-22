// ============================================================
// KALA IS ART - Manual Subscription Management System
// ============================================================
const { query, transaction } = require('../config/database');
const { createNotification } = require('../utils/notification');
const logger = require('../config/logger');

// ─── GET PLANS ────────────────────────────────────────────────
const getPlans = async (req, res) => {
  try {
    const result = await query('SELECT * FROM plans WHERE is_active = TRUE ORDER BY price ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
};

// ─── GET MY SUBSCRIPTION (FOR USERS) ─────────────────────────
const getMySubscription = async (req, res) => {
  try {
    const subResult = await query(
      `SELECT s.*, p.name as plan_name, p.price, p.duration_days, p.features
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );

    const payResult = await query(
      `SELECT p.* FROM payments p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 10`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        subscription: subResult.rows[0] || null,
        payments: payResult.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
};

// ─── ADMIN: GET DASHBOARD STATS ──────────────────────────────
const adminGetDashboard = async (req, res) => {
  try {
    const activeResult = await query(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`);
    const expiredResult = await query(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'expired'`);

    const upcomingResult = await query(`
      SELECT s.*, u.business_name, u.owner_name, u.mobile
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active' AND s.ends_at <= NOW() + INTERVAL '7 days' AND s.ends_at >= NOW()
      ORDER BY s.ends_at ASC
    `);

    const revenueResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END), 0) as monthly_revenue,
        COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('quarter', NOW()) THEN amount ELSE 0 END), 0) as quarterly_revenue,
        COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('year', NOW()) THEN amount ELSE 0 END), 0) as yearly_revenue
      FROM payments WHERE status = 'paid'
    `);

    res.json({
      success: true,
      data: {
        activeAccounts: parseInt(activeResult.rows[0].count),
        expiredAccounts: parseInt(expiredResult.rows[0].count),
        upcomingRenewals: upcomingResult.rows,
        revenue: revenueResult.rows[0]
      }
    });
  } catch (error) {
    logger.error('Admin Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

// ─── ADMIN: GET ALL CUSTOMERS ───────────────────────────────
const adminGetCustomers = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.business_name, u.owner_name, u.email, u.mobile,
             s.id as subscription_id, s.status, s.starts_at, s.ends_at,
             p.name as plan_name,
             (SELECT MAX(paid_at) FROM payments WHERE user_id = u.id) as last_payment
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.role != 'superadmin'
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

// ─── ADMIN: RECORD PAYMENT & ASSIGN SUBSCRIPTION ──────────────
const adminRecordPayment = async (req, res) => {
  const { userId, planId, amount, paymentMethod, referenceNumber, notes, customDays } = req.body;

  try {
    const planResult = await query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!planResult.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });

    const plan = planResult.rows[0];
    const durationDays = customDays || plan.duration_days;

    await transaction(async (client) => {
      // Deactivate old subscriptions
      await client.query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`, [userId]);

      const startsAt = new Date();
      const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Create new subscription
      const subResult = await client.query(
        `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at, notes, manual_reference)
         VALUES ($1, $2, 'active', $3, $4, $5, $6)
         RETURNING id`,
        [userId, planId, startsAt, endsAt, notes, referenceNumber]
      );

      const invoiceNumber = 'KAL-INV-' + Date.now();

      // Create payment record
      await client.query(
        `INSERT INTO payments (user_id, subscription_id, plan_id, amount, currency, status, payment_method, reference_number, notes, invoice_number, paid_at, expiry_date)
         VALUES ($1, $2, $3, $4, 'INR', 'paid', $5, $6, $7, $8, NOW(), $9)`,
        [userId, subResult.rows[0].id, planId, amount, paymentMethod, referenceNumber, notes, invoiceNumber, endsAt]
      );

      // Unlock account if it was locked
      await client.query(`UPDATE users SET locked_until = NULL WHERE id = $1`, [userId]);
    });

    await createNotification({
      userId: userId,
      type: 'general',
      title: 'Subscription Activated',
      message: 'Your ' + plan.name + ' subscription has been activated successfully.'
    });

    res.json({ success: true, message: 'Payment recorded and subscription activated.' });
  } catch (error) {
    logger.error('Record Payment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

// ─── ADMIN: UPDATE SUBSCRIPTION STATUS ────────────────────────
const adminUpdateSubscription = async (req, res) => {
  const { subId } = req.params;
  const { status, addDays } = req.body;

  try {
    let updateQuery = 'UPDATE subscriptions SET status = $1, updated_at = NOW()';
    let params = [status, subId];

    if (addDays) {
      updateQuery += ', ends_at = ends_at + INTERVAL \'' + addDays + ' days\'';
    }
    updateQuery += ' WHERE id = $2 RETURNING user_id';

    await query(updateQuery, params);

    res.json({ success: true, message: 'Subscription updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
};

module.exports = {
  getPlans,
  getMySubscription,
  adminGetDashboard,
  adminGetCustomers,
  adminRecordPayment,
  adminUpdateSubscription
};
