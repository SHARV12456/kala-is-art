-- Seed 3 realistic demo leads for Priority Dashboard
WITH u AS (SELECT id FROM users LIMIT 1)
INSERT INTO leads (user_id, name, mobile, email, city, lead_source, project_type, status, priority,
  budget_min, budget_max, notes, score, temperature, suggested_action,
  last_call_date, last_response_date, at_risk, created_at)
SELECT
  u.id, v.name, v.mobile, v.email, v.city, v.source, v.ptype, v.status, v.priority,
  v.bmin, v.bmax, v.notes, v.score, v.temp, v.action,
  v.last_call, v.last_resp, v.at_risk, NOW() - (v.days || ' days')::interval
FROM u, (VALUES
  ('Rohit Sharma',   '9820012345', 'rohit@gmail.com',   'Mumbai',     'instagram', 'Luxury Wall Art',        'negotiation', 'high',   2500000, 4000000, 'Wants large canvas art for living room, seen estimate', 88, 'hot',  'call_now',       CURRENT_DATE-1, CURRENT_DATE-1, false, '2'),
  ('Priya Mehta',    '9833456789', 'priya@outlook.com', 'Thane',      'referral',  'Custom Portrait',        'interested',  'high',   800000,  1500000, 'Wedding anniversary gift, budget flexible, very keen',  74, 'warm', 'send_estimate',  CURRENT_DATE-3, CURRENT_DATE-3, false, '5'),
  ('Vikram Joshi',   '9867123456', NULL,                'Navi Mumbai', 'google',   'Corporate Art Install',  'contacted',   'medium', 5000000, 8000000, 'Office lobby installation, 3 floors, premium brand',   42, 'cold', 'schedule_call',  CURRENT_DATE-7, CURRENT_DATE-7, false, '10')
) AS v(name,mobile,email,city,source,ptype,status,priority,bmin,bmax,notes,score,temp,action,last_call,last_resp,at_risk,days);

-- Follow-up due today for Rohit (hot lead)
INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, status, created_by)
SELECT l.id, l.user_id, CURRENT_DATE, 'call', 'Discuss estimate - hot lead!', 'pending', l.user_id
FROM leads l WHERE l.name='Rohit Sharma' LIMIT 1;

-- Overdue follow-up for Priya (warm lead)
INSERT INTO followups (lead_id, user_id, scheduled_date, type, notes, status, created_by)
SELECT l.id, l.user_id, CURRENT_DATE-2, 'whatsapp', 'Follow up on portrait quote', 'pending', l.user_id
FROM leads l WHERE l.name='Priya Mehta' LIMIT 1;

SELECT name, temperature, score, status, suggested_action FROM leads WHERE name IN ('Rohit Sharma','Priya Mehta','Vikram Joshi');
