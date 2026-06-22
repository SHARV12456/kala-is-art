// ============================================================
// KALA IS ART - Activity Timeline Controller
// Every client interaction is logged and queryable
// ============================================================
const { query } = require('../config/database');
const { scoreLead } = require('../utils/leadScoring');
const logger = require('../config/logger');

/**
 * Activity types:
 * lead_created, status_change, call, whatsapp, email, meeting,
 * site_visit, estimate_sent, estimate_viewed, note, followup_completed,
 * converted, archived
 */

// ─── LOG ACTIVITY ─────────────────────────────────────────────
const logActivity = async (req, res) => {
  const {
    lead_id, activity_type, title, description,
    outcome, duration_minutes, metadata = {},
  } = req.body;

  if (!lead_id || !activity_type) {
    return res.status(400).json({ success: false, message: 'lead_id and activity_type required' });
  }

  try {
    // Verify lead belongs to user
    const leadRes = await query(
      'SELECT id, name FROM leads WHERE id=$1 AND user_id=$2',
      [lead_id, req.user.id]
    );
    if (!leadRes.rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Insert activity
    const result = await query(
      `INSERT INTO lead_activities
        (lead_id, user_id, activity_type, title, description, outcome, duration_minutes, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [lead_id, req.user.id, activity_type, title || null, description || null, outcome || null, duration_minutes || null, JSON.stringify(metadata)]
    );

    // Update lead interaction tracking columns
    const now = new Date().toISOString().split('T')[0];
    const updates = { last_contacted_at: 'NOW()' };

    if (activity_type === 'call')          { updates.last_call_date = `'${now}'`; updates.last_response_date = `'${now}'`; }
    if (activity_type === 'whatsapp')      { updates.last_whatsapp_date = `'${now}'`; if (outcome === 'replied') updates.last_response_date = `'${now}'`; }
    if (activity_type === 'email')         { updates.last_email_date = `'${now}'`; }
    if (activity_type === 'meeting')       { updates.last_meeting_date = `'${now}'`; updates.last_response_date = `'${now}'`; }
    if (activity_type === 'site_visit')    { updates.last_meeting_date = `'${now}'`; updates.last_response_date = `'${now}'`; }
    if (activity_type === 'estimate_sent') { updates.last_estimate_sent = `'${now}'`; }
    if (activity_type === 'estimate_viewed'){ updates.estimate_viewed = 'TRUE'; updates.last_response_date = `'${now}'`; }

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ');
      await query(`UPDATE leads SET ${setClauses} WHERE id=$1`, [lead_id]);
    }

    // Re-score lead after activity
    await scoreLead(lead_id, req.user.id, activity_type);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Log activity error:', err);
    res.status(500).json({ success: false, message: 'Failed to log activity' });
  }
};

// ─── GET ACTIVITY TIMELINE ────────────────────────────────────
const getTimeline = async (req, res) => {
  try {
    const result = await query(
      `SELECT
        a.*,
        u.owner_name as user_name
       FROM lead_activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = $1
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [req.params.leadId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
  }
};

// ─── INTERNAL LOGGER (used by other controllers) ──────────────
const logActivityInternal = async ({ lead_id, user_id, activity_type, title, description, outcome, metadata = {} }) => {
  try {
    await query(
      `INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, outcome, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [lead_id, user_id, activity_type, title || null, description || null, outcome || null, JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.error('Internal activity log error:', err);
  }
};

module.exports = { logActivity, getTimeline, logActivityInternal };
