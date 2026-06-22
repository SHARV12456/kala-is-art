const router = require('express').Router();
const { getSummary } = require('../controllers/dashboard.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireSubscription, getSummary);

module.exports = router;

