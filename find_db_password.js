// Try common postgres passwords and find the right one
const { Client } = require('pg');

const passwords = ['postgres', 'admin', 'password', '1234', '12345', 'root', 'Postgres@123', 'admin123', ''];

async function tryPassword(pwd) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: pwd,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

(async () => {
  console.log('\n🔍 Finding your PostgreSQL password...\n');
  for (const pwd of passwords) {
    const ok = await tryPassword(pwd);
    if (ok) {
      console.log(`✅ Found it! Password is: "${pwd}"`);
      console.log(`\nRun this to fix your .env:\n  node reset_admin.js "${pwd}"\n`);
      process.exit(0);
    }
  }
  console.log('\n❌ None of the common passwords worked.');
  console.log('Please check your PostgreSQL password and run:');
  console.log('  node reset_admin.js YOUR_PASSWORD\n');
})();
