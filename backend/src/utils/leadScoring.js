// ============================================================
// KALA IS ART - Smart Lead Scoring & Temperature Engine
// Runs on every significant lead event
// ============================================================
const { query } = require('../config/database');
const { createNotification } = require('./notification');
const logger = require('../config/logger');

/**
 * SCORING MATRIX (max 110 pts, capped at 100)
 * 
 * Budget:              max 25 pts
 * Meeting Done:        20 pts
 * Estimate Sent:       15 pts
 * Estimate Viewed:     20 pts
 * Recent Response:     max 20 pts (decays over days)
 * Location Match:      10 pts
 * Source Quality:      max 10 pts
 */

// Budget → points
const budgetScore = (budgetMax) => {
  if (!budgetMax) return 0;
  if (budgetMax >= 2000000) return 25;  // 20L+
  if (budgetMax >= 1000000) return 20;  // 10-20L
  if (budgetMax >= 500000)  return 15;  // 5-10L
  if (budgetMax >= 200000)  return 10;  // 2-5L
  if (budgetMax >= 100000)  return 5;   // 1-2L
  return 2;                             // < 1L
};

// Days since last response → recency score (decays daily)
const recencyScore = (lastResponseDate) => {
  if (!lastResponseDate) return 0;
  const days = Math.floor((Date.now() - new Date(lastResponseDate)) / 86400000);
  if (days <= 1)  return 20;
  if (days <= 3)  return 15;
  if (days <= 7)  return 10;
  if (days <= 14) return 5;
  if (days <= 30) return 2;
  return 0;
};

// Source quality bonus
const sourceScore = (source) => {
  const scores = {
    referral: 10, walk_in: 10, exhibition: 8,
    instagram: 6, website: 6, google: 6,
    facebook: 4, whatsapp: 4,
    other: 2,
  };
  return scores[source] || 0;
};

// Premium Mumbai locations
const PREMIUM_LOCATIONS = ['worli', 'bandra', 'juhu', 'andheri', 'powai', 'vikhroli', 'thane', 'navi mumbai', 'mumbai', 'pune'];
const locationScore = (city, area) => {
  const str = `${city || ''} ${area || ''}`.toLowerCase();
  return PREMIUM_LOCATIONS.some(l => str.includes(l)) ? 10 : 0;
};

/**
 * Calculate full lead score (0–100)
 */
const calculateScore = (lead) => {
  let score = 0;

  score += budgetScore(lead.budget_max);
  score += lead.last_meeting_date   ? 20 : 0;
  score += lead.last_estimate_sent  ? 15 : 0;
  score += lead.estimate_viewed     ? 20 : 0;
  score += recencyScore(lead.last_response_date);
  score += locationScore(lead.city, lead.area);
  score += sourceScore(lead.lead_source);

  // Status bonuses — maps every status to points
  const statusBonus = {
    won:               15,  // caught earlier as special case, fallback safety
    negotiation:       10,
    proposal_sent:      8,
    site_visit_done:    8,
    estimate_sent:      7,
    interested:         5,
    follow_up:          3,
    contacted:          2,
    new_enquiry:        1,
    new_lead:           0,
    not_interested:     0,
    lost:               0,
  };
  score += statusBonus[lead.status] || 1;

  return Math.min(100, Math.max(0, score));
};

/**
 * Score → Temperature
 */
const scoreToTemperature = (score, status) => {
  if (status === 'won')  return 'won';
  if (status === 'lost') return 'lost';
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'cold';
  return 'dead';
};

/**
 * Temperature → Suggested Action
 */
const suggestAction = (lead, temperature) => {
  if (lead.status === 'won' || lead.status === 'lost') return null;
  if (lead.status === 'not_interested') return 'archive';

  const daysSinceContact = lead.last_response_date
    ? Math.floor((Date.now() - new Date(lead.last_response_date)) / 86400000)
    : 999;

  if (temperature === 'hot') {
    if (!lead.last_estimate_sent) return 'send_estimate';
    if (!lead.last_meeting_date) return 'schedule_site_visit';
    if (lead.status === 'proposal_sent') return 'follow_up_on_estimate';
    return 'call_now';
  }
  if (temperature === 'warm') {
    if (!lead.last_estimate_sent) return 'send_estimate';
    if (daysSinceContact > 3) return 'send_whatsapp';
    return 'schedule_call';
  }
  if (temperature === 'cold') {
    if (daysSinceContact > 14) return 'send_reengagement';
    return 'send_whatsapp';
  }
  return 'archive';
};

