// ============================================================
// KALA IS ART - Auth Middleware
// Simple account-status based access control (no subscriptions)
// ============================================================
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Verify access token and attach user to request.
 * Blocks 'disabled' accounts at token-validation level.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Access token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid access token' });
    }

    // Fetch full user + account_status on every request
    const result = await query(
      `SELECT id, role, owner_name, email, mobile, business_name,
              is_active, is_email_verified, account_status, renewal_date
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    // 'disabled' = login blocked entirely
    if (!user.is_active || user.account_status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Account inactive. Please contact administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    req.user = user;
    req.tokenData = decoded;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

/**
 * Enforce account access level:
 * - active      → full access
 * - payment_due → full access (notification shown in UI only)
 * - suspended   → 403 ACCOUNT_SUSPENDED
 * - disabled    → already blocked in authenticate()
 * - super_admin → always passes
 */
const requireAccountAccess = (req, res, next) => {
  if (req.user.role === 'super_admin') return next();

  const status = req.user.account_status;

  if (status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Account temporarily suspended. Please contact administrator.',
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  // active and payment_due both get full CRM access
  next();
};

// Alias — keeps backward-compat with all existing route files
// that use requireSubscription. Now just checks account status.
const requireSubscription = requireAccountAccess;

/**
 * Require specific roles
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.',
    });
  }
  next();
};

const requireAdmin = requireRole('super_admin');

module.exports = {
  authenticate,
  requireAccountAccess,
  requireSubscription,   // backward-compat alias
  requireRole,
  requireAdmin,
};
