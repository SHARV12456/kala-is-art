// ============================================================
// KALA IS ART - Smart Message Generator
// ============================================================

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
const fmtDateLong = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '';

// ─── STAGE DETECTION ─────────────────────────────────────────
const getStage = (lead) => {
  if (lead.last_estimate_sent) {
    if (lead.estimate_viewed) return 'estimate_viewed';
    return 'estimate_sent';
  }
  if (lead.last_meeting_date) return 'post_meeting';
  if (lead.status === 'negotiation') return 'negotiation';
  if (lead.status === 'proposal_sent') return 'proposal_sent';
  if (lead.status === 'interested' || lead.temperature === 'hot') return 'interested';
  if (lead.status === 'contacted') return 'contacted';
  return 'new_contact';
};

// ─── GREETING HELPERS ────────────────────────────────────────
const greeting = (name) => `Hello ${name?.split(' ')[0] || 'there'}`;

const projectDesc = (lead) => {
  if (lead.project_type) return lead.project_type;
  return 'your project';
};

const budgetStr = (lead) => {
  if (lead.budget_min && lead.budget_max) {
    return `₹${(lead.budget_min/100000).toFixed(1)}L–₹${(lead.budget_max/100000).toFixed(1)}L`;
  }
  return null;
};

const lastContactStr = (lead) => {
  const dates = [lead.last_call_date, lead.last_whatsapp_date, lead.last_email_date, lead.last_meeting_date].filter(Boolean);
  if (!dates.length) return null;
  const latest = new Date(Math.max(...dates.map(d => new Date(d))));
  return fmtDate(latest);
};

// ─── WHATSAPP MESSAGE TEMPLATES BY STAGE ─────────────────────
const WHATSAPP_TEMPLATES = {
  new_contact: (lead) => `${greeting(lead.name)},

Hope you are doing well! 🙏

I am reaching out from *Kala Is Art* — we specialise in luxury art creation and personalised artistic consultations in Mumbai.

I would love to learn more about your vision for ${projectDesc(lead)} and how we can bring it to life with our premium craftsmanship.

Would you be available for a brief call this week?

Warm regards,
*Kala Is Art*
📍 Vikhroli West, Mumbai`,

  contacted: (lead) => `${greeting(lead.name)},

Thank you for your time earlier! 😊

Following up on our conversation regarding ${projectDesc(lead)}. We have some beautiful ideas and references that I believe would resonate perfectly with your vision.

${budgetStr(lead) ? `Budget range noted: ${budgetStr(lead)}\n\n` : ''}Would you like to schedule a consultation to explore the possibilities?

Regards,
*Kala Is Art*`,

  interested: (lead) => `${greeting(lead.name)},

Great connecting with you! We are excited about the possibility of working on ${projectDesc(lead)} together.

${lead.notes ? `Based on our discussion about "${lead.notes.slice(0, 100)}"...\n\n` : ''}Our next step would be to schedule a detailed consultation${lead.city ? ` at your location in ${lead.city}` : ''}.

I am available this week — which day works best for you?

Looking forward to creating something exceptional! 🎨

Warm regards,
*Kala Is Art*`,

  post_meeting: (lead) => `${greeting(lead.name)},

It was wonderful meeting you${lead.last_meeting_date ? ` on ${fmtDate(lead.last_meeting_date)}` : ''}! 🙌

Thank you for sharing your vision for ${projectDesc(lead)}. We are truly excited about what we can create together.

We are preparing a detailed proposal tailored specifically for your requirements. You can expect it by tomorrow.

In the meantime, feel free to reach out with any questions or additional ideas.

Warm regards,
*Kala Is Art*`,

  estimate_sent: (lead) => `${greeting(lead.name)},

Hope you are doing well! 😊

I wanted to follow up on the detailed proposal we shared for ${projectDesc(lead)}. We put together something truly special that aligns with your vision.

${budgetStr(lead) ? `The investment outlined is within your stated range of ${budgetStr(lead)}.\n\n` : ''}Have you had a chance to review it? I would love to address any questions or customise it further.

Regards,
*Kala Is Art*`,

  estimate_viewed: (lead) => `${greeting(lead.name)},

I noticed you reviewed our proposal — thank you! 🙏

We would love to hear your thoughts on the design direction and investment for ${projectDesc(lead)}.

Is there anything you would like us to adjust, clarify, or explore further? We are completely flexible and committed to making this perfect for you.

Looking forward to your feedback!

Warm regards,
*Kala Is Art*`,

  negotiation: (lead) => `${greeting(lead.name)},

Thank you for your continued interest in ${projectDesc(lead)}! 😊

We value your partnership and want to make sure this works well for both of us. I would love to have a quick conversation to align on the final details.

When would be a good time to connect this week?

Regards,
*Kala Is Art*`,

  proposal_sent: (lead) => `${greeting(lead.name)},

Following up on the proposal we shared for ${projectDesc(lead)}.

We have crafted this with great care to reflect your vision and requirements.${lead.notes ? ` Keeping in mind your preference for "${lead.notes.slice(0, 60)}"` : ''}

Would love to schedule a call to walk you through the highlights and answer any questions.

Regards,
*Kala Is Art*`,
};

