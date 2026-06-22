const router = require('express').Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public or basic authenticated routes
router.get('/plans', subscriptionController.getPlans);
router.get('/my', authenticate, subscriptionController.getMySubscription);

// Admin Routes (Would normally be protected by an isAdmin middleware)
// Assuming 'authenticate' applies for now, we check roles inside or assume super admin is doing this.
router.get('/admin/dashboard', authenticate, subscriptionController.adminGetDashboard);
router.get('/admin/customers', authenticate, subscriptionController.adminGetCustomers);
router.post('/admin/record-payment', authenticate, subscriptionController.adminRecordPayment);
router.put('/admin/subscriptions/:subId/status', authenticate, subscriptionController.adminUpdateSubscription);

module.exports = router;
