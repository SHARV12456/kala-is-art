// ============================================================
// KALA IS ART - Database Initializer
// Run: npm run db:init
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');
const logger = require('./logger');

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    logger.info('🔄 Initializing database schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    logger.info('✅ Database schema initialized successfully!');
    logger.info('✅ Default plans seeded');
    logger.info('✅ Super admin created: admin@kalaisart.com (change password immediately!)');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase().catch(process.exit.bind(process, 1));
