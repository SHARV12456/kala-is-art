const { query } = require('./backend/src/config/database');

async function migrate() {
  try {
    console.log("Adding lost_reason to leads table...");
    await query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason VARCHAR(100);
    `);
    console.log("Done.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

migrate();
