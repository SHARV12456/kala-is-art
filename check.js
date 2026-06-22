const {query} = require('./backend/src/config/database'); 
query("SELECT column_name FROM information_schema.columns WHERE table_name='estimates'").then(r => {
  console.log("ESTIMATES:", r.rows); 
  process.exit(0);
});
