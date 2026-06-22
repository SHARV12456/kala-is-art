-- Client Payment Tracking Table
-- Tracks every payment received from a client for a project

CREATE TABLE IF NOT EXISTS client_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id     UUID REFERENCES estimates(id) ON DELETE SET NULL,

  -- Payment details
  payment_number  VARCHAR(20) UNIQUE,          -- AUTO: PAY-2026-00001
  amount          NUMERIC(12,2) NOT NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  VARCHAR(30) NOT NULL DEFAULT 'cash',   -- cash|upi|bank_transfer|cheque|card|other
  reference_number VARCHAR(100),               -- UPI Ref / Cheque No / Transaction ID
  milestone       VARCHAR(200),                -- "Advance", "50% Progress", "Final Payment"
  notes           TEXT,

  -- Status
  status          VARCHAR(20) DEFAULT 'received'
                  CHECK (status IN ('received','pending','partial','cancelled')),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
DECLARE
  yr TEXT := TO_CHAR(NOW(), 'YYYY');
  seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(payment_number, '-', 3) AS INT)), 0) + 1
  INTO seq
  FROM client_payments
  WHERE payment_number LIKE 'PAY-' || yr || '-%';
  NEW.payment_number := 'PAY-' || yr || '-' || LPAD(seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_number
  BEFORE INSERT ON client_payments
  FOR EACH ROW WHEN (NEW.payment_number IS NULL)
  EXECUTE FUNCTION generate_payment_number();

CREATE TRIGGER update_client_payments_updated_at
  BEFORE UPDATE ON client_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id  ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_project_id ON client_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_user_id    ON client_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_date       ON client_payments(payment_date);

-- Auto-update clients.total_paid when a payment is added/deleted
CREATE OR REPLACE FUNCTION sync_client_total_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients
  SET total_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM client_payments
    WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
      AND status = 'received'
  )
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_total_paid_insert
  AFTER INSERT OR UPDATE OR DELETE ON client_payments
  FOR EACH ROW EXECUTE FUNCTION sync_client_total_paid();

SELECT 'client_payments table created successfully' AS result;
