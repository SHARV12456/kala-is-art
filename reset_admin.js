// ==============================================================
// KALA IS ART - Admin Setup / Password Reset Script
// Run: node reset_admin.js YOUR_POSTGRES_PASSWORD
// ==============================================================
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbPassword = process.argv[2];
if (!dbPassword) {
  console.error('\n❌ Usage: node reset_admin.js YOUR_POSTGRES_PASSWORD\n');
  process.exit(1);
}

const adminEmail = 'admin@kalaisart.com';
const adminPassword = 'Admin@123';

async function setup() {
  console.log('\n🎨 KALA IS ART - Admin Setup\n');

  // Step 1: Update .env
  const envPath = path.join(__dirname, 'backend', '.env');
  let env = fs.readFileSync(envPath, 'utf8');
  env = env.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${dbPassword}`);
  fs.writeFileSync(envPath, env);
  console.log('✅ .env updated with your DB password');

  // Step 2: Connect
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',  // connect to default first
    user: 'postgres',
    password: dbPassword,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Step 3: Create DB if needed
    const dbExists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = 'kala_is_art'`
    );
    if (!dbExists.rows.length) {
      await client.query('CREATE DATABASE kala_is_art');
      console.log('✅ Created database: kala_is_art');
    } else {
      console.log('✅ Database kala_is_art already exists');
    }
    await client.end();

    // Step 4: Connect to kala_is_art and run schema
    const appClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'kala_is_art',
      user: 'postgres',
      password: dbPassword,
    });
    await appClient.connect();

    const schema = fs.readFileSync(path.join(__dirname, 'backend', 'src', 'config', 'schema.sql'), 'utf8');
    await appClient.query(schema);
    console.log('✅ Schema initialized (tables, triggers, seed data)');

    // Step 5: Set/update admin password
    const hash = await bcrypt.hash(adminPassword, 12);
    const result = await appClient.query(
      `INSERT INTO users (role, owner_name, email, mobile, password_hash, is_email_verified, is_active)
       VALUES ('super_admin', 'Kala Admin', $1, '9999999999', $2, TRUE, TRUE)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = $2, is_email_verified = TRUE, is_active = TRUE, 
           failed_login_count = 0, locked_until = NULL
       RETURNING email`,
      [adminEmail, hash]
    );
    console.log(`✅ Admin password reset for: ${result.rows[0]?.email}`);

    await appClient.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Setup Complete! Your login credentials:');
    console.log(`   📧 Email:    ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}`);
    console.log('\n👉 Next: cd backend && npm run dev');
    console.log('👉 Then: open http://localhost:3000/login\n');

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    if (err.message.includes('password')) {
      console.error('   → Wrong PostgreSQL password. Try again with the correct one.\n');
    }
    if (err.message.includes('ECONNREFUSED')) {
      console.error('   → PostgreSQL is not running. Start it in Services first.\n');
    }
    process.exit(1);
  }
}

setup();
