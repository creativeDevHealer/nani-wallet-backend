const mongoose = require('mongoose');

const KYCSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['notstarted', 'pending', 'approved', 'rejected'],
    default: 'notstarted'
  },
  personalInfo: {
    firstName: {
      type: String,
      required: false // Only required when submitting KYC
    },
    lastName: {
      type: String,
      required: false // Only required when submitting KYC
    },
    dateOfBirth: {
      type: Date,
      required: false // Only required when submitting KYC
    },
    address: {
      type: String,
      required: false // Only required when submitting KYC
    },
    city: {
      type: String,
      required: false // Only required when submitting KYC
    },
    postalCode: {
      type: String,
      required: false // Only required when submitting KYC
    },
    country: {
      type: String,
      required: false // Only required when submitting KYC
    }
  },
  documentInfo: {
    type: {
      type: String,
      enum: ['passport', 'driving_license', 'national_id'],
      required: false // Only required when submitting KYC
    },
    frontImagePath: {
      type: String,
      required: false // Only required when submitting KYC
    },
    backImagePath: {
      type: String,
      required: false // Not required for passport
    },
    extractedData: {
      documentNumber: String,
      expiryDate: Date,
      issueDate: Date,
      issuingAuthority: String
    }
  },
  verificationNotes: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: null // Only set when KYC is actually submitted
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String // Admin user ID or system
  }
}, {
  timestamps: true
});

// Index for efficient queries
KYCSchema.index({ userId: 1 });
KYCSchema.index({ status: 1 });
KYCSchema.index({ submittedAt: 1 });

module.exports = mongoose.model('KYC', KYCSchema);
