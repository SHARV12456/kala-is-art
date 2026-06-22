const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireRole, requireAdmin } = require('../middleware/auth.middleware');
const { syncIndiaMartLeads } = require('../services/indiamart.service');

const { startIndiaMartScheduler } = require('../jobs/indiamartScheduler');

// Get IndiaMART Settings
router.get('/indiamart', authenticate, requireRole(['super_admin', 'business_user']), async (req, res) => {
  try {
    const result = await query("SELECT * FROM integrations WHERE provider = 'indiamart'");
    if (!result.rows.length) {
      return res.json({ success: true, data: { is_active: false, config: {} } });
    }
    const data = result.rows[0];
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch IndiaMART settings' });
  }
});

// Update IndiaMART Settings
router.post('/indiamart', authenticate, requireAdmin, async (req, res) => {
  try {
    const { api_key, is_active, sync_frequency } = req.body;
    
    await query(`
      INSERT INTO integrations (provider, config, is_active)
      VALUES ('indiamart', $1, $2)
      ON CONFLICT (provider) DO UPDATE 
      SET config = $1, is_active = $2, updated_at = NOW()
    `, [JSON.stringify({ api_key, sync_frequency }), is_active]);

    // Hot-reload the background scheduler
    await startIndiaMartScheduler();

    res.json({ success: true, message: 'IndiaMART settings saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// Trigger Manual Sync
router.post('/indiamart/sync', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await syncIndiaMartLeads();
    if (result && result.success) {
      res.json({ success: true, message: `Sync complete. ${result.imported} leads imported.` });
    } else {
      res.status(400).json({ success: false, message: result ? result.message : 'Sync failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to trigger sync' });
  }
});

module.exports = router;
