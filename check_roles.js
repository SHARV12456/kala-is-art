const {query} = require('./backend/src/config/database'); 
query("SELECT email, role FROM users").then(r => {
  console.log("USERS:", r.rows);
  process.exit(0);
});
