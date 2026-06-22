// ============================================================
// KALA IS ART - Estimate Controller (with PDF generation)
// ============================================================
const { query } = require('../config/database');
const { generateAndSavePDF, buildPDFBuffer } = require('../services/pdfService');
const logger = require('../config/logger');
const fs = require('fs');

// ─── GET ALL ESTIMATES ────────────────────────────────────────
const getEstimates = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.user.role !== 'super_admin') {
      conditions.push(`e.user_id = $${idx++}`);
      params.push(req.user.id);
    }
    if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }
    if (search) {
      conditions.push(`(e.estimate_number ILIKE $${idx} OR e.client_name ILIKE $${idx} OR e.project_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) FROM estimates e ${where}`, params);
    const result = await query(
      `SELECT e.* FROM estimates e ${where} ORDER BY e.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get estimates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch estimates' });
  }
};

// ─── GET SINGLE ESTIMATE ──────────────────────────────────────
const getEstimate = async (req, res) => {
  try {
    const estResult = await query(
      `SELECT e.*, u.business_name, u.email as user_email, u.mobile as user_mobile, u.gst_number as user_gst, u.brand_tagline
       FROM estimates e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 ${req.user.role !== 'super_admin' ? 'AND e.user_id = $2' : ''}`,
      req.user.role !== 'super_admin' ? [req.params.id, req.user.id] : [req.params.id]
    );

    if (!estResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    const itemsResult = await query(
      'SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY sort_order',
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...estResult.rows[0], items: itemsResult.rows },
    });
  } catch (error) {
    logger.error('Get estimate error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch estimate' });
  }
};

// ─── CREATE ESTIMATE ──────────────────────────────────────────
const createEstimate = async (req, res) => {
  const {
    client_id, lead_id, project_id,
    client_name, client_mobile, client_email, client_address,
    project_name, scope_of_work, valid_until,
    gst_percentage = 18, discount_amount = 0,
    notes, terms, items = [],
  } = req.body;

  try {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_rate), 0);
    const gst_amount = (subtotal - discount_amount) * (gst_percentage / 100);
    const grand_total = subtotal - discount_amount + gst_amount;

    const estResult = await query(
      `INSERT INTO estimates (user_id, client_id, lead_id, project_id, client_name, client_mobile,
        client_email, client_address, project_name, scope_of_work, valid_until,
        gst_percentage, gst_amount, discount_amount, subtotal, grand_total, notes, terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        req.user.id, client_id || null, lead_id || null, project_id || null,
        client_name, client_mobile || null, client_email || null, client_address || null,
        project_name || null, scope_of_work || null, valid_until || null,
        gst_percentage, gst_amount, discount_amount, subtotal, grand_total,
        notes || null, terms || null,
      ]
    );

    const estimate = estResult.rows[0];

    // Insert line items
    if (items.length > 0) {
      const itemValues = items.map((item, i) =>
        `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
      ).join(', ');

      const itemParams = items.flatMap((item, i) => [
        estimate.id,
        item.description,
        item.quantity || 1,
        item.unit_rate,
        i,
      ]);

      // Handle parameterized insert for items
      for (let i = 0; i < items.length; i++) {
        await query(
          `INSERT INTO estimate_items (estimate_id, description, material_description, quantity, unit, unit_rate, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [estimate.id, items[i].description, items[i].material_description || null,
           items[i].quantity || 1, items[i].unit || 'unit', items[i].unit_rate, i]
        );
      }
    }

    res.status(201).json({ success: true, data: estimate, message: 'Estimate created successfully' });
  } catch (error) {
    logger.error('Create estimate error:', error);
    res.status(500).json({ success: false, message: 'Failed to create estimate' });
  }
};

