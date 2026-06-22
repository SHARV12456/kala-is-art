// ============================================================
// KALA IS ART - Main Server Entry Point
// ============================================================
require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/config/logger');
const { startFollowUpScheduler } = require('./src/jobs/followupScheduler');
const { startIndiaMartScheduler } = require('./src/jobs/indiamartScheduler');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB connection
    await testConnection();
    logger.info('✅ Database connected successfully');

    // Start background jobs
    startFollowUpScheduler();
    startIndiaMartScheduler();
    logger.info('✅ Background schedulers started');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Kala Is Art CRM Server running on port ${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
