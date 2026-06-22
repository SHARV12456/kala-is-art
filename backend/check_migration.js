const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, database: 'kala_is_art', user: 'postgres', password: 'trust' });
client.connect()
  .then(() => client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('account_status','brand_tagline','address','email_verified_at') ORDER BY column_name`))
  .then(r => { console.log('Columns found:', r.rows.map(x => x.column_name).join(', ')); })
  .catch(e => console.error('Error:', e.message))
  .finally(() => client.end());
