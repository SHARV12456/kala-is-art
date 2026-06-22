// ============================================================
// KALA IS ART - PostgreSQL Database Configuration
// ============================================================
const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'kala_is_art',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,                    // Max pool connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000,
});

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

/**
 * Execute a parameterized query
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow query detected:', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = () => pool.connect();

/**
 * Test database connection
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info(`Connected to PostgreSQL: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
  } finally {
    client.release();
  }
};

/**
 * Run a transaction
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, getClient, testConnection, transaction };
