// ============================================================
// KALA IS ART - Follow-up Controller
// Smart, versatile follow-up management
// ============================================================
const { query } = require('../config/database');
const { createNotification } = require('../utils/notification');
const logger = require('../config/logger');

// ─── AUTO-SCHEDULING LOGIC (shared with lead.controller) ─────
const FOLLOWUP_SCHEDULE = {
  high:   { new_lead:1, contacted:2, interested:3, follow_up:2, proposal_sent:2, negotiation:1 },
  medium: { new_lead:3, contacted:5, interested:7, follow_up:5, proposal_sent:4, negotiation:3 },
  low:    { new_lead:7, contacted:10, interested:14, follow_up:10, proposal_sent:7, negotiation:5 },
};

const FOLLOWUP_TYPE_MAP = {
  new_lead:'call', contacted:'whatsapp', interested:'call',
  follow_up:'call', proposal_sent:'email', negotiation:'meeting',
};

const addBusinessDays = (fromDate, days) => {
  const date = new Date(fromDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++; // skip Sunday
  }
  return date;
};

// ─── GET ALL FOLLOW-UPS ───────────────────────────────────────
const getFollowups = async (req, res) => {
  try {
    const {
      status, type, date_from, date_to,
      lead_id, overdue, today, this_week,
      page = 1, limit = 20, sort = 'scheduled_date', order = 'ASC'
    } = req.query;

    const uid = req.user.id;
    const conditions = [`f.user_id = $1`];
    const params = [uid];
    let idx = 2;

    if (status)    { conditions.push(`f.status = $${idx++}`); params.push(status); }
    if (type)      { conditions.push(`f.type = $${idx++}`);   params.push(type); }
    if (lead_id)   { conditions.push(`f.lead_id = $${idx++}`);params.push(lead_id); }
    if (date_from) { conditions.push(`f.scheduled_date >= $${idx++}`); params.push(date_from); }
    if (date_to)   { conditions.push(`f.scheduled_date <= $${idx++}`); params.push(date_to); }

    if (overdue === 'true') {
      conditions.push(`f.scheduled_date < CURRENT_DATE`);
      conditions.push(`f.status = 'pending'`);
    }
    if (today === 'true') {
      conditions.push(`f.scheduled_date = CURRENT_DATE`);
    }
    if (this_week === 'true') {
      conditions.push(`f.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const allowedSorts = ['scheduled_date','created_at','status','type'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'scheduled_date';

    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM followups f ${where}`, params),
      query(
        `SELECT f.*,
                l.name         as lead_name,
                l.mobile       as lead_mobile,
                l.email        as lead_email,
                l.lead_number,
                l.status       as lead_status,
                l.priority     as lead_priority,
                l.city,
                l.project_type,
                l.temperature,
                l.score,
                l.at_risk,
                l.suggested_action,
                l.last_response_date,
                l.budget_max
         FROM followups f
         JOIN leads l ON f.lead_id = l.id
         ${where}
         ORDER BY f.${sortCol} ${order === 'DESC' ? 'DESC' : 'ASC'}
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, parseInt(limit), offset]
      ),
    ]);

    // Aggregated counts for dashboard banner
    const statsRes = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status='pending' AND scheduled_date = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE status='pending' AND scheduled_date < CURRENT_DATE) as overdue,
        COUNT(*) FILTER (WHERE status='pending' AND scheduled_date BETWEEN CURRENT_DATE+1 AND CURRENT_DATE+7) as this_week,
        COUNT(*) FILTER (WHERE status='completed' AND DATE_TRUNC('month',completed_at)=DATE_TRUNC('month',NOW())) as completed_month,
        COUNT(*) FILTER (WHERE status='pending') as total_pending
       FROM followups WHERE user_id = $1`,
      [uid]
    );

    res.json({
      success: true,
      data: dataRes.rows,
      stats: statsRes.rows[0],
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    logger.error('Get followups error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch follow-ups' });
  }
};

// ─── CREATE FOLLOW-UP ─────────────────────────────────────────
const createFollowup = async (req, res) => {
  const { lead_id, scheduled_date, scheduled_time, type = 'call', notes, priority = 'medium' } = req.body;
  if (!lead_id || !scheduled_date) {
    return res.status(400).json({ success: false, message: 'lead_id and scheduled_date are required' });
  }
  try {
    // Verify lead belongs to user
    const leadRes = await query('SELECT id,name FROM leads WHERE id=$1 AND user_id=$2', [lead_id, req.user.id]);
    if (!leadRes.rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });

    const result = await query(
      `INSERT INTO followups (lead_id, user_id, scheduled_date, scheduled_time, type, notes, priority, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [lead_id, req.user.id, scheduled_date, scheduled_time||null, type, notes||null, priority, req.user.id]
    );

    // Update lead next_followup_date if this is sooner
    await query(
      `UPDATE leads SET next_followup_date = LEAST(COALESCE(next_followup_date,'9999-12-31'::date), $1)
       WHERE id = $2`,
      [scheduled_date, lead_id]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Follow-up created' });
  } catch (err) {
    logger.error('Create followup error:', err);
    res.status(500).json({ success: false, message: 'Failed to create follow-up' });
  }
};

// ─── COMPLETE FOLLOW-UP (with outcome + auto-reschedule) ──────
const completeFollowup = async (req, res) => {
  const {
    outcome,           // 'interested' | 'not_interested' | 'callback' | 'no_answer' | 'busy' | 'converted'
    outcome_notes,     // free text notes about what happened
    reschedule,        // boolean — should we auto-schedule next?
    reschedule_days,   // override days for next follow-up
    reschedule_type,   // override type for next follow-up
    update_lead_status,// optional: new lead status to set
  } = req.body;

  try {
    // Get follow-up + lead details
    const fRes = await query(
      `SELECT f.*, l.name as lead_name, l.priority, l.status as lead_status
       FROM followups f JOIN leads l ON f.lead_id = l.id
       WHERE f.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!fRes.rows.length) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    const followup = fRes.rows[0];

    // Mark as completed
    await query(
      `UPDATE followups SET status='completed', outcome=$1, outcome_notes=$2, completed_at=NOW()
       WHERE id=$3`,
      [outcome||null, outcome_notes||null, req.params.id]
    );

    // Optionally update lead status
    if (update_lead_status) {
      await query(
        `UPDATE leads SET status=$1, last_contacted_at=NOW() WHERE id=$2`,
        [update_lead_status, followup.lead_id]
      );
    }

    let nextFollowup = null;

    // Auto-reschedule next follow-up
    if (reschedule !== false && !['converted','not_interested'].includes(outcome)) {
      // Determine days and type for next follow-up
      const priority = followup.priority || 'medium';
      const currentLeadStatus = update_lead_status || followup.lead_status;
      const defaultDays = FOLLOWUP_SCHEDULE[priority]?.[currentLeadStatus] || 7;
      const days = reschedule_days ? parseInt(reschedule_days) : defaultDays;
      const nextType = reschedule_type || FOLLOWUP_TYPE_MAP[currentLeadStatus] || 'call';

      // Special outcome-based overrides
      const outcomeOverride = {
        'no_answer':   { days: 1, type: 'call' },
        'busy':        { days: 1, type: 'whatsapp' },
        'callback':    { days: 2, type: followup.type },
        'interested':  { days: 3, type: 'call' },
      };
      const override = outcomeOverride[outcome] || {};
      const finalDays = reschedule_days ? days : (override.days || days);
      const finalType = reschedule_type || override.type || nextType;

      const nextDate = addBusinessDays(new Date(), finalDays);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const nextRes = await query(
        `INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, priority, created_by, auto_created)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING *`,
        [
          followup.lead_id, req.user.id, nextDateStr, finalType,
          `Re-scheduled after ${outcome || 'completion'} — was: ${followup.notes || ''}`,
          priority, req.user.id,
        ]
      );
      nextFollowup = nextRes.rows[0];

      // Update lead next_followup_date
      await query(
        `UPDATE leads SET next_followup_date = $1 WHERE id = $2`,
        [nextDateStr, followup.lead_id]
      );

      await createNotification({
        userId: req.user.id,
        type: 'followup_reminder',
        title: 'Next Follow-up Scheduled',
        message: `${finalType} with ${followup.lead_name} on ${nextDate.toLocaleDateString('en-IN')} (${finalDays} days)`,
        data: { leadId: followup.lead_id },
        actionUrl: `/leads/${followup.lead_id}`,
      });
    }

    res.json({
      success: true,
      message: 'Follow-up completed',
      data: { completed_id: req.params.id, next_followup: nextFollowup },
    });
  } catch (err) {
    logger.error('Complete followup error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete follow-up' });
  }
};

