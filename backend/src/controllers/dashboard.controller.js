// KALA IS ART - Complete Dashboard Controller
const { query } = require('../config/database');
const logger = require('../config/logger');

const getSummary = async (req, res) => {
  const uid = req.user.id;
  try {
    const [leads, lostReasons, clients, followups, estimates, revenue, expenses, trend, recentLeads, todayFollowups] = await Promise.all([
      // Lead stats
      query(`SELECT
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status NOT IN ('won', 'lost') THEN 1 END) as active_leads,
        COUNT(CASE WHEN status='won' THEN 1 END) as won_leads,
        COUNT(CASE WHEN status='lost' THEN 1 END) as lost_leads,
        AVG(CASE WHEN status='won' AND converted_to_client_at IS NOT NULL THEN EXTRACT(EPOCH FROM (converted_to_client_at - created_at))/86400 ELSE NULL END) as avg_conversion_days,
        COUNT(CASE WHEN DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()) THEN 1 END) as leads_this_month,
        COUNT(CASE WHEN status='won' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()) THEN 1 END) as won_this_month
       FROM leads WHERE user_id=$1 AND is_archived=FALSE`, [uid]),

      // Lost reasons
      query(`SELECT lost_reason, COUNT(*) as count FROM leads WHERE user_id=$1 AND status='lost' AND lost_reason IS NOT NULL GROUP BY lost_reason`, [uid]),

      // Client count
      query(`SELECT COUNT(*) as total_clients FROM clients WHERE user_id=$1 AND is_active=TRUE`, [uid]),

      // Follow-ups due today/overdue
      query(`SELECT COUNT(*) as followups_due FROM followups
             WHERE user_id=$1 AND status='pending' AND scheduled_date <= CURRENT_DATE`, [uid]),

      // Active estimates
      query(`SELECT COUNT(*) as active_estimates FROM estimates
             WHERE user_id=$1 AND status IN ('draft','sent')`, [uid]),

      // Monthly revenue
      query(`SELECT COALESCE(SUM(amount),0) as monthly_revenue FROM income
             WHERE user_id=$1 AND DATE_TRUNC('month',income_date)=DATE_TRUNC('month',NOW())`, [uid]),

      // Monthly expenses
      query(`SELECT COALESCE(SUM(amount),0) as monthly_expenses FROM expenses
             WHERE user_id=$1 AND DATE_TRUNC('month',expense_date)=DATE_TRUNC('month',NOW())`, [uid]),

      // 6-month trend
      query(`SELECT
        TO_CHAR(m.month,'Mon YY') as month,
        COALESCE(i.revenue,0) as revenue,
        COALESCE(e.expenses,0) as expenses
       FROM generate_series(DATE_TRUNC('month',NOW()-INTERVAL '5 months'), DATE_TRUNC('month',NOW()), '1 month') m(month)
       LEFT JOIN (SELECT DATE_TRUNC('month',income_date) as mo, SUM(amount) as revenue FROM income WHERE user_id=$1 GROUP BY mo) i ON i.mo=m.month
       LEFT JOIN (SELECT DATE_TRUNC('month',expense_date) as mo, SUM(amount) as expenses FROM expenses WHERE user_id=$1 GROUP BY mo) e ON e.mo=m.month
       ORDER BY m.month`, [uid]),

      // Recent leads (5)
      query(`SELECT id,name,mobile,city,status,created_at FROM leads
             WHERE user_id=$1 AND is_archived=FALSE ORDER BY created_at DESC LIMIT 5`, [uid]),

      // Today's follow-ups (5)
      query(`SELECT f.id,f.type,f.status,f.scheduled_time,l.name as lead_name,l.mobile
             FROM followups f JOIN leads l ON f.lead_id=l.id
             WHERE f.user_id=$1 AND f.scheduled_date=CURRENT_DATE AND f.status='pending'
             ORDER BY f.scheduled_time ASC LIMIT 5`, [uid]),
    ]);

    const l = leads.rows[0];
    res.json({
      success: true,
      data: {
        ...l,
        lost_reasons: lostReasons.rows,
        total_clients: parseInt(clients.rows[0].total_clients),
        followups_due: parseInt(followups.rows[0].followups_due),
        active_estimates: parseInt(estimates.rows[0].active_estimates),
        monthly_revenue: parseFloat(revenue.rows[0].monthly_revenue),
        monthly_expenses: parseFloat(expenses.rows[0].monthly_expenses),
        monthly_trend: trend.rows.map(r => ({ ...r, revenue: parseFloat(r.revenue), expenses: parseFloat(r.expenses) })),
        recent_leads: recentLeads.rows,
        todays_followups: todayFollowups.rows,
      }
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

module.exports = { getSummary };
