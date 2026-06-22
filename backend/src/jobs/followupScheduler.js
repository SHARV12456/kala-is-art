// ============================================================
// KALA IS ART - Intelligent Follow-Up Scheduler
// Smart cron jobs: daily reminders, escalation, lead scoring
// ============================================================
const cron = require('node-cron');
const { query } = require('../config/database');
const { sendEmail } = require('../utils/email');
const { createNotification } = require('../utils/notification');
const { rescoreAllLeads } = require('../utils/leadScoring');
const logger = require('../config/logger');

// ─── JOB 1: DAILY MORNING BRIEF (8:00 AM IST) ────────────────
// Sends each user their priority dashboard for the day
const sendDailyMorningBrief = async () => {
  logger.info('☀️ Running daily morning brief job...');
  try {
    // Get all active users
    const users = await query(`SELECT id, owner_name, email FROM users WHERE is_active=TRUE`);

    for (const user of users.rows) {
      const uid = user.id;

      const [todayFU, overdueFU, hotLeads, atRisk] = await Promise.all([
        // Today's follow-ups
        query(`SELECT COUNT(*) as n FROM followups WHERE user_id=$1 AND scheduled_date=CURRENT_DATE AND status='pending'`, [uid]),
        // Overdue
        query(`SELECT COUNT(*) as n FROM followups WHERE user_id=$1 AND scheduled_date<CURRENT_DATE AND status='pending'`, [uid]),
        // Hot leads without recent contact
        query(`SELECT COUNT(*) as n FROM leads WHERE user_id=$1 AND temperature='hot' AND is_archived=FALSE AND status NOT IN ('won','lost')`, [uid]),
        // At-risk hot leads
        query(`SELECT COUNT(*) as n FROM leads WHERE user_id=$1 AND at_risk=TRUE AND is_archived=FALSE`, [uid]),
      ]);

      const today = parseInt(todayFU.rows[0].n);
      const overdue = parseInt(overdueFU.rows[0].n);
      const hot = parseInt(hotLeads.rows[0].n);
      const risk = parseInt(atRisk.rows[0].n);

      if (today + overdue + hot + risk === 0) continue; // Nothing to report

      // Notify
      await createNotification({
        userId: uid,
        type: 'daily_brief',
        title: `☀️ Good morning, ${user.owner_name.split(' ')[0]}!`,
        message: `Today: ${today} follow-ups · ${overdue} overdue · ${hot} hot leads · ${risk} at risk`,
        data: { today, overdue, hot, risk },
        actionUrl: '/dashboard',
      });

      // Email brief (non-blocking)
      sendEmail({
        to: user.email,
        template: 'daily_brief',
        data: { name: user.owner_name, today, overdue, hot, risk },
      }).catch(() => {});
    }

    logger.info(`Morning brief sent to ${users.rows.length} users`);
  } catch (err) {
    logger.error('Morning brief error:', err);
  }
};

// ─── JOB 2: MISSED FOLLOW-UP ESCALATION (9:00 AM IST) ────────
// Day 1: notify user, Day 2: notify again, Day 3: notify team lead, Day 5: admin
const escalateMissedFollowups = async () => {
  logger.info('⚠️ Running missed follow-up escalation...');
  try {
    // Get all pending overdue follow-ups with their age
    const overdueRes = await query(
      `SELECT f.*, l.name as lead_name, l.temperature,
              u.owner_name, u.email as user_email,
              CURRENT_DATE - f.scheduled_date as days_overdue
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       JOIN users u ON f.user_id = u.id
       WHERE f.status='pending' AND f.scheduled_date < CURRENT_DATE
       ORDER BY f.scheduled_date ASC`
    );

    for (const f of overdueRes.rows) {
      const days = parseInt(f.days_overdue);

      // Mark as missed
      await query(`UPDATE followups SET status='missed', at_risk=TRUE WHERE id=$1`, [f.id]);

      // Mark lead as at-risk
      await query(`UPDATE leads SET at_risk=TRUE WHERE id=$1`, [f.lead_id]);

      // Day 1: notify assigned user
      if (days >= 1) {
        await createNotification({
          userId: f.user_id,
          type: 'missed_followup',
          title: `🚨 Missed Follow-up (${days} day${days > 1 ? 's' : ''} overdue)`,
          message: `${f.lead_name} (${f.temperature} lead) — follow-up was due ${days} day${days > 1 ? 's' : ''} ago`,
          data: { leadId: f.lead_id, followupId: f.id, days_overdue: days },
          actionUrl: `/leads/${f.lead_id}`,
        });
      }

      // Day 3+: notify admin
      if (days >= 3) {
        const admins = await query(`SELECT id FROM users WHERE role='super_admin' LIMIT 3`);
        for (const admin of admins.rows) {
          if (admin.id !== f.user_id) {
            await createNotification({
              userId: admin.id,
              type: 'escalation',
              title: `🔴 Escalation: Follow-up ${days} days overdue`,
              message: `${f.owner_name}'s follow-up with ${f.lead_name} is ${days} days overdue`,
              data: { leadId: f.lead_id, userId: f.user_id },
              actionUrl: `/leads/${f.lead_id}`,
            });
          }
        }
        await query(`UPDATE followups SET escalation_level=$1, escalated_at=NOW() WHERE id=$2`, [days >= 5 ? 3 : 2, f.id]);
      }

      logger.info(`Escalated followup ${f.id} for lead ${f.lead_name} (${days}d overdue)`);
    }
  } catch (err) {
    logger.error('Escalation job error:', err);
  }
};

