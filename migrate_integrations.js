const { query } = require('./backend/src/config/database');

async function migrate() {
  try {
    console.log("Creating integrations table...");
    await query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider VARCHAR(50) NOT NULL UNIQUE,
        config JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT false,
        last_sync_at TIMESTAMP,
        sync_status VARCHAR(50),
        error_log TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Table created.");

    // Seed initial row for IndiaMart
    const exists = await query(`SELECT * FROM integrations WHERE provider = 'indiamart'`);
    if (exists.rows.length === 0) {
      await query(`
        INSERT INTO integrations (provider, config, is_active) 
        VALUES ('indiamart', '{"api_key": "", "sync_frequency": "hourly"}', false)
      `);
      console.log("Seeded IndiaMart integration row.");
    }

    console.log("Done.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

migrate();

