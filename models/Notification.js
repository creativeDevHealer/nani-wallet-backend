const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['transaction', 'kyc', 'security', 'system', 'promotion'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Transaction-specific fields
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  // Notification status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  // Push notification specific
  fcmToken: {
    type: String,
    default: null
  },
  pushSent: {
    type: Boolean,
    default: false
  },
  pushDelivered: {
    type: Boolean,
    default: false
  },
  // Priority and scheduling
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  scheduledFor: {
    type: Date,
    default: null // null means send immediately
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  }
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ scheduledFor: 1 });

// Update timestamps before saving
notificationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    if (this.status === 'sent' && !this.sentAt) {
      this.sentAt = now;
    }
    
    if (this.status === 'delivered' && !this.deliveredAt) {
      this.deliveredAt = now;
    }
    
    if (this.status === 'read' && !this.readAt) {
      this.readAt = now;
    }
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
