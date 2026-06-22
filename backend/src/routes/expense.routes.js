const router = require('express').Router();
const {
  getExpenses, createExpense, updateExpense, deleteExpense, getExpenseReport,
  getIncome, createIncome, updateIncome, deleteIncome, getIncomeReport,
} = require('../controllers/accounting.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');

router.use(authenticate, requireSubscription);

// Expenses
router.get('/expenses', getExpenses);
router.get('/expenses/report', getExpenseReport);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

module.exports = router;
