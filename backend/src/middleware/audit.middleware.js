// ============================================================
// KALA IS ART - Audit Log Middleware
// ============================================================
const { query } = require('../config/database');
const logger = require('../config/logger');

const auditLog = (action, resourceType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (data) => {
    if (res.statusCode < 400 && req.user) {
      try {
        await query(
          `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, description, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user.id,
            action,
            resourceType,
            req.params.id || data?.data?.id || null,
            `${req.method} ${req.originalUrl}`,
            req.ip,
            req.headers['user-agent'],
          ]
        );
      } catch (err) {
        logger.error('Audit log error:', err.message);
      }
    }
    return originalJson(data);
  };

  next();
};

module.exports = { auditLog };
