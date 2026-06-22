const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { createNotification } = require('../utils/notification');
const { scoreLead } = require('../utils/leadScoring');

/**
 * Fetch and process leads from IndiaMART
 */
const syncIndiaMartLeads = async () => {
  try {
    const configResult = await query("SELECT * FROM integrations WHERE provider = 'indiamart'");
    if (!configResult.rows.length) return;
    
    const integration = configResult.rows[0];
    if (!integration.is_active || !integration.config.api_key) return;

    const apiKey = integration.config.api_key;
    
    // Calculate time range (fetch last 24 hours just in case of missing cron runs, duplicate check will protect us)
    const end = new Date();
    const start = new Date(end.getTime() - (24 * 60 * 60 * 1000));
    
    const fmt = (d) => {
      const dStr = d.toISOString().split('T')[0];
      const tStr = d.toTimeString().split(' ')[0];
      return `${dStr.split('-').reverse().join('-')} ${tStr}`; // IndiaMART expects DD-MM-YYYY HH:mm:ss
    };

    const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${apiKey}&start_time=${fmt(start)}&end_time=${fmt(end)}`;
    
    // In a real environment we would execute this:
    // const response = await axios.get(url);
    // const data = response.data;

    // For the sake of this CRM product without a live key, we simulate the API call parsing structure
    // We will parse the response exactly as IndiaMART provides it.
    let responseData = { STATUS: 'FAILED', RESPONSE: [] };
    try {
       const res = await axios.get(url, { timeout: 10000 });
       responseData = res.data;
    } catch(err) {
       // Ignore network errors in case of invalid keys during testing
       throw new Error("IndiaMART API connection failed. Check API Key.");
    }

    if (responseData.STATUS !== 'SUCCESS' || !Array.isArray(responseData.RESPONSE)) {
      throw new Error(`Invalid response from IndiaMART: ${JSON.stringify(responseData)}`);
    }

    const leads = responseData.RESPONSE;
    let importedCount = 0;
    let duplicateCount = 0;

    // Assign to Super Admin or first available user
    const adminResult = await query("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
    const adminId = adminResult.rows[0]?.id;

    for (const rawLead of leads) {
      const mobile = rawLead.SENDER_MOBILE || rawLead.SENDER_MOBILE_ALT;
      const email = rawLead.SENDER_EMAIL;
      const name = rawLead.SENDER_NAME || 'Unknown Lead';
      
      if (!mobile && !email) continue;

      // Duplicate Check
      const dupQuery = `
        SELECT id FROM leads 
        WHERE (mobile = $1 AND mobile IS NOT NULL) 
           OR (email = $2 AND email IS NOT NULL)
        LIMIT 1
      `;
      const dup = await query(dupQuery, [mobile, email]);
      
      if (dup.rows.length > 0) {
        duplicateCount++;
        // Optionally update existing lead or store activity here
        continue;
      }

      // New Lead Creation
      const notes = `Query: ${rawLead.SUBJECT || ''}\nProduct: ${rawLead.QUERY_PRODUCT_NAME || ''}\nCompany: ${rawLead.SENDER_COMPANY || ''}`;
      
      const insertQuery = `
        INSERT INTO leads (user_id, assigned_to, name, mobile, email, city, project_type, lead_source, status, notes, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const result = await query(insertQuery, [
        adminId, adminId, name, mobile, email, rawLead.SENDER_CITY, 
        rawLead.QUERY_PRODUCT_NAME || 'General Inquiry', 
        'indiamart', 'new_lead', notes, 'high' // IndiaMart leads are usually high priority
      ]);

      const newLead = result.rows[0];
      importedCount++;

      // Create initial follow-up
      const followupDate = new Date(); // Today
      const dateStr = followupDate.toISOString().split('T')[0];
      
      await query(
        `INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, created_by, auto_created)
         VALUES ($1, $2, $3, 'call', 'Call New IndiaMART Inquiry', $4, TRUE)`,
        [newLead.id, adminId, dateStr, adminId]
      );

      // Score Lead
      await scoreLead(newLead.id, adminId);
      
      // Send notification
      await createNotification({
        userId: adminId,
        type: 'new_lead',
        title: 'New IndiaMART Lead',
        message: `${name} inquired about ${rawLead.QUERY_PRODUCT_NAME}`,
        data: { leadId: newLead.id },
        actionUrl: `/leads/${newLead.id}`,
      });
    }

    // Update integration status
    await query(`
      UPDATE integrations 
      SET last_sync_at = NOW(), sync_status = 'success', error_log = NULL
      WHERE provider = 'indiamart'
    `);

    logger.info(`IndiaMART Sync: ${importedCount} imported, ${duplicateCount} duplicates skipped.`);
    return { success: true, imported: importedCount, duplicates: duplicateCount };

  } catch (error) {
    logger.error('IndiaMART Sync Error:', error);
    await query(`
      UPDATE integrations 
      SET sync_status = 'error', error_log = $1 
      WHERE provider = 'indiamart'
    `, [error.message]);
    return { success: false, message: error.message };
  }
};

module.exports = { syncIndiaMartLeads };
