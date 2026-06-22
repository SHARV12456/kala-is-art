// Try common postgres passwords
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
      
      // Update .env automatically
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, '.env');
      let env = fs.readFileSync(envPath, 'utf8');
      env = env.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${pwd}`);
      fs.writeFileSync(envPath, env);
      console.log('✅ .env updated with correct password!');
      console.log('\nNow run: npm run db:init');
      console.log('Then:    npm run dev\n');
      process.exit(0);
    }
  }
  console.log('\n❌ None of the common passwords worked.');
  console.log('Please tell us your PostgreSQL password.\n');
})();
