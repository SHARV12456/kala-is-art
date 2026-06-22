-- ============================================================
-- MIGRATION 002: Frictionless Signup & Account Status System
-- Run: psql -U postgres -d kala_is_art -f this_file.sql
-- ============================================================

-- 1. Add account_status column to users table
--    Values: 'trial' | 'active' | 'suspended' | 'expired'
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'trial'
    CHECK (account_status IN ('active', 'trial', 'suspended', 'expired'));

-- 2. Set all existing users (who aren't super_admin) to 'trial'
UPDATE users
SET account_status = 'trial'
WHERE account_status IS NULL AND role != 'super_admin';

-- 3. Super admin has 'active' status
UPDATE users
SET account_status = 'active'
WHERE role = 'super_admin';

-- 4. Add audit_logs table for signup/login tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  ip_address  VARCHAR(45),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5. Add email_verified_at column (may already exist, safe to add)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- 6. Ensure updated_at column exists on users (needed by account-status updates)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Add subscription_id to the admin users query helper
--    (no schema change needed; handled in query joins)

-- Done
SELECT 'Migration 002 complete: account_status, audit_logs added.' AS result;
