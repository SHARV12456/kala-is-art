const {query} = require('./backend/src/config/database'); 

async function migrate() {
  try {
    // 0. Drop dependent views
    await query(`DROP VIEW IF EXISTS v_active_subscriptions CASCADE;`);

    // 1. Remove Razorpay columns from subscriptions
    await query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS razorpay_subscription_id CASCADE;`);
    await query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS razorpay_plan_id CASCADE;`);
    
    // 2. Add manual tracking columns to subscriptions
    await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS manual_reference character varying;`);
    await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes text;`);

    // 3. Remove Razorpay columns from payments
    await query(`ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_order_id CASCADE;`);
    await query(`ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_payment_id CASCADE;`);
    await query(`ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_signature CASCADE;`);
    await query(`ALTER TABLE payments DROP COLUMN IF EXISTS payment_gateway CASCADE;`);

    // 4. Add manual tracking columns to payments
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_number character varying;`);
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS expiry_date timestamp with time zone;`);
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id);`);

    console.log("Migration successful");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

migrate();