// ─── JOB 3: HOURLY LEAD RESCORING ────────────────────────────
// Scores decay over time (last response date), so rescore every hour
const runHourlyRescoring = async () => {
  try {
    const count = await rescoreAllLeads();
    logger.info(`Hourly rescore: ${count} leads updated`);
  } catch (err) {
    logger.error('Hourly rescore error:', err);
  }
};

// ─── JOB 4: HOT LEAD 48H ALERT (Every 4 hours) ───────────────
const checkHotLeadAlerts = async () => {
  try {
    const hotRes = await query(
      `SELECT l.id, l.name, l.user_id, l.temperature,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(l.last_contacted_at, l.created_at)))/3600 as hours_since_contact
       FROM leads l
       WHERE l.temperature='hot' AND l.is_archived=FALSE
         AND l.status NOT IN ('won','lost','not_interested')
       HAVING EXTRACT(EPOCH FROM (NOW() - COALESCE(l.last_contacted_at, l.created_at)))/3600 >= 48`
    );

    for (const lead of hotRes.rows) {
      await query(`UPDATE leads SET at_risk=TRUE WHERE id=$1`, [lead.id]);
      await createNotification({
        userId: lead.user_id,
        type: 'at_risk_alert',
        title: '🔴 Hot Lead Going Cold!',
        message: `${lead.name} is a HOT lead but hasn't been contacted in ${Math.floor(lead.hours_since_contact)} hours. Act now!`,
        data: { leadId: lead.id },
        actionUrl: `/leads/${lead.id}`,
      });
    }
    if (hotRes.rows.length > 0) logger.info(`Hot lead alerts sent: ${hotRes.rows.length}`);
  } catch (err) {
    logger.error('Hot lead alert error:', err);
  }
};

// ─── JOB 5: SUBSCRIPTION EXPIRY (10:00 AM IST) ───────────────
const checkSubscriptionExpiry = async () => {
  try {
    for (const days of [7, 3, 1]) {
      const result = await query(
        `SELECT s.*, u.email, u.owner_name, u.id as user_id, p.name as plan_name
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         JOIN plans p ON s.plan_id = p.id
         WHERE s.status='active' AND s.ends_at::date = (CURRENT_DATE + INTERVAL '${days} days')::date`
      );
      for (const sub of result.rows) {
        await createNotification({
          userId: sub.user_id,
          type: 'subscription_renewal',
          title: `⏳ Subscription Expiring in ${days} Day${days > 1 ? 's' : ''}`,
          message: `Your ${sub.plan_name} plan expires soon. Renew to avoid interruption.`,
          data: { subscriptionId: sub.id },
          actionUrl: '/subscription',
        });
      }
    }
  } catch (err) {
    logger.error('Subscription expiry check error:', err);
  }
};

// ─── START ALL JOBS ───────────────────────────────────────────
const startFollowUpScheduler = () => {
  // 8:00 AM IST — daily morning brief
  cron.schedule('0 8 * * *', sendDailyMorningBrief, { timezone: 'Asia/Kolkata' });

  // 9:00 AM IST — escalation + overdue marking
  cron.schedule('0 9 * * *', escalateMissedFollowups, { timezone: 'Asia/Kolkata' });

  // 10:00 AM IST — subscription expiry
  cron.schedule('0 10 * * *', checkSubscriptionExpiry, { timezone: 'Asia/Kolkata' });

  // Every hour — rescore all leads (handles recency decay)
  cron.schedule('0 * * * *', runHourlyRescoring);

  // Every 4 hours — hot lead 48h alert
  cron.schedule('0 */4 * * *', checkHotLeadAlerts);

  logger.info('✅ Follow-up scheduler started');
};

module.exports = { startFollowUpScheduler, sendDailyMorningBrief, checkSubscriptionExpiry };
