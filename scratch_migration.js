const { pool } = require('./backend/src/config/database');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS brand_tagline VARCHAR(255) DEFAULT 'INTERIOR & ARCHITECTURE';
    `);
    console.log('Successfully added brand_tagline to users');
  } catch (err) {
    console.error('Error migrating users:', err);
  } finally {
    await pool.end();
  }
}

migrate();
