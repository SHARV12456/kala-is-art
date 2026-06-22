const router = require('express').Router();
const { getIncome, createIncome, updateIncome, deleteIncome, getIncomeReport } = require('../controllers/accounting.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');

router.use(authenticate, requireSubscription);

router.get('/', getIncome);
router.get('/report', getIncomeReport);
router.post('/', createIncome);
router.put('/:id', updateIncome);
router.delete('/:id', deleteIncome);

module.exports = router;
