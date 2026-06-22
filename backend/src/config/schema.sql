-- ============================================================
-- KALA IS ART - Complete PostgreSQL Database Schema
-- Database: kala_is_art
-- Version: 1.0.0
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- PLANS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO plans (name, slug, duration_days, price, features) VALUES
  ('Monthly', 'monthly', 30, 2500.00, '["CRM Access","Lead Management","Follow-up Reminders","Estimate Generator","Expense Tracking","Income Tracking","Dashboard Analytics","Email Notifications","Document Storage","Priority Support"]'),
  ('Quarterly', 'quarterly', 90, 7000.00, '["Everything in Monthly","Advanced Analytics","Bulk Lead Import","Custom Reports","API Access","Priority Email Support"]'),
  ('Yearly', 'yearly', 365, 25000.00, '["Everything in Quarterly","Dedicated Account Manager","Custom Branding","White Label Options","SLA Guarantee","Phone Support","Training Sessions"]')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(20) NOT NULL DEFAULT 'business_user' CHECK (role IN ('super_admin', 'business_user')),
  business_name VARCHAR(200),
  owner_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  gst_number VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  account_status VARCHAR(20) DEFAULT 'trial'
    CHECK (account_status IN ('active', 'trial', 'suspended', 'expired')),
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_mobile_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  login_count INTEGER DEFAULT 0,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  remember_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  otp_code VARCHAR(6),
  otp_expires TIMESTAMPTZ,
  otp_purpose VARCHAR(30),
  brand_tagline VARCHAR(200),
  address TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Seed super admin (password: Admin@123 - change after first login)
INSERT INTO users (role, owner_name, email, mobile, password_hash, is_email_verified, is_active, account_status)
VALUES (
  'super_admin',
  'Super Admin',
  'admin@kalaisart.com',
  '9999999999',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5H/oeGJTee',
  TRUE,
  TRUE,
  'active'
) ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SESSIONS TABLE (Device Management)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_name VARCHAR(200),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token_hash);

-- ─────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'trial')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT FALSE,
  razorpay_subscription_id VARCHAR(100),
  razorpay_plan_id VARCHAR(100),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends_at ON subscriptions(ends_at);

-- ─────────────────────────────────────────────────────────────
-- PAYMENTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  razorpay_order_id VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100) UNIQUE,
  razorpay_signature TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_gateway VARCHAR(30) DEFAULT 'razorpay',
  notes TEXT,
  invoice_number VARCHAR(50) UNIQUE,
  invoice_url TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- ─────────────────────────────────────────────────────────────
-- LEADS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_number VARCHAR(20) UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  location TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  project_type VARCHAR(100),
  lead_source VARCHAR(50) CHECK (lead_source IN ('website', 'instagram', 'facebook', 'referral', 'walk_in', 'google', 'whatsapp', 'exhibition', 'other')),
  status VARCHAR(30) DEFAULT 'new_lead' CHECK (status IN ('new_lead', 'contacted', 'interested', 'follow_up', 'proposal_sent', 'negotiation', 'won', 'lost', 'not_interested')),
  notes TEXT,
  next_followup_date DATE,
  last_contacted_at TIMESTAMPTZ,
  converted_to_client_at TIMESTAMPTZ,
  converted_client_id UUID,
  tags TEXT[],
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);

-- Auto-generate lead number trigger
CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_number := 'KAL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('lead_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS lead_seq START 1;
DROP TRIGGER IF EXISTS set_lead_number ON leads;
CREATE TRIGGER set_lead_number
  BEFORE INSERT ON leads
  FOR EACH ROW
  WHEN (NEW.lead_number IS NULL)
  EXECUTE FUNCTION generate_lead_number();

-- ─────────────────────────────────────────────────────────────
-- FOLLOW-UPS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  type VARCHAR(30) DEFAULT 'call' CHECK (type IN ('call', 'email', 'whatsapp', 'meeting', 'site_visit', 'other')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'rescheduled', 'cancelled')),
  notes TEXT,
  outcome TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_user_id ON followups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled_date ON followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);

-- ─────────────────────────────────────────────────────────────
-- CLIENTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_number VARCHAR(20) UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  name VARCHAR(200) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  gst_number VARCHAR(20),
  notes TEXT,
  total_project_value NUMERIC(12,2) DEFAULT 0,
  total_paid NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_lead_id ON clients(lead_id);

CREATE SEQUENCE IF NOT EXISTS client_seq START 1;

CREATE OR REPLACE FUNCTION generate_client_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.client_number := 'CLT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('client_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_client_number ON clients;
CREATE TRIGGER set_client_number
  BEFORE INSERT ON clients
  FOR EACH ROW
  WHEN (NEW.client_number IS NULL)
  EXECUTE FUNCTION generate_client_number();

