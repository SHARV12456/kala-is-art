// ============================================================
// KALA IS ART - Remaining Routes (clients, followups, notifications, documents, admin, user, payment, settings)
// ============================================================
const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate, requireSubscription, requireAdmin } = require('../middleware/auth.middleware');
const { getNotifications, markAsRead, markAllAsRead } = require('../utils/notification');
const { upload } = require('../middleware/upload.middleware');
const { logActivity, getTimeline } = require('../controllers/activity.controller');
const { scoreLead, rescoreAllLeads } = require('../utils/leadScoring');
const logger = require('../config/logger');

// ─── CLIENT ROUTES ────────────────────────────────────────────
const clientRouter = require('express').Router();
clientRouter.use(authenticate, requireSubscription);

clientRouter.get('/', async (req, res) => {
  try {
    const userFilter = req.user.role !== 'super_admin' ? `WHERE c.user_id = $1` : '';
    const params = req.user.role !== 'super_admin' ? [req.user.id] : [];
    const result = await query(
      `SELECT c.*, 
              COUNT(DISTINCT p.id) as project_count,
              COUNT(DISTINCT d.id) as document_count
       FROM clients c
       LEFT JOIN projects p ON p.client_id = c.id
       LEFT JOIN documents d ON d.client_id = c.id
       ${userFilter}
       GROUP BY c.id ORDER BY c.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch clients' });
  }
});

clientRouter.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, 
              json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL) as projects,
              json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL) as documents,
              (SELECT json_build_object(
                  'lead_id', l.id,
                  'source', l.lead_source,
                  'budget_min', l.budget_min,
                  'budget_max', l.budget_max,
                  'notes', l.notes,
                  'created_at', l.created_at,
                  'followups', (
                      SELECT json_agg(f.* ORDER BY f.created_at DESC)
                      FROM followups f WHERE f.lead_id = l.id
                  )
              ) FROM leads l WHERE l.id = c.lead_id) as lead_history
       FROM clients c
       LEFT JOIN projects p ON p.client_id = c.id
       LEFT JOIN documents d ON d.client_id = c.id
       WHERE c.id = $1 GROUP BY c.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch client' });
  }
});

clientRouter.post('/', async (req, res) => {
  const { name, mobile, email, address, city, area, gst_number, notes } = req.body;
  try {
    const result = await query(
      `INSERT INTO clients (user_id, name, mobile, email, address, city, area, gst_number, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, mobile, email || null, address || null, city || null, area || null, gst_number || null, notes || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

clientRouter.put('/:id', async (req, res) => {
  const { name, mobile, email, address, city, area, gst_number, notes } = req.body;
  try {
    const result = await query(
      `UPDATE clients SET name=COALESCE($1,name), mobile=COALESCE($2,mobile), email=COALESCE($3,email),
       address=COALESCE($4,address), city=COALESCE($5,city), area=COALESCE($6,area),
       gst_number=COALESCE($7,gst_number), notes=COALESCE($8,notes)
       WHERE id=$9 RETURNING *`,
      [name, mobile, email, address, city, area, gst_number, notes, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// ─── FOLLOW-UP ROUTES ─────────────────────────────────────────
const followupRouter = require('express').Router();
const followupCtrl = require('../controllers/followup.controller');
followupRouter.use(authenticate, requireSubscription);

// Schedule preview (no params needed)
followupRouter.get('/schedule-preview', followupCtrl.getSchedulePreview);

// Main CRUD
followupRouter.get('/',       followupCtrl.getFollowups);
followupRouter.post('/',      followupCtrl.createFollowup);
followupRouter.put('/:id',    followupCtrl.updateFollowup);
followupRouter.delete('/:id', followupCtrl.deleteFollowup);

// Smart completion with auto-reschedule
followupRouter.patch('/:id/complete', followupCtrl.completeFollowup);

// Bulk mark overdue as missed
followupRouter.post('/mark-overdue-missed', followupCtrl.markOverdueMissed);



// ─── NOTIFICATION ROUTES ──────────────────────────────────────
const notificationRouter = require('express').Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await getNotifications(req.user.id, parseInt(limit), offset);
    const unreadResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({
      success: true,
      data: notifications,
      unreadCount: parseInt(unreadResult.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

notificationRouter.patch('/:id/read', async (req, res) => {
  try {
    await markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark notification' });
  }
});

notificationRouter.patch('/mark-all-read', async (req, res) => {
  try {
    await markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications' });
  }
});

// ─── DOCUMENT ROUTES ──────────────────────────────────────────
const documentRouter = require('express').Router();
documentRouter.use(authenticate, requireSubscription);

documentRouter.get('/', async (req, res) => {
  try {
    const { client_id, project_id, lead_id } = req.query;
    const conditions = ['user_id = $1'];
    const params = [req.user.id];
    let idx = 2;

    if (client_id) { conditions.push(`client_id = $${idx++}`); params.push(client_id); }
    if (project_id) { conditions.push(`project_id = $${idx++}`); params.push(project_id); }
    if (lead_id) { conditions.push(`lead_id = $${idx++}`); params.push(lead_id); }

    const result = await query(
      `SELECT * FROM documents WHERE ${conditions.join(' AND ')} ORDER BY uploaded_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

documentRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { client_id, project_id, lead_id, name, description, category } = req.body;
    const fileUrl = `/uploads/${req.file.path.replace(/\\/g, '/').split('uploads/')[1]}`;

    const result = await query(
      `INSERT INTO documents (user_id, client_id, project_id, lead_id, name, original_name, 
        file_path, file_url, file_type, file_size, mime_type, category, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        req.user.id, client_id || null, project_id || null, lead_id || null,
        name || req.file.originalname, req.file.originalname,
        req.file.path, fileUrl, req.file.mimetype.split('/')[1],
        req.file.size, req.file.mimetype, category || 'general', description || null,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'File uploaded successfully' });
  } catch (error) {
    logger.error('Document upload error:', error);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

documentRouter.delete('/:id', async (req, res) => {
  try {
    const fs = require('fs');
    const docResult = await query('SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!docResult.rows.length) return res.status(404).json({ success: false, message: 'Document not found' });

    // Delete file from disk
    if (fs.existsSync(docResult.rows[0].file_path)) {
      fs.unlinkSync(docResult.rows[0].file_path);
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────
const adminRouter = require('express').Router();
adminRouter.use(authenticate, requireAdmin);

// ── List users ───────────────────────────────────────────────
adminRouter.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 25, search, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = ['super_admin'];
    const conditions = ['role != $1'];

    if (search) {
      conditions.push(`(email ILIKE $${params.length + 1} OR owner_name ILIKE $${params.length + 1} OR business_name ILIKE $${params.length + 1} OR mobile ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (status && ['active', 'payment_due', 'suspended', 'disabled'].includes(status)) {
      conditions.push(`account_status = $${params.length + 1}`);
      params.push(status);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [users, countRes] = await Promise.all([
      query(
        `SELECT id, owner_name, business_name, email, mobile,
                is_active, is_email_verified, account_status,
                admin_notes, renewal_date, last_login_at, created_at,
                last_status_change_at
         FROM users ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM users ${where}`, params),
    ]);

    res.json({
      success: true,
      data: users.rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error('Admin getUsers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// ── Set account status (activate/payment_due/suspend/disable) ─
adminRouter.patch('/users/:id/account-status', async (req, res) => {
  const { status, note } = req.body;
  const validStatuses = ['active', 'payment_due', 'suspended', 'disabled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  try {
    // Get old status for audit
    const current = await query('SELECT account_status, email FROM users WHERE id = $1', [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const oldStatus = current.rows[0].account_status;

    // Update status + timestamp
    const result = await query(
      `UPDATE users
       SET account_status = $1,
           last_status_change_at = NOW(),
           last_status_changed_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND role != 'super_admin'
       RETURNING id, email, account_status`,
      [status, req.user.id, req.params.id]
    );

    // Write audit log
    await query(
      `INSERT INTO account_status_logs (user_id, changed_by, old_status, new_status, note, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, req.user.id, oldStatus, status, note || null, req.ip]
    );

    res.json({
      success: true,
      message: `Account status set to "${status}"`,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Admin setStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update account status' });
  }
});

// ── Update admin notes + renewal date ────────────────────────
adminRouter.patch('/users/:id/notes', async (req, res) => {
  const { admin_notes, renewal_date } = req.body;
  try {
    const result = await query(
      `UPDATE users SET admin_notes = $1, renewal_date = $2, updated_at = NOW()
       WHERE id = $3 RETURNING id, admin_notes, renewal_date`,
      [admin_notes || null, renewal_date || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Notes updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notes' });
  }
});

// ── Manually verify email ─────────────────────────────────────
adminRouter.patch('/users/:id/verify-email', async (req, res) => {
  try {
    const result = await query(
      `UPDATE users SET is_email_verified = TRUE, email_verified_at = NOW()
       WHERE id = $1 RETURNING id, email, is_email_verified`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Email verified', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
});

// ── Get status change audit log for a user ───────────────────
adminRouter.get('/users/:id/status-log', async (req, res) => {
  try {
    const result = await query(
      `SELECT asl.*, u.owner_name as changed_by_name
       FROM account_status_logs asl
       LEFT JOIN users u ON asl.changed_by = u.id
       WHERE asl.user_id = $1
       ORDER BY asl.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch status log' });
  }
});

// ── Upcoming renewals dashboard widget ───────────────────────
adminRouter.get('/renewals', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, owner_name, business_name, email, mobile, account_status,
              renewal_date, admin_notes,
              renewal_date - CURRENT_DATE AS days_remaining
       FROM users
       WHERE role != 'super_admin'
         AND renewal_date IS NOT NULL
         AND renewal_date >= CURRENT_DATE
       ORDER BY renewal_date ASC
       LIMIT 20`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch renewals' });
  }
});

// ── Revenue / stats overview ──────────────────────────────────
adminRouter.get('/revenue', async (req, res) => {
  try {
    const statsResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE role != 'super_admin')           AS total_users,
         COUNT(*) FILTER (WHERE account_status = 'active')       AS active_users,
         COUNT(*) FILTER (WHERE account_status = 'payment_due')  AS payment_due_users,
         COUNT(*) FILTER (WHERE account_status = 'suspended')    AS suspended_users,
         COUNT(*) FILTER (WHERE account_status = 'disabled')     AS disabled_users
       FROM users WHERE role != 'super_admin'`
    );
    res.json({ success: true, data: { stats: statsResult.rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ── Activity / audit logs ─────────────────────────────────────
adminRouter.get('/activity-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(
      `SELECT al.*, u.email, u.owner_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});


// ─── USER ROUTES ──────────────────────────────────────────────
const userRouter = require('express').Router();
userRouter.use(authenticate);

userRouter.put('/profile', async (req, res) => {
  const { owner_name, business_name, mobile, gst_number, brand_tagline, address } = req.body;
  try {
    const result = await query(
      `UPDATE users SET owner_name=COALESCE($1,owner_name), business_name=COALESCE($2,business_name),
       mobile=COALESCE($3,mobile), gst_number=COALESCE($4,gst_number), brand_tagline=COALESCE($5,brand_tagline), address=COALESCE($6,address)
       WHERE id=$7 RETURNING id, owner_name, business_name, email, mobile, gst_number, brand_tagline, address`,
      [owner_name, business_name, mobile, gst_number, brand_tagline, address, req.user.id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ─── PAYMENT ROUTES ───────────────────────────────────────────
const paymentRouter = require('express').Router();
paymentRouter.use(authenticate);
paymentRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// ─── SETTINGS ROUTES ──────────────────────────────────────────
const settingsRouter = require('express').Router();
settingsRouter.use(authenticate);

settingsRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT key, value FROM settings WHERE user_id = $1',
      [req.user.id]
    );
    const settings = result.rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

settingsRouter.post('/', async (req, res) => {
  const { key, value } = req.body;
  try {
    await query(
      `INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET value = $3, updated_at = NOW()`,
      [req.user.id, key, JSON.stringify(value)]
    );
    res.json({ success: true, message: 'Setting saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save setting' });
  }
});

// ─── ACTIVITY TIMELINE ROUTES ────────────────────────────────
const activityRouter = require('express').Router();
activityRouter.use(authenticate, requireSubscription);
activityRouter.get('/:leadId',  getTimeline);
activityRouter.post('/',        logActivity);

// ─── PRIORITY DASHBOARD ROUTE ────────────────────────────────
const priorityRouter = require('express').Router();
priorityRouter.use(authenticate);

priorityRouter.get('/', async (req, res) => {
  const uid = req.user.id;
  try {
    const [hotLeads, atRisk, todayFU, overdueFU, warmLeads, suggestions] = await Promise.all([
      // Hot leads
      query(`SELECT l.id,l.name,l.mobile,l.score,l.temperature,l.status,l.suggested_action,
                    l.last_response_date,l.next_followup_date,l.lead_number
             FROM leads l WHERE l.user_id=$1 AND l.temperature='hot' AND l.is_archived=FALSE
               AND l.status NOT IN ('won','lost') ORDER BY l.score DESC LIMIT 10`, [uid]),

      // At-risk leads
      query(`SELECT l.id,l.name,l.mobile,l.score,l.temperature,l.status,l.lead_number
             FROM leads l WHERE l.user_id=$1 AND l.at_risk=TRUE AND l.is_archived=FALSE
               AND l.status NOT IN ('won','lost') ORDER BY l.score DESC LIMIT 5`, [uid]),

      // Today's follow-ups
      query(`SELECT f.id,f.type,f.scheduled_time,f.notes,l.name as lead_name,l.mobile,
                    l.temperature,l.score,f.lead_id
             FROM followups f JOIN leads l ON f.lead_id=l.id
             WHERE f.user_id=$1 AND f.scheduled_date=CURRENT_DATE AND f.status='pending'
             ORDER BY l.score DESC, f.scheduled_time ASC NULLS LAST`, [uid]),

      // Overdue follow-ups
      query(`SELECT f.id,f.type,f.scheduled_date,l.name as lead_name,l.mobile,l.temperature,f.lead_id,
                    CURRENT_DATE-f.scheduled_date as days_overdue
             FROM followups f JOIN leads l ON f.lead_id=l.id
             WHERE f.user_id=$1 AND f.scheduled_date<CURRENT_DATE AND f.status='pending'
             ORDER BY f.scheduled_date ASC LIMIT 10`, [uid]),

      // Warm leads - no followup in 5+ days
      query(`SELECT l.id,l.name,l.mobile,l.score,l.temperature,l.status,l.last_response_date,l.lead_number
             FROM leads l WHERE l.user_id=$1 AND l.temperature='warm' AND l.is_archived=FALSE
               AND l.status NOT IN ('won','lost')
               AND (l.next_followup_date IS NULL OR l.next_followup_date <= CURRENT_DATE+1)
             ORDER BY l.score DESC LIMIT 5`, [uid]),

      // Leads needing action (suggested_action is set)
      query(`SELECT l.id,l.name,l.mobile,l.score,l.temperature,l.status,l.suggested_action,l.lead_number
             FROM leads l WHERE l.user_id=$1 AND l.suggested_action IS NOT NULL
               AND l.is_archived=FALSE AND l.status NOT IN ('won','lost')
             ORDER BY l.score DESC LIMIT 8`, [uid]),
    ]);

    res.json({
      success: true,
      data: {
        hot_leads:     hotLeads.rows,
        at_risk:       atRisk.rows,
        todays_followups: todayFU.rows,
        overdue_followups: overdueFU.rows,
        warm_leads:    warmLeads.rows,
        needs_action:  suggestions.rows,
        summary: {
          hot:     hotLeads.rows.length,
          at_risk: atRisk.rows.length,
          today:   todayFU.rows.length,
          overdue: overdueFU.rows.length,
          warm:    warmLeads.rows.length,
        },
      },
    });
  } catch (err) {
    logger.error('Priority dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load priority data' });
  }
});

// Force rescore (admin)
priorityRouter.post('/rescore', async (req, res) => {
  const count = await rescoreAllLeads();
  res.json({ success: true, message: `Rescored ${count} leads` });
});

// Export all routers
module.exports = {
  clientRouter,
  followupRouter,
  notificationRouter,
  documentRouter,
  adminRouter,
  userRouter,
  paymentRouter,
  settingsRouter,
  activityRouter,
  priorityRouter,
};
