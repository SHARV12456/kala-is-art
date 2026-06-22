const cron = require('node-cron');
const { query } = require('../config/database');
const { syncIndiaMartLeads } = require('../services/indiamart.service');
const logger = require('../config/logger');

// Store the active cron job
let activeCronJob = null;

const startIndiaMartScheduler = async () => {
  try {
    const result = await query("SELECT * FROM integrations WHERE provider = 'indiamart'");
    if (!result.rows.length) return;
    
    const integration = result.rows[0];
    if (!integration.is_active || !integration.config.api_key) {
      if (activeCronJob) {
        activeCronJob.stop();
        activeCronJob = null;
        logger.info('IndiaMART Sync: Auto-sync disabled.');
      }
      return;
    }

    // Determine cron expression based on frequency
    const freq = integration.config.sync_frequency || 'hourly';
    let cronExpression = '0 * * * *'; // Default to hourly

    if (freq === '15min') cronExpression = '*/15 * * * *';
    if (freq === '30min') cronExpression = '*/30 * * * *';
    if (freq === 'hourly') cronExpression = '0 * * * *';

    // Stop existing job before starting a new one
    if (activeCronJob) {
      activeCronJob.stop();
    }

    activeCronJob = cron.schedule(cronExpression, async () => {
      logger.info('IndiaMART Sync: Auto-fetching leads...');
      await syncIndiaMartLeads();
    });

    logger.info(`IndiaMART Sync: Auto-sync scheduled (${freq}).`);

  } catch (error) {
    logger.error('Failed to start IndiaMART Scheduler:', error);
  }
};

module.exports = { startIndiaMartScheduler };
