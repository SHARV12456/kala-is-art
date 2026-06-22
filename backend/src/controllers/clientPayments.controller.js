// ============================================================
// KALA IS ART - Client Payments Controller
// Tracks money received per client per project
// ============================================================
const { query } = require('../config/database');
const logger = require('../config/logger');

const METHODS = ['cash','upi','bank_transfer','cheque','card','other'];

// ─── GET PAYMENTS FOR A CLIENT ────────────────────────────────
const getClientPayments = async (req, res) => {
  try {
    const { clientId } = req.params;
    const uid = req.user.id;

    // Verify client belongs to user
    const clientRes = await query(
      `SELECT c.*, 
              p.id as project_id, p.name as project_name, p.status as project_status,
              p.estimated_value, p.actual_value, p.project_type, p.start_date, p.end_date
       FROM clients c
       LEFT JOIN projects p ON p.client_id = c.id AND p.user_id = $2
       WHERE c.id = $1 AND c.user_id = $2`,
      [clientId, uid]
    );
    if (!clientRes.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });

    const client = clientRes.rows[0];

    // Get all payments for this client
    const paymentsRes = await query(
      `SELECT cp.*,
              p.name as project_name, p.project_number,
              e.estimate_number, e.grand_total as estimate_amount
       FROM client_payments cp
       LEFT JOIN projects p ON cp.project_id = p.id
       LEFT JOIN estimates e ON cp.estimate_id = e.id
       WHERE cp.client_id = $1 AND cp.user_id = $2
       ORDER BY cp.payment_date DESC, cp.created_at DESC`,
      [clientId, uid]
    );

    // Aggregate summary
    const payments = paymentsRes.rows;
    const totalReceived  = payments.filter(p => p.status === 'received' || p.status === 'partial').reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalPending   = payments.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount), 0);
    const projectValue   = parseFloat(client.total_project_value || 0);
    const outstanding    = Math.max(0, projectValue - totalReceived);

    res.json({
      success: true,
      data: {
        client,
        payments,
        summary: {
          project_value:   projectValue,
          total_received:  totalReceived,
          total_pending:   totalPending,
          outstanding,
          payment_count:   payments.length,
          percent_paid:    projectValue > 0 ? Math.round((totalReceived / projectValue) * 100) : 0,
        },
      },
    });
  } catch (err) {
    logger.error('Get client payments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// ─── ADD PAYMENT ─────────────────────────────────────────────
const addPayment = async (req, res) => {
  const { clientId } = req.params;
  const uid = req.user.id;
  const {
    project_id, estimate_id,
    amount, payment_date, payment_method = 'cash',
    reference_number, milestone, notes, status = 'received',
  } = req.body;

  if (!amount || !payment_date) {
    return res.status(400).json({ success: false, message: 'Amount and payment date are required' });
  }
  if (payment_method && !METHODS.includes(payment_method)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

  try {
    // Verify client belongs to user
    const clientCheck = await query('SELECT id, name FROM clients WHERE id=$1 AND user_id=$2', [clientId, uid]);
    if (!clientCheck.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });

    const result = await query(
      `INSERT INTO client_payments 
        (user_id, client_id, project_id, estimate_id, amount, payment_date,
         payment_method, reference_number, milestone, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        uid, clientId,
        project_id || null, estimate_id || null,
        parseFloat(amount), payment_date,
        payment_method, reference_number || null,
        milestone || null, notes || null, status,
      ]
    );

    // Update client's total_project_value if not set
    await query(
      `UPDATE clients SET 
         total_project_value = GREATEST(COALESCE(total_project_value, 0), $1),
         updated_at = NOW()
       WHERE id = $2 AND (total_project_value IS NULL OR total_project_value = 0)`,
      [parseFloat(amount), clientId]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Payment of ₹${amount} recorded successfully`,
    });
  } catch (err) {
    logger.error('Add payment error:', err);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

// ─── UPDATE PAYMENT ───────────────────────────────────────────
const updatePayment = async (req, res) => {
  const { clientId, paymentId } = req.params;
  const uid = req.user.id;
  const { amount, payment_date, payment_method, reference_number, milestone, notes, status } = req.body;

  try {
    const result = await query(
      `UPDATE client_payments SET
         amount           = COALESCE($1, amount),
         payment_date     = COALESCE($2, payment_date),
         payment_method   = COALESCE($3, payment_method),
         reference_number = COALESCE($4, reference_number),
         milestone        = COALESCE($5, milestone),
         notes            = COALESCE($6, notes),
         status           = COALESCE($7, status),
         updated_at       = NOW()
       WHERE id=$8 AND client_id=$9 AND user_id=$10
       RETURNING *`,
      [amount, payment_date, payment_method, reference_number, milestone, notes, status, paymentId, clientId, uid]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: result.rows[0], message: 'Payment updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update payment' });
  }
};

// ─── DELETE PAYMENT ───────────────────────────────────────────
const deletePayment = async (req, res) => {
  const { clientId, paymentId } = req.params;
  const uid = req.user.id;
  try {
    await query(
      `DELETE FROM client_payments WHERE id=$1 AND client_id=$2 AND user_id=$3`,
      [paymentId, clientId, uid]
    );
    res.json({ success: true, message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete payment' });
  }
};

// ─── SET PROJECT VALUE (total contract value) ─────────────────
const setProjectValue = async (req, res) => {
  const { clientId } = req.params;
  const { total_project_value } = req.body;
  const uid = req.user.id;
  try {
    await query(
      `UPDATE clients SET total_project_value=$1 WHERE id=$2 AND user_id=$3`,
      [parseFloat(total_project_value), clientId, uid]
    );
    res.json({ success: true, message: 'Project value updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update project value' });
  }
};

module.exports = { getClientPayments, addPayment, updatePayment, deletePayment, setProjectValue };
