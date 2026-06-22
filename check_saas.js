const {query} = require('./backend/src/config/database'); 
Promise.all([
  query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users'"),
  query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='subscriptions'"),
  query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='plans'"),
  query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='payments'")
]).then(results => {
  console.log("USERS:", results[0].rows);
  console.log("SUBSCRIPTIONS:", results[1].rows);
  console.log("PLANS:", results[2].rows);
  console.log("PAYMENTS:", results[3].rows);
  process.exit(0);
});
