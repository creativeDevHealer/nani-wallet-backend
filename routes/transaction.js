const express = require('express');
const router = express.Router();
const { verifyAppToken } = require('../controllers/auth');
const {
  getTransactionHistory,
  getTransaction,
  createTransaction,
  updateTransactionStatus,
  estimateGas,
  broadcastTransaction,
  getTransactionStats
} = require('../controllers/transactionController');

// All transaction routes require authentication
router.use(verifyAppToken);

// Get transaction history for a user
router.get('/history/:userId', getTransactionHistory);

// Get a specific transaction
router.get('/:transactionId', getTransaction);

// Create a new transaction
router.post('/', createTransaction);

// Update transaction status
router.put('/:transactionId/status', updateTransactionStatus);

// Estimate gas for a transaction
router.post('/estimate-gas', estimateGas);

// Broadcast transaction
router.post('/broadcast', broadcastTransaction);

// Get transaction statistics
router.get('/stats/:userId', getTransactionStats);

module.exports = router;
