// ============================================================
// KALA IS ART - Notification Utility
// ============================================================
const { query } = require('../config/database');
const logger = require('../config/logger');

const createNotification = async ({ userId, type, title, message, data = {}, actionUrl }) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, action_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, JSON.stringify(data), actionUrl || null]
    );
  } catch (error) {
    logger.error('Create notification error:', error.message);
  }
};

const getNotifications = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const markAsRead = async (notificationId, userId) => {
  await query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
};

const markAllAsRead = async (userId) => {
  await query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
};

module.exports = { createNotification, getNotifications, markAsRead, markAllAsRead };
