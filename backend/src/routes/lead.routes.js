const router = require('express').Router();
const leadController = require('../controllers/lead.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');

router.use(authenticate, requireSubscription);

router.get('/export', leadController.exportLeads);
router.get('/stats', leadController.getLeadStats);
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLead);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.patch('/:id/status', leadController.updateLeadStatus);
router.patch('/:id/convert', leadController.convertToClient);
router.delete('/:id', leadController.deleteLead);

module.exports = router;

