// ============================================================
// KALA IS ART - Auth Controller
// Frictionless signup + account-status based access
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, transaction } = require('../config/database');
const { sendEmail } = require('../utils/email');
const logger = require('../config/logger');

const SEND_WELCOME_EMAIL = process.env.SEND_WELCOME_EMAIL !== 'false';

// ─── Token Generation ──────────────────────────────────────────
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Audit log helper ─────────────────────────────────────────
const logAudit = async (userId, action, ip, meta = {}) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, $2, $3, $4)`,
      [userId, action, ip, JSON.stringify(meta)]
    ).catch(() => {});
  } catch (_) {}
};

// ─── REGISTER (Frictionless — instant access) ─────────────────
const register = async (req, res) => {
  const { owner_name, business_name, email, mobile, password } = req.body;

  try {
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email.toLowerCase(), mobile]
    );
    if (existing.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or mobile already exists.',
      });
    }

    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // New users get 'active' status — admin controls access manually
    const result = await query(
      `INSERT INTO users
         (owner_name, business_name, email, mobile, password_hash,
          is_email_verified, is_active, account_status, role)
       VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, 'active', 'business_user')
       RETURNING id, email, owner_name, business_name, mobile, role,
                 is_email_verified, account_status`,
      [owner_name, business_name || null, email.toLowerCase(), mobile, password_hash]
    );

    const user = result.rows[0];

    // Auto-login — generate tokens immediately
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, device_name, browser)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, refreshTokenHash, req.ip, req.headers['user-agent'],
       refreshExpires, req.body.deviceName || 'Unknown', req.body.browser || 'Unknown']
    );

    await query(
      `UPDATE users SET last_login_at = NOW(), last_login_ip = $1, login_count = 1 WHERE id = $2`,
      [req.ip, user.id]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit(user.id, 'REGISTER', req.ip, { email: user.email });

    if (SEND_WELCOME_EMAIL) {
      sendEmail({
        to: user.email,
        subject: 'Welcome to Kala Is Art CRM!',
        template: 'welcome',
        data: { name: owner_name },
      }).catch(err => logger.warn('Welcome email failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Welcome to Kala Is Art.',
      data: {
        accessToken,
        user: {
          id:               user.id,
          role:             user.role,
          owner_name:       user.owner_name,
          business_name:    user.business_name,
          email:            user.email,
          mobile:           user.mobile,
          is_email_verified: user.is_email_verified,
          account_status:   user.account_status,
        },
      },
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ─── SEND VERIFICATION EMAIL (optional, authenticated) ────────
const sendVerificationEmail = async (req, res) => {
  try {
    const user = req.user;
    if (user.is_email_verified) {
      return res.json({ success: true, message: 'Email is already verified.' });
    }
    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60000);
    await query(
      `UPDATE users SET otp_code = $1, otp_expires = $2, otp_purpose = 'email_verification' WHERE id = $3`,
      [otp, otp_expires, user.id]
    );
    await sendEmail({
      to: user.email,
      subject: 'Kala Is Art — Verify Your Email',
      template: 'otp',
      data: { name: user.owner_name, otp, purpose: 'email verification' },
    });
    res.json({ success: true, message: 'Verification email sent.' });
  } catch (error) {
    logger.error('Send verification email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification email.' });
  }
};

// ─── VERIFY OTP (optional) ────────────────────────────────────
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await query(
      `SELECT id, otp_code, otp_expires FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = result.rows[0];
    if (user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }
    await query(
      `UPDATE users SET is_email_verified = TRUE, email_verified_at = NOW(),
       otp_code = NULL, otp_expires = NULL WHERE id = $1`,
      [user.id]
    );
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    logger.error('OTP verify error:', error);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    const result = await query(
      `SELECT id, role, owner_name, business_name, email, mobile, password_hash,
              is_active, account_status, is_email_verified,
              failed_login_count, locked_until, brand_tagline, address,
              renewal_date
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check account lock (brute force protection)
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again after ${new Date(user.locked_until).toLocaleString()}`,
      });
    }

    // DISABLED = cannot log in at all
    if (!user.is_active || user.account_status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Account inactive. Please contact administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      const failedCount = user.failed_login_count + 1;
      const lockUntil = failedCount >= 5 ? new Date(Date.now() + 30 * 60000) : null;
      await query(
        'UPDATE users SET failed_login_count = $1, locked_until = $2 WHERE id = $3',
        [failedCount, lockUntil, user.id]
      );
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${Math.max(0, 5 - failedCount)} attempts remaining.`,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, device_name, browser)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, refreshTokenHash, req.ip, req.headers['user-agent'], refreshExpires,
       req.body.deviceName || 'Unknown', req.body.browser || 'Unknown']
    );

    await query(
      `UPDATE users SET last_login_at = NOW(), last_login_ip = $1,
       failed_login_count = 0, locked_until = NULL, login_count = login_count + 1
       WHERE id = $2`,
      [req.ip, user.id]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit(user.id, 'LOGIN', req.ip, { rememberMe: !!rememberMe });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id:               user.id,
          role:             user.role,
          owner_name:       user.owner_name,
          business_name:    user.business_name,
          email:            user.email,
          mobile:           user.mobile,
          is_email_verified: user.is_email_verified,
          account_status:   user.account_status,
          brand_tagline:    user.brand_tagline,
          address:          user.address,
          renewal_date:     user.renewal_date,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────
const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const sessionResult = await query(
      `SELECT id FROM sessions
       WHERE user_id = $1 AND refresh_token_hash = $2 AND is_active = TRUE AND expires_at > NOW()`,
      [decoded.userId, tokenHash]
    );

    if (!sessionResult.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId, decoded.role);
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await query(
      'UPDATE sessions SET refresh_token_hash = $1, last_used_at = NOW() WHERE id = $2',
      [newHash, sessionResult.rows[0].id]
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// ─── LOGOUT ──────────────────────────────────────────────────
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query('UPDATE sessions SET is_active = FALSE WHERE refresh_token_hash = $1', [tokenHash]).catch(() => {});
  }
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

// ─── FORGOT PASSWORD ─────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query('SELECT id, owner_name FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows.length) {
      return res.json({ success: true, message: 'If your email is registered, you will receive a reset link.' });
    }
    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60000);
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Kala Is Art - Password Reset Request',
      template: 'reset_password',
      data: { name: user.owner_name, resetUrl },
    }).catch(err => logger.warn('Reset email failed:', err.message));
    res.json({ success: true, message: 'If your email is registered, you will receive a reset link.' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Password reset request failed' });
  }
};

// ─── RESET PASSWORD ──────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const result = await query(
      `SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );
    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
      [password_hash, result.rows[0].id]
    );
    await query('UPDATE sessions SET is_active = FALSE WHERE user_id = $1', [result.rows[0].id]);
    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

// ─── GET PROFILE ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, role, business_name, owner_name, email, mobile, gst_number, brand_tagline,
              avatar_url, is_email_verified, account_status, renewal_date, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// ─── GET SESSIONS ────────────────────────────────────────────
const getSessions = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, device_name, browser, ip_address, last_used_at, created_at
       FROM sessions WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
       ORDER BY last_used_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get sessions' });
  }
};

// ─── REVOKE SESSION ──────────────────────────────────────────
const revokeSession = async (req, res) => {
  try {
    await query(
      'UPDATE sessions SET is_active = FALSE WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.user.id]
    );
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
};

module.exports = {
  register, verifyOTP, sendVerificationEmail,
  login, refreshToken, logout,
  forgotPassword, resetPassword,
  getProfile, getSessions, revokeSession,
};
