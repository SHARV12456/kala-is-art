const {query} = require('./backend/src/config/database'); 
query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(r => {
  console.log("TABLES:", r.rows.map(t => t.table_name)); 
  process.exit(0);
});