// ─── UPDATE FOLLOW-UP ─────────────────────────────────────────
const updateFollowup = async (req, res) => {
  const { scheduled_date, scheduled_time, type, notes, status, priority } = req.body;
  try {
    const result = await query(
      `UPDATE followups SET
        scheduled_date = COALESCE($1, scheduled_date),
        scheduled_time = COALESCE($2, scheduled_time),
        type           = COALESCE($3, type),
        notes          = COALESCE($4, notes),
        status         = COALESCE($5, status),
        priority       = COALESCE($6, priority)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [scheduled_date, scheduled_time, type, notes, status, priority, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
};

// ─── DELETE / CANCEL FOLLOW-UP ────────────────────────────────
const deleteFollowup = async (req, res) => {
  try {
    await query(
      `UPDATE followups SET status='cancelled' WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Follow-up cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel' });
  }
};

// ─── GET FOLLOW-UP SCHEDULE PREVIEW ──────────────────────────
// Returns what auto-schedule would look like for a given priority+status
const getSchedulePreview = async (req, res) => {
  const { priority = 'medium', status = 'new_lead' } = req.query;

  const schedule = Object.entries(FOLLOWUP_SCHEDULE).map(([p, statuses]) => ({
    priority: p,
    statuses: Object.entries(statuses).map(([s, days]) => ({
      status: s,
      days,
      type: FOLLOWUP_TYPE_MAP[s],
      next_date: addBusinessDays(new Date(), days).toLocaleDateString('en-IN'),
    })),
  }));

  res.json({ success: true, data: schedule, matrix: FOLLOWUP_SCHEDULE, type_map: FOLLOWUP_TYPE_MAP });
};

// ─── BULK MARK OVERDUE AS MISSED ─────────────────────────────
const markOverdueMissed = async (req, res) => {
  try {
    const result = await query(
      `UPDATE followups SET status='missed'
       WHERE user_id=$1 AND status='pending' AND scheduled_date < CURRENT_DATE
       RETURNING id, lead_id`,
      [req.user.id]
    );
    res.json({ success: true, message: `Marked ${result.rowCount} follow-up(s) as missed`, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update overdue follow-ups' });
  }
};

module.exports = {
  getFollowups, createFollowup, completeFollowup,
  updateFollowup, deleteFollowup, getSchedulePreview, markOverdueMissed
};