/**
 * Main scorer — call after any lead update
 */
const scoreLead = async (leadId, userId, triggerActivity = null) => {
  try {
    const leadRes = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (!leadRes.rows.length) return;
    const lead = leadRes.rows[0];

    // Won/lost leads: set final state and exit — don't score them
    if (lead.status === 'won') {
      await query(`UPDATE leads SET score=100, temperature='won', suggested_action=NULL, at_risk=FALSE, score_updated_at=NOW() WHERE id=$1`, [leadId]);
      return { score: 100, temperature: 'won', action: null };
    }
    if (lead.status === 'lost' || lead.status === 'not_interested') {
      await query(`UPDATE leads SET score=0, temperature='lost', suggested_action='archive', at_risk=FALSE, score_updated_at=NOW() WHERE id=$1`, [leadId]);
      return { score: 0, temperature: 'lost', action: 'archive' };
    }

    const score        = calculateScore(lead);
    const temperature  = scoreToTemperature(score, lead.status);
    const action       = suggestAction(lead, temperature);
    const prevTemp     = lead.temperature;
    const prevScore    = lead.score || 0;

    // Update lead
    await query(
      `UPDATE leads SET score=$1, temperature=$2, suggested_action=$3, score_updated_at=NOW()
       WHERE id=$4`,
      [score, temperature, action, leadId]
    );

    // Notify on temperature upgrade (e.g., cold→hot)
    const TEMP_RANK = { dead:0, cold:1, warm:2, hot:3 };
    if (TEMP_RANK[temperature] > TEMP_RANK[prevTemp || 'cold']) {
      const TEMP_EMOJI = { hot:'🔴', warm:'🟡', cold:'🔵', dead:'⚫' };
      await createNotification({
        userId,
        type: 'lead_temperature_change',
        title: `${TEMP_EMOJI[temperature]} Lead is now ${temperature.toUpperCase()}!`,
        message: `${lead.name} moved from ${prevTemp} → ${temperature} (score: ${score}/100)`,
        data: { leadId, score, temperature },
        actionUrl: `/leads/${leadId}`,
      });
    }

    // At-risk check: hot lead with no contact for 48h
    if (temperature === 'hot') {
      const lastContact = lead.last_contacted_at || lead.created_at;
      const hoursElapsed = (Date.now() - new Date(lastContact)) / 3600000;
      if (hoursElapsed >= 48) {
        await query(`UPDATE leads SET at_risk=TRUE WHERE id=$1`, [leadId]);
        await createNotification({
          userId,
          type: 'at_risk_alert',
          title: '⚠️ Hot Lead At Risk!',
          message: `${lead.name} is HOT but hasn't been contacted in ${Math.floor(hoursElapsed)}h. Act now!`,
          data: { leadId },
          actionUrl: `/leads/${leadId}`,
        });
      } else {
        await query(`UPDATE leads SET at_risk=FALSE WHERE id=$1`, [leadId]);
      }
    }

    logger.info(`Lead ${leadId} scored: ${score}/100 → ${temperature} (was ${prevScore}/${prevTemp})`);
    return { score, temperature, action };
  } catch (err) {
    logger.error('Lead scoring error:', err);
  }
};

/**
 * Batch rescore all leads (for cron job)
 */
const rescoreAllLeads = async () => {
  try {
    const leads = await query(
      `SELECT id, user_id FROM leads WHERE is_archived=FALSE AND status NOT IN ('won','lost')`
    );
    let count = 0;
    for (const lead of leads.rows) {
      await scoreLead(lead.id, lead.user_id);
      count++;
    }
    logger.info(`Batch rescoring complete: ${count} leads updated`);
    return count;
  } catch (err) {
    logger.error('Batch rescore error:', err);
  }
};

module.exports = { scoreLead, rescoreAllLeads, calculateScore, scoreToTemperature, suggestAction };