// ─── UPDATE ESTIMATE ──────────────────────────────────────────
const updateEstimate = async (req, res) => {
  const { client_name, client_mobile, client_email, client_address, project_name,
    scope_of_work, valid_until, gst_percentage, discount_amount, notes, terms, status, items } = req.body;

  try {
    let subtotal, gst_amount, grand_total;

    if (items) {
      subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_rate), 0);
      const gst = gst_percentage !== undefined ? gst_percentage : 18;
      const disc = discount_amount !== undefined ? discount_amount : 0;
      gst_amount = (subtotal - disc) * (gst / 100);
      grand_total = subtotal - disc + gst_amount;

      // Replace items
      await query('DELETE FROM estimate_items WHERE estimate_id = $1', [req.params.id]);
      for (let i = 0; i < items.length; i++) {
        await query(
          `INSERT INTO estimate_items (estimate_id, description, material_description, quantity, unit, unit_rate, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, items[i].description, items[i].material_description || null,
           items[i].quantity || 1, items[i].unit || 'unit', items[i].unit_rate, i]
        );
      }
    }

    const result = await query(
      `UPDATE estimates SET
        client_name = COALESCE($1, client_name),
        client_mobile = COALESCE($2, client_mobile),
        client_email = COALESCE($3, client_email),
        client_address = COALESCE($4, client_address),
        project_name = COALESCE($5, project_name),
        scope_of_work = COALESCE($6, scope_of_work),
        valid_until = COALESCE($7, valid_until),
        gst_percentage = COALESCE($8, gst_percentage),
        discount_amount = COALESCE($9, discount_amount),
        subtotal = COALESCE($10, subtotal),
        gst_amount = COALESCE($11, gst_amount),
        grand_total = COALESCE($12, grand_total),
        notes = COALESCE($13, notes),
        terms = COALESCE($14, terms),
        status = COALESCE($15, status)
       WHERE id = $16 ${req.user.role !== 'super_admin' ? 'AND user_id = $17' : ''}
       RETURNING *`,
      req.user.role !== 'super_admin'
        ? [client_name, client_mobile, client_email, client_address, project_name, scope_of_work,
           valid_until || null, gst_percentage, discount_amount, subtotal, gst_amount, grand_total,
           notes, terms, status, req.params.id, req.user.id]
        : [client_name, client_mobile, client_email, client_address, project_name, scope_of_work,
           valid_until || null, gst_percentage, discount_amount, subtotal, gst_amount, grand_total,
           notes, terms, status, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Estimate not found or unauthorized' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Estimate updated' });
  } catch (error) {
    logger.error('Update estimate error:', error);
    res.status(500).json({ success: false, message: 'Failed to update estimate' });
  }
};

// ─── GENERATE PDF (Base64 JSON Response) ────────────────────────────────────
const downloadEstimatePDF = async (req, res) => {
  try {
    // 1. Fetch estimate + items from DB
    const estResult = await query(
      `SELECT e.*, u.business_name, u.owner_name, u.mobile AS user_mobile,
              u.email AS user_email, u.gst_number AS user_gst, u.brand_tagline, u.address AS user_address
       FROM estimates e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 ${req.user.role !== 'super_admin' ? 'AND e.user_id = $2' : ''}`,
      req.user.role !== 'super_admin'
        ? [req.params.id, req.user.id]
        : [req.params.id]
    );

    if (!estResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    const itemsResult = await query(
      'SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY sort_order',
      [req.params.id]
    );

    const estimate = { ...estResult.rows[0], items: itemsResult.rows };

    // 2. Generate PDF directly to memory buffer
    const buffer = await buildPDFBuffer(estimate);

    // 3. Safe filename
    const safeName = `Estimate-${(estimate.estimate_number || 'DRAFT').replace(/[^a-zA-Z0-9\-_]/g, '_')}.pdf`;

    // 4. Return as Base64 JSON (bypasses all binary proxy/compression corruption issues)
    res.json({
      success: true,
      filename: safeName,
      base64: buffer.toString('base64'),
    });

  } catch (error) {
    logger.error('PDF generation error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate PDF: ' + error.message });
  }
};

// ─── DELETE ESTIMATE ──────────────────────────────────────────
const deleteEstimate = async (req, res) => {
  try {
    await query(
      `DELETE FROM estimates WHERE id = $1 ${req.user.role !== 'super_admin' ? 'AND user_id = $2' : ''}`,
      req.user.role !== 'super_admin' ? [req.params.id, req.user.id] : [req.params.id]
    );
    res.json({ success: true, message: 'Estimate deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete estimate' });
  }
};

module.exports = { getEstimates, getEstimate, createEstimate, updateEstimate, downloadEstimatePDF, deleteEstimate };
