// ============================================================
// KALA IS ART - Communications Controller
// Full communication center: WhatsApp, Email, Call, Timeline
// ============================================================
const { query } = require('../config/database');
const { generateMessage, getStage, STAGE_LABELS } = require('../utils/messageGenerator');
const { scoreLead } = require('../utils/leadScoring');
const { logActivityInternal } = require('./activity.controller');
const { sendEmail } = require('../utils/email');
const logger = require('../config/logger');

// ─── GET COMMUNICATION CONTEXT (for follow-up card) ──────────
const getFollowupContext = async (req, res) => {
  const { leadId } = req.params;
  try {
    // Get full lead details
    const leadRes = await query(
      `SELECT l.*,
              (SELECT json_agg(c ORDER BY c.sent_at DESC) FROM communications c WHERE c.lead_id=l.id LIMIT 5) as recent_comms,
              (SELECT json_agg(f ORDER BY f.scheduled_date DESC) FROM followups f WHERE f.lead_id=l.id LIMIT 3) as recent_followups
       FROM leads l WHERE l.id=$1 AND l.user_id=$2`,
      [leadId, req.user.id]
    );
    if (!leadRes.rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });

    const lead = leadRes.rows[0];
    const stage = getStage(lead);

    // Get communication stats
    const statsRes = await query(
      `SELECT
        COUNT(*) FILTER (WHERE channel='whatsapp') as whatsapp_count,
        COUNT(*) FILTER (WHERE channel='email') as email_count,
        COUNT(*) FILTER (WHERE channel='call') as call_count,
        COUNT(*) FILTER (WHERE status='replied') as replies,
        MAX(sent_at) as last_comm_at
       FROM communications WHERE lead_id=$1`,
      [leadId]
    );

    res.json({
      success: true,
      data: {
        lead,
        stage,
        stage_label: STAGE_LABELS[stage] || stage,
        comm_stats: statsRes.rows[0],
        suggested_channel: lead.temperature === 'hot' ? 'call' : 'whatsapp',
      },
    });
  } catch (err) {
    logger.error('Get context error:', err);
    res.status(500).json({ success: false, message: 'Failed to load context' });
  }
};

// ─── GENERATE MESSAGE (AI-powered, context-aware) ────────────
const generateFollowupMessage = async (req, res) => {
  const { leadId, channel = 'whatsapp', stage: customStage } = req.body;
  try {
    const leadRes = await query('SELECT * FROM leads WHERE id=$1 AND user_id=$2', [leadId, req.user.id]);
    if (!leadRes.rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });

    const lead = leadRes.rows[0];
    const result = generateMessage(lead, channel, customStage || null);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Message generation failed' });
  }
};

