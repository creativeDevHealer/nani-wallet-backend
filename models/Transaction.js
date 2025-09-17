const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['send', 'receive', 'top_up', 'swap'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'cancelled'],
    default: 'pending'
  },
  amount: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  tokenAddress: {
    type: String,
    default: null // null for native tokens (ETH, BNB, etc.)
  },
  recipientAddress: {
    type: String,
    default: null
  },
  senderAddress: {
    type: String,
    default: null
  },
  txHash: {
    type: String,
    default: null
  },
  blockNumber: {
    type: Number,
    default: null
  },
  gasUsed: {
    type: String,
    default: null
  },
  gasPrice: {
    type: String,
    default: null
  },
  network: {
    type: String,
    required: true,
    default: 'ethereum'
  },
  chainId: {
    type: Number,
    required: true,
    default: 1
  },
  // For top-up transactions
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'mobile_money', 'crypto'],
    default: null
  },
  paymentReference: {
    type: String,
    default: null
  },
  // For compliance
  purpose: {
    type: String,
    default: null
  },
  kycVerified: {
    type: Boolean,
    default: false
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
  },
  confirmedAt: {
    type: Date,
    default: null
  }
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

// Update the updatedAt field before saving
transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
