const PaymentMethod = require('../models/PaymentMethod');

// Get user's payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const paymentMethods = await PaymentMethod.find({
      userId,
      isActive: true
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
};

// Add a new payment method
const addPaymentMethod = async (req, res) => {
  try {
    const {
      userId,
      type,
      name,
      cardLast4,
      cardBrand,
      cardExpiryMonth,
      cardExpiryYear,
      bankName,
      accountNumber,
      routingNumber,
      mobileProvider,
      mobileNumber,
      cryptoAddress,
      cryptoNetwork
    } = req.body;
    
    const paymentMethod = new PaymentMethod({
      userId,
      type,
      name,
      cardLast4,
      cardBrand,
      cardExpiryMonth,
      cardExpiryYear,
      bankName,
      accountNumber,
      routingNumber,
      mobileProvider,
      mobileNumber,
      cryptoAddress,
      cryptoNetwork,
      isActive: true,
      isVerified: false
    });
    
    await paymentMethod.save();
    
    res.status(201).json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add payment method'
    });
  }
};

// Update a payment method
const updatePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const updateData = req.body;
    
    const paymentMethod = await PaymentMethod.findByIdAndUpdate(
      paymentMethodId,
      updateData,
      { new: true }
    );
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    res.json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment method'
    });
  }
};

// Delete a payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    
    const paymentMethod = await PaymentMethod.findByIdAndUpdate(
      paymentMethodId,
      { isActive: false },
      { new: true }
    );
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment method'
    });
  }
};

// Verify a payment method
const verifyPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    
    const paymentMethod = await PaymentMethod.findByIdAndUpdate(
      paymentMethodId,
      { isVerified: true },
      { new: true }
    );
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    res.json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error verifying payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment method'
    });
  }
};

module.exports = {
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  verifyPaymentMethod
};
