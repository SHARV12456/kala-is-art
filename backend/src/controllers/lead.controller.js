// ============================================================
// KALA IS ART - Lead Management Controller
// ============================================================
const { query, transaction } = require('../config/database');
const { createNotification } = require('../utils/notification');
const { scoreLead } = require('../utils/leadScoring');
const { logActivityInternal } = require('./activity.controller');
const logger = require('../config/logger');

// ─── GET ALL LEADS ────────────────────────────────────────────
const getLeads = async (req, res) => {
  try {
    const {
      status, city, source, search, priority, active_only,
      budget_min, budget_max, date_from, date_to,
      page = 1, limit = 20, sort = 'created_at', order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Scope: business_user sees only their leads; super_admin sees all
    if (req.user.role !== 'super_admin') {
      conditions.push(`l.user_id = $${paramIdx++}`);
      params.push(req.user.id);
    }

    conditions.push('l.is_archived = FALSE');

    if (active_only === 'true') {
      conditions.push(`l.status NOT IN ('won', 'lost')`);
    }

    if (status) { conditions.push(`l.status = $${paramIdx++}`); params.push(status); }
    if (city) { conditions.push(`l.city ILIKE $${paramIdx++}`); params.push(`%${city}%`); }
    if (source) { conditions.push(`l.lead_source = $${paramIdx++}`); params.push(source); }
    if (priority) { conditions.push(`l.priority = $${paramIdx++}`); params.push(priority); }
    if (budget_min) { conditions.push(`l.budget_min >= $${paramIdx++}`); params.push(parseFloat(budget_min)); }
    if (budget_max) { conditions.push(`l.budget_max <= $${paramIdx++}`); params.push(parseFloat(budget_max)); }
    if (date_from) { conditions.push(`l.created_at >= $${paramIdx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`l.created_at <= $${paramIdx++}`); params.push(date_to); }
    if (search) {
      conditions.push(`(l.name ILIKE $${paramIdx} OR l.mobile ILIKE $${paramIdx} OR l.email ILIKE $${paramIdx} OR l.lead_number ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const allowedSorts = ['created_at', 'name', 'status', 'city', 'budget_min', 'next_followup_date'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );

    const dataResult = await query(
      `SELECT l.*, 
              u.owner_name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       ${whereClause}
       ORDER BY l.${sortCol} ${sortOrder}
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
};

// ─── GET SINGLE LEAD ──────────────────────────────────────────
const getLead = async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, 
              u.owner_name as assigned_to_name,
              json_agg(DISTINCT f.*) FILTER (WHERE f.id IS NOT NULL) as followups
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN followups f ON f.lead_id = l.id
       WHERE l.id = $1 ${req.user.role !== 'super_admin' ? 'AND l.user_id = $2' : ''}
       GROUP BY l.id, u.owner_name`,
      req.user.role !== 'super_admin' ? [req.params.id, req.user.id] : [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lead' });
  }
};

// ─── CREATE LEAD ──────────────────────────────────────────────
const createLead = async (req, res) => {
  const {
    name, mobile, email, location, city, area,
    budget_min, budget_max, project_type, lead_source,
    status = 'new_lead', notes, next_followup_date, priority = 'medium',
    assigned_to, tags,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO leads (user_id, assigned_to, name, mobile, email, location, city, area,
        budget_min, budget_max, project_type, lead_source, status, notes, 
        next_followup_date, priority, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        req.user.id, assigned_to || req.user.id, name, mobile, email || null,
        location, city, area, budget_min || null, budget_max || null,
        project_type, lead_source, status, notes || null, next_followup_date || null,
        priority, tags || [],
      ]
    );

    const lead = result.rows[0];

    // Log creation activity
    await logActivityInternal({
      lead_id: lead.id, user_id: req.user.id,
      activity_type: 'lead_created',
      title: 'Lead Created',
      description: `Lead added via ${lead_source || 'manual entry'}`,
    });

    // Auto-score new lead
    await scoreLead(lead.id, req.user.id);

    // Auto follow-up if status is 'interested'
    if (status === 'interested') {
      const followupDate = new Date();
      followupDate.setDate(followupDate.getDate() + 7);
      await query(
        `INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, created_by)
         VALUES ($1, $2, $3, 'call', 'Auto-created follow-up for interested lead', $4)`,
        [lead.id, req.user.id, followupDate.toISOString().split('T')[0], req.user.id]
      );
    }

    // Notify admin on new lead
    await createNotification({
      userId: req.user.id,
      type: 'new_lead',
      title: 'New Lead Added',
      message: `New lead ${lead.lead_number} - ${name} has been added`,
      data: { leadId: lead.id },
    });

    res.status(201).json({ success: true, data: lead, message: 'Lead created successfully' });
  } catch (error) {
    logger.error('Create lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to create lead' });
  }
};

// ─── UPDATE LEAD ──────────────────────────────────────────────
const updateLead = async (req, res) => {
  const {
    name, mobile, email, location, city, area,
    budget_min, budget_max, project_type, lead_source,
    status, notes, next_followup_date, priority, assigned_to, tags,
  } = req.body;

  try {
    // Get old lead for comparison
    const oldResult = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (!oldResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const oldLead = oldResult.rows[0];

    const result = await query(
      `UPDATE leads SET
        name = COALESCE($1, name),
        mobile = COALESCE($2, mobile),
        email = COALESCE($3, email),
        location = COALESCE($4, location),
        city = COALESCE($5, city),
        area = COALESCE($6, area),
        budget_min = COALESCE($7, budget_min),
        budget_max = COALESCE($8, budget_max),
        project_type = COALESCE($9, project_type),
        lead_source = COALESCE($10, lead_source),
        status = COALESCE($11, status),
        notes = COALESCE($12, notes),
        next_followup_date = COALESCE($13, next_followup_date),
        priority = COALESCE($14, priority),
        assigned_to = COALESCE($15, assigned_to),
        tags = COALESCE($16, tags)
       WHERE id = $17 ${req.user.role !== 'super_admin' ? 'AND user_id = $18' : ''}
       RETURNING *`,
      req.user.role !== 'super_admin'
        ? [name, mobile, email, location, city, area, budget_min, budget_max,
           project_type, lead_source, status, notes, next_followup_date, priority,
           assigned_to, tags, req.params.id, req.user.id]
        : [name, mobile, email, location, city, area, budget_min, budget_max,
           project_type, lead_source, status, notes, next_followup_date, priority,
           assigned_to, tags, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found or access denied' });
    }

    const updatedLead = result.rows[0];

    // Status-based automation + scoring
    if (status && status !== oldLead.status) {
      await handleLeadStatusChange(updatedLead, oldLead.status, status, req.user.id);
      await logActivityInternal({
        lead_id: updatedLead.id, user_id: req.user.id,
        activity_type: 'status_change',
        title: `Status changed to ${status.replace(/_/g,' ')}`,
        description: `Was: ${oldLead.status} → Now: ${status}`,
        outcome: status,
      });
    }

    // Re-score after update
    await scoreLead(updatedLead.id, req.user.id);

    res.json({ success: true, data: updatedLead, message: 'Lead updated successfully' });
  } catch (error) {
    logger.error('Update lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to update lead' });
  }
};


// ─── SMART FOLLOW-UP SCHEDULING ──────────────────────────────
/**
 * Auto-schedule interval (in days) based on lead priority + status
 * High priority = more urgent follow-up windows
 */
const FOLLOWUP_SCHEDULE = {
  // [priority]: { [status]: days_until_followup }
  high: {
    new_lead: 1, contacted: 2, interested: 3,
    follow_up: 2, proposal_sent: 2, negotiation: 1,
  },
  medium: {
    new_lead: 3, contacted: 5, interested: 7,
    follow_up: 5, proposal_sent: 4, negotiation: 3,
  },
  low: {
    new_lead: 7, contacted: 10, interested: 14,
    follow_up: 10, proposal_sent: 7, negotiation: 5,
  },
};

/**
 * Default follow-up type per status
 */
const FOLLOWUP_TYPE_MAP = {
  new_lead: 'call', contacted: 'whatsapp', interested: 'call',
  follow_up: 'call', proposal_sent: 'email', negotiation: 'meeting',
};

/**
 * Get auto-schedule days from matrix
 */
const getScheduleDays = (priority = 'medium', status = 'new_lead') => {
  const priorityMap = FOLLOWUP_SCHEDULE[priority] || FOLLOWUP_SCHEDULE.medium;
  return priorityMap[status] || 7;
};

/**
 * Add business days (skip Sundays)
 */
const addBusinessDays = (fromDate, days) => {
  const date = new Date(fromDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++; // Skip Sunday
  }
  return date;
};

const handleLeadStatusChange = async (lead, oldStatus, newStatus, userId) => {
  try {
    // States that stop follow-ups
    const stopStates = ['won', 'lost', 'not_interested'];

    if (stopStates.includes(newStatus)) {
      // Cancel all pending follow-ups
      const cancelled = await query(
        `UPDATE followups SET status = 'cancelled' WHERE lead_id = $1 AND status = 'pending' RETURNING id`,
        [lead.id]
      );
      logger.info(`Cancelled ${cancelled.rowCount} follow-ups for lead ${lead.id} (status: ${newStatus})`);

      if (newStatus === 'won') {
        await createNotification({
          userId, type: 'lead_won',
          title: '🎉 Lead Won!',
          message: `${lead.name} is now a client. All follow-ups cancelled.`,
          data: { leadId: lead.id },
          actionUrl: `/leads/${lead.id}`,
        });
      }
      return;
    }

    // States that trigger auto follow-up
    const triggerStates = ['new_lead', 'contacted', 'interested', 'follow_up', 'proposal_sent', 'negotiation'];

    if (triggerStates.includes(newStatus)) {
      const days = getScheduleDays(lead.priority, newStatus);
      const followupDate = addBusinessDays(new Date(), days);
      const followupType = FOLLOWUP_TYPE_MAP[newStatus] || 'call';
      const dateStr = followupDate.toISOString().split('T')[0];

      // Cancel existing pending follow-ups first
      await query(
        `UPDATE followups SET status = 'cancelled' WHERE lead_id = $1 AND status = 'pending'`,
        [lead.id]
      );

      // Create new auto follow-up
      await query(
        `INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, created_by, auto_created)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [
          lead.id, userId, dateStr, followupType,
          `Auto-scheduled: ${newStatus.replace(/_/g, ' ')} → ${followupType} in ${days} day${days !== 1 ? 's' : ''}`,
          userId,
        ]
      );

      // Update lead next_followup_date
      await query(
        `UPDATE leads SET next_followup_date = $1 WHERE id = $2`,
        [dateStr, lead.id]
      );

      await createNotification({
        userId, type: 'followup_reminder',
        title: 'Follow-up Scheduled',
        message: `${followupType} scheduled for ${lead.name} on ${followupDate.toLocaleDateString('en-IN')} (${days} days)`,
        data: { leadId: lead.id },
        actionUrl: `/leads/${lead.id}`,
      });

      logger.info(`Auto-scheduled ${followupType} follow-up for lead ${lead.id} on ${dateStr} (${days} days, priority: ${lead.priority})`);
    }
  } catch (err) {
    logger.error('Lead status automation error:', err);
  }
};


// ─── CONVERT TO CLIENT ────────────────────────────────────────
const convertToClient = async (req, res) => {
  try {
    const leadResult = await query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', 
      [req.params.id, req.user.id]);
    
    if (!leadResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    const result = await transaction(async (client) => {
      // Generate client_number
      const yr = new Date().getFullYear();
      const countRes = await client.query('SELECT COUNT(*) FROM clients WHERE user_id=$1', [req.user.id]);
      const nextNum = parseInt(countRes.rows[0].count) + 1;
      const client_number = `C-${yr}-${String(nextNum).padStart(4, '0')}`;

      // Create client
      const clientResult = await client.query(
        `INSERT INTO clients (user_id, lead_id, client_number, name, mobile, email, city, area, address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [req.user.id, lead.id, client_number, lead.name, lead.mobile, lead.email, lead.city, lead.area, lead.location]
      );
      const newClient = clientResult.rows[0];

      // Update lead
      await client.query(
        `UPDATE leads SET status = 'won', converted_to_client_at = NOW(), converted_client_id = $1
         WHERE id = $2`,
        [newClient.id, lead.id]
      );

      return newClient;
    });

    await handleLeadStatusChange(lead, lead.status, 'won', req.user.id);

    res.json({
      success: true,
      data: result,
      message: 'Lead successfully converted to client',
    });
  } catch (error) {
    logger.error('Convert to client error:', error);
    res.status(500).json({ success: false, message: 'Failed to convert lead to client' });
  }
};

// ─── DELETE LEAD ──────────────────────────────────────────────
const deleteLead = async (req, res) => {
  try {
    await query(
      `UPDATE leads SET is_archived = TRUE WHERE id = $1 ${req.user.role !== 'super_admin' ? 'AND user_id = $2' : ''}`,
      req.user.role !== 'super_admin' ? [req.params.id, req.user.id] : [req.params.id]
    );
    res.json({ success: true, message: 'Lead archived successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
};


// ─── EXPORT LEADS CSV ─────────────────────────────────────────
const exportLeads = async (req, res) => {
  try {
    const userFilter = req.user.role !== 'super_admin' ? `AND l.user_id = '${req.user.id}'` : '';
    const result = await query(
      `SELECT l.lead_number,l.name,l.mobile,l.email,l.city,l.area,l.lead_source,
              l.status,l.priority,l.budget_min,l.budget_max,l.project_type,
              l.next_followup_date,l.created_at
       FROM leads l WHERE l.is_archived=FALSE ${userFilter} ORDER BY l.created_at DESC`
    );

    const headers = ['Lead#','Name','Mobile','Email','City','Area','Source','Status','Priority','Budget Min','Budget Max','Project Type','Next Follow-up','Created'];
    const rows = result.rows.map(r => [
      r.lead_number, r.name, r.mobile, r.email||'', r.city||'', r.area||'',
      r.lead_source||'', r.status, r.priority, r.budget_min||'', r.budget_max||'',
      r.project_type||'', r.next_followup_date||'', new Date(r.created_at).toLocaleDateString('en-IN')
    ]);

    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Export leads error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

// ─── UPDATE LEAD STATUS ───────────────────────────────────────
const updateLeadStatus = async (req, res) => {
  const { status, lost_reason } = req.body;
  try {
    const oldResult = await query('SELECT * FROM leads WHERE id=$1', [req.params.id]);
    if (!oldResult.rows.length) return res.status(404).json({ success:false, message:'Lead not found' });
    const old = oldResult.rows[0];

    // If changing to 'won', automatically act like the convert endpoint
    if (status === 'won' && old.status !== 'won') {
      const result = await transaction(async (client) => {
        const yr = new Date().getFullYear();
        const countRes = await client.query('SELECT COUNT(*) FROM clients WHERE user_id=$1', [req.user.id]);
        const nextNum = parseInt(countRes.rows[0].count) + 1;
        const client_number = `C-${yr}-${String(nextNum).padStart(4, '0')}`;

        const clientResult = await client.query(
          `INSERT INTO clients (user_id, lead_id, client_number, name, mobile, email, city, area, address)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [req.user.id, old.id, client_number, old.name, old.mobile, old.email, old.city, old.area, old.location]
        );
        const newClient = clientResult.rows[0];

        const updatedLead = await client.query(
          `UPDATE leads SET status='won', converted_to_client_at=NOW(), converted_client_id=$1
           WHERE id=$2 RETURNING *`,
          [newClient.id, old.id]
        );
        return newClient;
      });

      await handleLeadStatusChange(old, old.status, status, req.user.id);
      return res.json({ success:true, data:result, message: 'Lead automatically converted to client' });
    }

    const result = await query(
      `UPDATE leads SET status=$1, lost_reason=$2, last_contacted_at=NOW() WHERE id=$3 AND user_id=$4 RETURNING *`,
      [status, status === 'lost' ? lost_reason : null, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success:false, message:'Access denied' });

    await handleLeadStatusChange(result.rows[0], old.status, status, req.user.id);
    res.json({ success:true, data:result.rows[0] });
  } catch (error) {
    logger.error('Update status error:', error);
    res.status(500).json({ success:false, message:'Failed to update status' });
  }
};


const getLeadStats = async (req, res) => {
  try {
    const userFilter = req.user.role !== 'super_admin' ? `AND user_id = '${req.user.id}'` : '';
    const result = await query(
      `SELECT status, COUNT(*) as count FROM leads WHERE is_archived = FALSE ${userFilter} GROUP BY status`
    );
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE is_archived = FALSE ${userFilter}`
    );
    res.json({ success: true, data: { byStatus: result.rows, total: parseInt(totalResult.rows[0].total) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch lead stats' });
  }
};

module.exports = { getLeads, getLead, createLead, updateLead, convertToClient, deleteLead, getLeadStats, exportLeads, updateLeadStatus };

