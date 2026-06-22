// ============================================================
// KALA IS ART - Auth Routes
// Frictionless signup — no mandatory OTP
// ============================================================
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: errors.array()[0].msg,
    });
  }
  next();
};

// ─── REGISTER (Instant — No OTP required) ─────────────────────
router.post('/register', [
  body('owner_name').trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('business_name').optional().trim(),
  body('mobile')
    .isMobilePhone('en-IN').withMessage('Enter a valid 10-digit Indian mobile number'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Enter a valid email address'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
], validate, authController.register);

// ─── VERIFY OTP (Optional email verification) ─────────────────
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP required'),
], validate, authController.verifyOTP);

// ─── SEND VERIFICATION EMAIL (Optional — authenticated) ───────
router.post('/send-verification', authenticate, authController.sendVerificationEmail);

// ─── LOGIN ─────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, authController.login);

// ─── REFRESH TOKEN ─────────────────────────────────────────────
router.post('/refresh', authController.refreshToken);

// ─── LOGOUT ───────────────────────────────────────────────────
router.post('/logout', authController.logout);

// ─── FORGOT PASSWORD ──────────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], validate, authController.forgotPassword);

// ─── RESET PASSWORD ───────────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, authController.resetPassword);

// ─── PROTECTED PROFILE & SESSION ROUTES ───────────────────────
router.get('/profile',                    authenticate, authController.getProfile);
router.get('/sessions',                   authenticate, authController.getSessions);
router.delete('/sessions/:sessionId',     authenticate, authController.revokeSession);

module.exports = router;