// ─── LOG WHATSAPP (opens wa.me + logs to DB) ─────────────────
const logWhatsapp = async (req, res) => {
  const { lead_id, followup_id, message, status = 'sent' } = req.body;
  if (!lead_id || !message) return res.status(400).json({ success: false, message: 'lead_id and message required' });
  try {
    const leadRes = await query('SELECT * FROM leads WHERE id=$1', [lead_id]);
    if (!leadRes.rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    const lead = leadRes.rows[0];

    // Log communication
    const comm = await query(
      `INSERT INTO communications (lead_id, followup_id, user_id, channel, message, status, message_generated_by)
       VALUES ($1,$2,$3,'whatsapp',$4,$5,'template') RETURNING *`,
      [lead_id, followup_id || null, req.user.id, message, status]
    );

    // Update lead interaction
    const today = new Date().toISOString().split('T')[0];
    await query(`UPDATE leads SET last_whatsapp_date=$1, last_contacted_at=NOW() WHERE id=$2`, [today, lead_id]);

    // Log activity
    await logActivityInternal({
      lead_id, user_id: req.user.id,
      activity_type: 'whatsapp',
      title: 'WhatsApp message sent',
      description: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      outcome: status,
    });

    // Re-score
    await scoreLead(lead_id, req.user.id);

    // Return wa.me URL
    const mobile = lead.mobile?.replace(/\D/g, '');
    const waUrl = `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;

    res.json({ success: true, data: { comm: comm.rows[0], wa_url: waUrl } });
  } catch (err) {
    logger.error('WhatsApp log error:', err);
    res.status(500).json({ success: false, message: 'Failed to log WhatsApp' });
  }
};

// ─── SEND EMAIL ───────────────────────────────────────────────
const sendFollowupEmail = async (req, res) => {
  const { lead_id, followup_id, subject, body, to_email } = req.body;
  if (!lead_id || !subject || !body) return res.status(400).json({ success: false, message: 'lead_id, subject, body required' });
  try {
    const leadRes = await query('SELECT * FROM leads WHERE id=$1', [lead_id]);
    if (!leadRes.rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    const lead = leadRes.rows[0];
    const recipient = to_email || lead.email;
    if (!recipient) return res.status(400).json({ success: false, message: 'No email address on file for this lead' });

    // Log to DB first
    const comm = await query(
      `INSERT INTO communications (lead_id, followup_id, user_id, channel, subject, message, status, message_generated_by)
       VALUES ($1,$2,$3,'email',$4,$5,'sent','template') RETURNING *`,
      [lead_id, followup_id || null, req.user.id, subject, body]
    );

    // Send via SMTP
    try {
      await sendEmail({ to: recipient, subject, html: body.replace(/\n/g, '<br>') });
      await query(`UPDATE communications SET status='sent', sent_at=NOW() WHERE id=$1`, [comm.rows[0].id]);
    } catch (mailErr) {
      logger.warn('Email send failed:', mailErr.message);
      await query(`UPDATE communications SET status='failed' WHERE id=$1`, [comm.rows[0].id]);
      // Don't fail the request — still logged
    }

    // Update lead
    const today = new Date().toISOString().split('T')[0];
    await query(`UPDATE leads SET last_email_date=$1, last_contacted_at=NOW() WHERE id=$2`, [today, lead_id]);

    await logActivityInternal({
      lead_id, user_id: req.user.id,
      activity_type: 'email',
      title: `Email: ${subject}`,
      description: body.slice(0, 120),
      outcome: 'sent',
    });

    await scoreLead(lead_id, req.user.id);

    res.json({ success: true, data: comm.rows[0], message: 'Email sent and logged' });
  } catch (err) {
    logger.error('Send email error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// ─── LOG CALL OUTCOME ─────────────────────────────────────────
const logCall = async (req, res) => {
  const {
    lead_id, followup_id,
    status,          // connected | no_answer | busy | callback
    outcome,         // interested | not_interested | meeting_scheduled | callback | site_visit_scheduled
    notes,
    duration_seconds,
    next_followup_days,
    next_followup_type,
  } = req.body;
  if (!lead_id || !status) return res.status(400).json({ success: false, message: 'lead_id and status required' });
  try {
    // Log communication
    const comm = await query(
      `INSERT INTO communications (lead_id, followup_id, user_id, channel, status, outcome, outcome_notes, call_duration_seconds, message)
       VALUES ($1,$2,$3,'call',$4,$5,$6,$7,$8) RETURNING *`,
      [lead_id, followup_id || null, req.user.id, status, outcome || null, notes || null, duration_seconds || null,
       `Call - ${status}${outcome ? ` - ${outcome}` : ''}${notes ? `. ${notes}` : ''}`]
    );

    // Update lead
    const today = new Date().toISOString().split('T')[0];
    const updates = [`last_call_date='${today}'`, `last_contacted_at=NOW()`];
    if (status === 'connected') updates.push(`last_response_date='${today}'`);
    await query(`UPDATE leads SET ${updates.join(',')} WHERE id=$1`, [lead_id]);

    // Handle outcome-based actions
    if (outcome === 'meeting_scheduled') {
      await query(`UPDATE leads SET last_meeting_date='${today}' WHERE id=$1`, [lead_id]);
    }

    await logActivityInternal({
      lead_id, user_id: req.user.id,
      activity_type: 'call',
      title: `Call ${status}${outcome ? ` — ${outcome.replace(/_/g,' ')}` : ''}`,
      description: notes || `Call ${status} with ${outcome || 'no outcome'}`,
      outcome,
    });

    // Auto-schedule next follow-up
    let nextFollowup = null;
    if (next_followup_days && next_followup_days > 0) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + parseInt(next_followup_days));
      const nextRes = await query(
        `INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, created_by, auto_created)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING *`,
        [lead_id, req.user.id, nextDate.toISOString().split('T')[0],
         next_followup_type || 'call', `Post-call follow-up: ${outcome || status}`, req.user.id]
      );
      nextFollowup = nextRes.rows[0];
      await query(`UPDATE leads SET next_followup_date=$1 WHERE id=$2`, [nextDate.toISOString().split('T')[0], lead_id]);
    }

    await scoreLead(lead_id, req.user.id);

    res.json({ success: true, data: { comm: comm.rows[0], next_followup: nextFollowup } });
  } catch (err) {
    logger.error('Log call error:', err);
    res.status(500).json({ success: false, message: 'Failed to log call' });
  }
};

// ─── GET COMMUNICATION HISTORY ────────────────────────────────
const getHistory = async (req, res) => {
  const { leadId } = req.params;
  try {
    const result = await query(
      `SELECT c.*, u.owner_name as sent_by
       FROM communications c
       LEFT JOIN users u ON c.user_id=u.id
       WHERE c.lead_id=$1
       ORDER BY c.sent_at DESC
       LIMIT 30`,
      [leadId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
};

// ─── COMMUNICATION ANALYTICS ─────────────────────────────────
const getAnalytics = async (req, res) => {
  const uid = req.user.id;
  const { days = 30 } = req.query;
  try {
    const [summary, byChannel, byOutcome, daily] = await Promise.all([
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE channel='whatsapp') as whatsapp,
        COUNT(*) FILTER (WHERE channel='email') as email,
        COUNT(*) FILTER (WHERE channel='call') as calls,
        COUNT(*) FILTER (WHERE status='replied') as replies,
        COUNT(*) FILTER (WHERE outcome='interested') as interested,
        COUNT(*) FILTER (WHERE outcome='meeting_scheduled') as meetings
       FROM communications WHERE user_id=$1 AND sent_at >= NOW()-INTERVAL '${parseInt(days)} days'`, [uid]),

      query(`SELECT channel, COUNT(*) as n FROM communications
             WHERE user_id=$1 AND sent_at >= NOW()-INTERVAL '${parseInt(days)} days'
             GROUP BY channel ORDER BY n DESC`, [uid]),

      query(`SELECT outcome, COUNT(*) as n FROM communications
             WHERE user_id=$1 AND outcome IS NOT NULL AND sent_at >= NOW()-INTERVAL '${parseInt(days)} days'
             GROUP BY outcome ORDER BY n DESC`, [uid]),

      query(`SELECT DATE(sent_at) as date, COUNT(*) as n
             FROM communications WHERE user_id=$1 AND sent_at >= NOW()-INTERVAL '${parseInt(days)} days'
             GROUP BY DATE(sent_at) ORDER BY date`, [uid]),
    ]);

    res.json({
      success: true,
      data: {
        summary: summary.rows[0],
        by_channel: byChannel.rows,
        by_outcome: byOutcome.rows,
        daily_trend: daily.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

// ─── MARK EMAIL OPENED (tracking pixel) ──────────────────────
const markEmailOpened = async (req, res) => {
  const { id } = req.params;
  try {
    await query(`UPDATE communications SET status='opened', opened_at=NOW() WHERE id=$1 AND channel='email'`, [id]);
    // Return 1x1 transparent gif
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({ 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-cache' });
    res.send(pixel);
  } catch {
    res.status(404).end();
  }
};

module.exports = {
  getFollowupContext, generateFollowupMessage, logWhatsapp,
  sendFollowupEmail, logCall, getHistory, getAnalytics, markEmailOpened
};
