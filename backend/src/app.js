// ============================================================
// KALA IS ART - Express Application
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');

const app = express();

// ─── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────
// Build allowed origins: explicit FRONTEND_URL + Vercel preview URLs + localhost
const buildAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  // Add configured production frontend URL(s)
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach((u) => origins.push(u.trim()));
  }
  return origins;
};

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and configured origins
    if (!origin) return callback(null, true);
    // Exact match
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any *.vercel.app preview deployment
    if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(compression({
  // Never compress PDF responses — gzip corrupts binary PDF downloads
  filter: (req, res) => {
    if (req.path.endsWith('/pdf')) return false;
    return compression.filter(req, res);
  },
}));

// ─── Logging ──────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ─── Static Files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/leads', require('./routes/lead.routes'));
app.use('/api/clients', require('./routes/client.routes'));
app.use('/api/followups', require('./routes/followup.routes'));
app.use('/api/estimates', require('./routes/estimate.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/income', require('./routes/income.routes'));
app.use('/api/subscriptions', require('./routes/subscription.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/integrations', require('./routes/integration.routes'));

// Client Payment Tracking Routes
const cpCtrl = require('./controllers/clientPayments.controller');
const { authenticate: _auth, requireSubscription: _sub } = require('./middleware/auth.middleware');
const cpAuth = [_auth, _sub];
app.get('/api/clients/:clientId/payments',             cpAuth, cpCtrl.getClientPayments);
app.post('/api/clients/:clientId/payments',            cpAuth, cpCtrl.addPayment);
app.put('/api/clients/:clientId/payments/:paymentId',  cpAuth, cpCtrl.updatePayment);
app.delete('/api/clients/:clientId/payments/:paymentId',cpAuth, cpCtrl.deletePayment);
app.patch('/api/clients/:clientId/project-value',      cpAuth, cpCtrl.setProjectValue);

// Smart CRM Intelligence Routes
const { activityRouter, priorityRouter } = require('./routes/all.routes');
app.use('/api/activities', activityRouter);
app.use('/api/priority', priorityRouter);

// Communication Center Routes
const {
  getFollowupContext, generateFollowupMessage, logWhatsapp,
  sendFollowupEmail, logCall, getHistory, getAnalytics, markEmailOpened
} = require('./controllers/communication.controller');
const { authenticate, requireSubscription } = require('./middleware/auth.middleware');
const commAuth = [authenticate, requireSubscription];

app.get('/api/comms/context/:leadId',    commAuth, getFollowupContext);
app.post('/api/comms/generate',          commAuth, generateFollowupMessage);
app.post('/api/comms/whatsapp',          commAuth, logWhatsapp);
app.post('/api/comms/email',             commAuth, sendFollowupEmail);
app.post('/api/comms/call',              commAuth, logCall);
app.get('/api/comms/history/:leadId',    commAuth, getHistory);
app.get('/api/comms/analytics',          commAuth, getAnalytics);
app.get('/api/comms/track/:id/open.gif', markEmailOpened); // no auth — tracking pixel

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kala Is Art CRM API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS policy violation' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

module.exports = app;
