// ============================================================
// KALA IS ART - Email Utility (Nodemailer)
// ============================================================
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const emailTemplates = {
  otp: (data) => ({
    subject: 'Kala Is Art — Verification Code',
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;background:#0f0f0f;color:#e8e0d0;padding:40px;border-radius:8px;">
        <h1 style="font-family:'Georgia',serif;color:#d4af37;font-size:24px;margin-bottom:8px;">KALA IS ART</h1>
        <p style="color:rgba(232,224,208,0.5);font-size:12px;margin-bottom:30px;letter-spacing:2px;">LUXURY ART CREATION EXPERIENCE</p>
        <p style="margin-bottom:20px;">Hello <strong>${data.name}</strong>,</p>
        <p style="margin-bottom:20px;">Your ${data.purpose} code is:</p>
        <div style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:24px;text-align:center;margin-bottom:25px;">
          <span style="font-size:36px;font-weight:700;color:#d4af37;letter-spacing:10px;">${data.otp}</span>
        </div>
        <p style="color:rgba(232,224,208,0.5);font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        <hr style="border-color:rgba(212,175,55,0.2);margin:30px 0;">
        <p style="color:rgba(232,224,208,0.3);font-size:11px;">Kala Is Art | Kailash Commercial Complex, Vikhroli West, Mumbai</p>
      </div>
    `,
  }),

  reset_password: (data) => ({
    subject: 'Kala Is Art — Reset Your Password',
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;background:#0f0f0f;color:#e8e0d0;padding:40px;border-radius:8px;">
        <h1 style="font-family:'Georgia',serif;color:#d4af37;font-size:24px;margin-bottom:30px;">KALA IS ART</h1>
        <p style="margin-bottom:16px;">Hello <strong>${data.name}</strong>,</p>
        <p style="margin-bottom:25px;color:rgba(232,224,208,0.7);">We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${data.resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8941e);color:#0f0f0f;font-weight:700;padding:14px 30px;border-radius:4px;text-decoration:none;font-size:14px;letter-spacing:1px;">RESET PASSWORD</a>
        <p style="color:rgba(232,224,208,0.4);font-size:12px;margin-top:20px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),

  followup_reminder: (data) => ({
    subject: `Follow-up Reminder: ${data.leadName} — Kala Is Art CRM`,
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;background:#0f0f0f;color:#e8e0d0;padding:40px;border-radius:8px;">
        <h1 style="font-family:'Georgia',serif;color:#d4af37;font-size:24px;margin-bottom:30px;">KALA IS ART CRM</h1>
        <div style="background:rgba(212,175,55,0.08);border-left:3px solid #d4af37;padding:20px;border-radius:4px;margin-bottom:25px;">
          <p style="color:#d4af37;font-size:13px;letter-spacing:1px;margin-bottom:8px;">⏰ FOLLOW-UP REMINDER</p>
          <p style="font-size:18px;font-weight:600;">${data.leadName}</p>
          <p style="color:rgba(232,224,208,0.6);margin-top:8px;">${data.mobile} | ${data.status}</p>
        </div>
        <p style="color:rgba(232,224,208,0.6);">Scheduled for: <strong style="color:#e8e0d0;">${data.scheduledDate}</strong></p>
        ${data.notes ? `<p style="margin-top:15px;color:rgba(232,224,208,0.5);">Notes: ${data.notes}</p>` : ''}
      </div>
    `,
  }),

  subscription_expiry: (data) => ({
    subject: 'Your Kala Is Art Subscription is Expiring Soon',
    html: `
      <div style="font-family:'Inter',sans-serif;max-width:500px;margin:0 auto;background:#0f0f0f;color:#e8e0d0;padding:40px;border-radius:8px;">
        <h1 style="font-family:'Georgia',serif;color:#d4af37;font-size:24px;margin-bottom:30px;">KALA IS ART</h1>
        <p style="margin-bottom:16px;">Hello <strong>${data.name}</strong>,</p>
        <p style="margin-bottom:20px;">Your <strong>${data.planName}</strong> subscription expires in <strong style="color:#d4af37;">${data.daysRemaining} days</strong> on <strong>${data.expiryDate}</strong>.</p>
        <a href="${data.renewUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8941e);color:#0f0f0f;font-weight:700;padding:14px 30px;border-radius:4px;text-decoration:none;font-size:14px;">RENEW SUBSCRIPTION</a>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const transporter = getTransporter();

    let emailContent = {};
    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else {
      emailContent = { subject, html };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Kala Is Art <noreply@kalaisart.com>',
      to,
      subject: emailContent.subject || subject,
      html: emailContent.html || html,
    });

    logger.info(`Email sent to ${to}: ${emailContent.subject || subject}`);
  } catch (error) {
    logger.error(`Email send failed to ${to}:`, error.message);
    throw error;
  }
};

module.exports = { sendEmail };