-- ─────────────────────────────────────────────────────────────
-- PROJECTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_number VARCHAR(20) UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_type VARCHAR(100),
  status VARCHAR(30) DEFAULT 'planning' CHECK (status IN ('planning', 'design', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  estimated_value NUMERIC(12,2),
  actual_value NUMERIC(12,2),
  notes TEXT,
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ─────────────────────────────────────────────────────────────
-- ESTIMATES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_number VARCHAR(30) UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  project_id UUID REFERENCES projects(id),
  client_name VARCHAR(200) NOT NULL,
  client_mobile VARCHAR(15),
  client_email VARCHAR(255),
  client_address TEXT,
  project_name VARCHAR(200),
  scope_of_work TEXT,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal NUMERIC(12,2) DEFAULT 0,
  gst_percentage NUMERIC(5,2) DEFAULT 18,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  grand_total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT DEFAULT 'All prices are in Indian Rupees (INR). GST will be charged as applicable. Payment terms: 50% advance, 50% on completion.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS estimate_seq START 1;

CREATE OR REPLACE FUNCTION generate_estimate_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.estimate_number := 'EST-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('estimate_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_estimate_number ON estimates;
CREATE TRIGGER set_estimate_number
  BEFORE INSERT ON estimates
  FOR EACH ROW
  WHEN (NEW.estimate_number IS NULL)
  EXECUTE FUNCTION generate_estimate_number();

CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON estimates(client_id);

-- ─────────────────────────────────────────────────────────────
-- ESTIMATE ITEMS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  material_description TEXT,
  quantity NUMERIC(10,3) DEFAULT 1,
  unit VARCHAR(30) DEFAULT 'unit',
  unit_rate NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);

-- ─────────────────────────────────────────────────────────────
-- EXPENSES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('personal', 'business')),
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other')),
  receipt_url TEXT,
  vendor_name VARCHAR(200),
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  is_reimbursable BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ─────────────────────────────────────────────────────────────
-- INCOME TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('consultation', 'design', 'project', 'art_sales', 'custom_orders', 'other')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30) DEFAULT 'bank_transfer',
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  invoice_number VARCHAR(50),
  is_gst_applicable BOOLEAN DEFAULT FALSE,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('followup_reminder', 'subscription_renewal', 'payment_reminder', 'new_lead', 'lead_won', 'subscription_expired', 'general')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- DOCUMENTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  original_name VARCHAR(200) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_type VARCHAR(100),
  file_size INTEGER,
  mime_type VARCHAR(100),
  category VARCHAR(50) DEFAULT 'general',
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- ─────────────────────────────────────────────────────────────
-- ACTIVITY LOGS TABLE (Audit Trail)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Auto-purge logs older than 1 year (use pg_cron in production)

-- ─────────────────────────────────────────────────────────────
-- SETTINGS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value JSONB,
  scope VARCHAR(20) DEFAULT 'user' CHECK (scope IN ('global', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ─────────────────────────────────────────────────────────────
-- UPDATE TIMESTAMPS TRIGGER
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','subscriptions','payments','leads','followups','clients','projects','estimates','expenses','income','settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- VIEWS FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────

-- Active subscriptions view
CREATE OR REPLACE VIEW v_active_subscriptions AS
SELECT 
  s.*,
  u.email, u.owner_name, u.business_name, u.mobile,
  p.name as plan_name, p.price as plan_price, p.duration_days,
  CASE WHEN s.ends_at > NOW() THEN TRUE ELSE FALSE END as is_valid,
  EXTRACT(DAYS FROM (s.ends_at - NOW())) as days_remaining
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active';

-- Lead funnel view
CREATE OR REPLACE VIEW v_lead_funnel AS
SELECT
  user_id,
  status,
  COUNT(*) as count,
  DATE_TRUNC('month', created_at) as month
FROM leads
WHERE is_archived = FALSE
GROUP BY user_id, status, DATE_TRUNC('month', created_at);

-- Monthly revenue view
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  user_id,
  DATE_TRUNC('month', income_date) as month,
  SUM(amount) as total_revenue,
  category
FROM income
GROUP BY user_id, DATE_TRUNC('month', income_date), category;

-- Monthly expenses view
CREATE OR REPLACE VIEW v_monthly_expenses AS
SELECT
  user_id,
  DATE_TRUNC('month', expense_date) as month,
  SUM(amount) as total_expenses,
  type,
  category
FROM expenses
GROUP BY user_id, DATE_TRUNC('month', expense_date), type, category;
