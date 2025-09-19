const express = require('express');
const router = express.Router();
const { verifyAppToken } = require('../controllers/auth');
const {
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  verifyPaymentMethod
} = require('../controllers/paymentMethodController');

// All payment method routes require authentication
router.use(verifyAppToken);

// Get user's payment methods
router.get('/:userId', getPaymentMethods);

// Add a new payment method
router.post('/', addPaymentMethod);

// Update a payment method
router.put('/:paymentMethodId', updatePaymentMethod);

// Delete a payment method
router.delete('/:paymentMethodId', deletePaymentMethod);

// Verify a payment method
router.post('/:paymentMethodId/verify', verifyPaymentMethod);

module.exports = router;
