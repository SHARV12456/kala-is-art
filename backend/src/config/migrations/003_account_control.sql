-- ============================================================
-- MIGRATION 003: Simple Account Control System
-- Replace subscription-based access with admin-controlled
-- account_status: active | payment_due | suspended | disabled
-- Run: node -e "require('dotenv').config(); ..." (see README)
-- ============================================================

-- 1. Drop old constraint first
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;

-- 2. Migrate existing status values BEFORE re-adding constraint
UPDATE users SET account_status = 'payment_due' WHERE account_status = 'trial';
UPDATE users SET account_status = 'disabled'    WHERE account_status = 'expired';
-- 'active' and 'suspended' stay as-is

-- 3. Super admin always stays active
UPDATE users SET account_status = 'active' WHERE role = 'super_admin';

-- 4. Add new CHECK constraint with 4 clean values
ALTER TABLE users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'payment_due', 'suspended', 'disabled'));

-- 4. Add admin control fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS renewal_date   DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 5. Create account_status_logs table for full audit trail
CREATE TABLE IF NOT EXISTS account_status_logs (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  old_status   VARCHAR(20),
  new_status   VARCHAR(20) NOT NULL,
  note         TEXT,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_logs_user_id   ON account_status_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_status_logs_created_at ON account_status_logs(created_at DESC);

-- Done
SELECT 'Migration 003 complete: Simple account control system ready.' AS result;
