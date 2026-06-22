-- ============================================================
-- KALA IS ART - Smart CRM Migration
-- Lead Intelligence, Scoring, Timeline, Escalation
-- ============================================================

-- 1. Lead intelligence columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperature VARCHAR(10) DEFAULT 'cold' CHECK (temperature IN ('hot','warm','cold','dead'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS suggested_action VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS at_risk BOOLEAN DEFAULT FALSE;

-- Interaction tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_call_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_whatsapp_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_meeting_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_estimate_sent DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_response_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimate_viewed BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_time_hours INTEGER;

-- 2. Follow-up escalation columns
ALTER TABLE followups ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS at_risk BOOLEAN DEFAULT FALSE;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

-- 3. Activity timeline table
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  description TEXT,
  outcome VARCHAR(50),
  duration_minutes INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_at_risk ON leads(at_risk) WHERE at_risk = TRUE;

-- 4. Seed: Auto-log "lead_created" for existing leads (one-time)
INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
SELECT id, user_id, 'lead_created', 'Lead Created', 'Lead was created in the system'
FROM leads
WHERE id NOT IN (SELECT DISTINCT lead_id FROM lead_activities WHERE activity_type='lead_created')
ON CONFLICT DO NOTHING;

SELECT 'Migration complete ✓' as status;
