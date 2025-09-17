const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['card', 'bank_account', 'mobile_money', 'crypto_wallet'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  // For cards
  cardLast4: {
    type: String,
    default: null
  },
  cardBrand: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover'],
    default: null
  },
  cardExpiryMonth: {
    type: Number,
    default: null
  },
  cardExpiryYear: {
    type: Number,
    default: null
  },
  // For bank accounts
  bankName: {
    type: String,
    default: null
  },
  accountNumber: {
    type: String,
    default: null
  },
  routingNumber: {
    type: String,
    default: null
  },
  // For mobile money
  mobileProvider: {
    type: String,
    enum: ['mpesa', 'orange_money', 'airtel_money', 'mtn_mobile_money'],
    default: null
  },
  mobileNumber: {
    type: String,
    default: null
  },
  // For crypto wallets
  cryptoAddress: {
    type: String,
    default: null
  },
  cryptoNetwork: {
    type: String,
    default: null
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Security
  encryptedData: {
    type: String,
    default: null
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
paymentMethodSchema.index({ userId: 1, isActive: 1 });
paymentMethodSchema.index({ type: 1 });

// Update the updatedAt field before saving
paymentMethodSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
