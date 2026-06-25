// Full DB setup: run schema + seed admin
// Works in both local dev (individual DB vars) and production (DATABASE_URL)
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setup() {
  console.log('\n🎨 KALA IS ART — Database Setup\n');

  // Build connection config — prefer DATABASE_URL (Render production)
  const clientConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: 'localhost',
        port: 5432,
        database: process.env.DB_NAME || 'kala_is_art',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'trust',
      };

  // In local dev without DATABASE_URL, we must first create the DB via the postgres master DB
  if (!process.env.DATABASE_URL) {
    const rootClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'trust',
    });

    try {
      await rootClient.connect();
      console.log('✅ Connected to PostgreSQL (local)');

      const dbName = process.env.DB_NAME || 'kala_is_art';
      const exists = await rootClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
      );

      if (!exists.rows.length) {
        await rootClient.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Created database: ${dbName}`);
      } else {
        console.log(`✅ Database ${dbName} already exists`);
      }
      await rootClient.end();
    } catch (err) {
      console.error('\n❌ Error creating database:', err.message);
      process.exit(1);
    }
  }

  try {
    const appClient = new Client(clientConfig);
    await appClient.connect();
    console.log('✅ Connected to application database');

    const schemaPath = path.join(__dirname, 'src', 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schema);
    console.log('✅ Schema executed — tables, views, triggers, seed data loaded');

    // Set admin password with fresh bcrypt hash
    const hash = await bcrypt.hash('Admin@123', 10);
    await appClient.query(
      `INSERT INTO users (role, owner_name, email, mobile, password_hash, is_email_verified, is_active)
       VALUES ('super_admin', 'Kala Admin', 'admin@kalaisart.com', '9999999999', $1, TRUE, TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = $1, is_email_verified = TRUE, is_active = TRUE,
             failed_login_count = 0, locked_until = NULL`,
      [hash]
    );
    console.log('✅ Admin user ready');

    await appClient.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Setup Complete!');
    console.log('');
    console.log('   📧 Login Email:    admin@kalaisart.com');
    console.log('   🔑 Login Password: Admin@123');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the admin password after first login!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   PostgreSQL is not running. Start it first.\n');
    } else if (err.code === '28P01') {
      console.error('   Authentication failed — check DB credentials.\n');
    }
    process.exit(1);
  }
}

setup();