// ─── EMAIL TEMPLATES BY STAGE ────────────────────────────────
const EMAIL_TEMPLATES = {
  new_contact: (lead) => ({
    subject: `Kala Is Art – Creative Consultation for ${projectDesc(lead)}`,
    body: `Dear ${lead.name?.split(' ')[0] || 'Sir/Madam'},

Greetings from Kala Is Art!

We are a luxury art creation studio based in Mumbai, specialising in bespoke artistic experiences — from premium wall art and custom paintings to complete aesthetic consultations for homes and spaces.

I came across your inquiry and would love to explore how we can bring your vision to life for ${projectDesc(lead)}.

${lead.city ? `We serve clients across ${lead.city} and would be happy to arrange a consultation at your convenience.` : 'We would be happy to arrange a consultation at your convenience.'}

Could we schedule a brief 15-minute call this week? Please let me know your availability.

Warm regards,
Kala Is Art Team
📍 Kailash Commercial Complex, Vikhroli West, Mumbai
📞 Available Mon–Sat, 10 AM – 7 PM`,
  }),

  estimate_sent: (lead) => ({
    subject: `Your Personalised Proposal – ${projectDesc(lead)} | Kala Is Art`,
    body: `Dear ${lead.name?.split(' ')[0] || 'Sir/Madam'},

Thank you for your interest in Kala Is Art.

Please find attached your personalised proposal for ${projectDesc(lead)}. We have carefully curated this to align with your vision and requirements.

${budgetStr(lead) ? `Investment summary: ${budgetStr(lead)}\n\n` : ''}The proposal includes:
• Detailed scope of work
• Material specifications
• Timeline
• Investment breakdown

We would love to walk you through this at your convenience. Please feel free to reach out with any questions.

You can reply to this email or call us directly.

Warm regards,
Kala Is Art Team`,
  }),

  post_meeting: (lead) => ({
    subject: `Follow-up from our Meeting – ${projectDesc(lead)} | Kala Is Art`,
    body: `Dear ${lead.name?.split(' ')[0] || 'Sir/Madam'},

Thank you for taking the time to meet with us${lead.last_meeting_date ? ` on ${fmtDateLong(lead.last_meeting_date)}` : ''}!

It was a pleasure discussing your vision for ${projectDesc(lead)}. We are genuinely excited about the creative possibilities.

As discussed, our next steps are:
1. Prepare a detailed design proposal
2. Share material samples and references
3. Finalise the investment structure

You can expect our comprehensive proposal within 48 hours.

Please do not hesitate to reach out if you have any additional thoughts or requirements in the meantime.

Warm regards,
Kala Is Art Team`,
  }),
};

// ─── MAIN GENERATOR ──────────────────────────────────────────
const generateMessage = (lead, channel, customStage = null) => {
  const stage = customStage || getStage(lead);

  if (channel === 'whatsapp') {
    const template = WHATSAPP_TEMPLATES[stage] || WHATSAPP_TEMPLATES.contacted;
    return {
      message: template(lead),
      stage,
      channel: 'whatsapp',
    };
  }

  if (channel === 'email') {
    const template = EMAIL_TEMPLATES[stage] || EMAIL_TEMPLATES.new_contact;
    const result = template(lead);
    return {
      subject: result.subject,
      message: result.body,
      stage,
      channel: 'email',
    };
  }

  if (channel === 'call') {
    // Talking points for calls
    const points = [];
    if (lead.last_estimate_sent && !lead.estimate_viewed) points.push('Ask if they received and reviewed the estimate');
    if (lead.last_meeting_date) points.push('Follow up on discussion points from the meeting');
    if (lead.budget_max) points.push(`Budget: ${budgetStr(lead)} — stay within range`);
    if (lead.next_followup_date) points.push('Discuss timeline and next steps');
    points.push('Ask about any concerns or questions');
    points.push('Suggest specific next action (meeting/site visit/estimate)');

    return {
      message: `📋 Call talking points for ${lead.name}:\n\n${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
      stage,
      channel: 'call',
    };
  }

  return { message: '', stage, channel };
};

// ─── STAGE LABELS ────────────────────────────────────────────
const STAGE_LABELS = {
  new_contact: 'First Contact',
  contacted: 'Follow-up Contact',
  interested: 'Interested Lead',
  post_meeting: 'Post-Meeting Follow-up',
  estimate_sent: 'Estimate Follow-up',
  estimate_viewed: 'Estimate Viewed — Hot!',
  negotiation: 'Negotiation Follow-up',
  proposal_sent: 'Proposal Follow-up',
};

module.exports = { generateMessage, getStage, STAGE_LABELS };
