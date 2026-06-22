// Full DB setup: create database + run schema + seed admin
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setup() {
  console.log('\n🎨 KALA IS ART — Database Setup\n');

  // Step 1: Connect to default postgres DB to create kala_is_art
  const rootClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'trust',  // pg_hba.conf uses trust auth — any string works
  });

  try {
    await rootClient.connect();
    console.log('✅ Connected to PostgreSQL (trust auth)');

    // Check if DB exists
    const exists = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = 'kala_is_art'`
    );

    if (!exists.rows.length) {
      await rootClient.query('CREATE DATABASE kala_is_art');
      console.log('✅ Created database: kala_is_art');
    } else {
      console.log('✅ Database kala_is_art already exists');
    }
    await rootClient.end();

    // Step 2: Connect to kala_is_art and run schema
    const appClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'kala_is_art',
      user: 'postgres',
      password: 'trust',
    });

    await appClient.connect();
    console.log('✅ Connected to kala_is_art');

    const schemaPath = path.join(__dirname, 'src', 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schema);
    console.log('✅ Schema executed — tables, views, triggers, seed data loaded');

    // Step 3: Set admin password with fresh bcrypt hash
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
    console.log('👉 Now run:  npm run dev');
    console.log('👉 Then go to: http://localhost:3000/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   PostgreSQL is not running. Start it first.\n');
    } else if (err.code === '28P01') {
      console.error('   Authentication failed — try setting password to empty string.\n');
    } else if (err.code === '42501') {
      console.error('   Permission denied.\n');
    }
    process.exit(1);
  }
}

setup();
