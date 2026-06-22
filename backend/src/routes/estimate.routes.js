const router = require('express').Router();
const estimateController = require('../controllers/estimate.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');

router.use(authenticate, requireSubscription);

router.get('/', estimateController.getEstimates);
router.get('/:id', estimateController.getEstimate);
router.get('/:id/pdf', estimateController.downloadEstimatePDF);
router.post('/', estimateController.createEstimate);
router.put('/:id', estimateController.updateEstimate);
router.delete('/:id', estimateController.deleteEstimate);

module.exports = router;
