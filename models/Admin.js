const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  permissions: {
    users: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    kyc: {
      view: { type: Boolean, default: true },
      approve: { type: Boolean, default: true },
      reject: { type: Boolean, default: true }
    },
    transactions: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: true },
      export: { type: Boolean, default: false }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12); // Higher salt rounds for admin accounts
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 3 failed attempts for 4 hours (stricter for admin)
  if (this.loginAttempts + 1 >= 3 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 4 * 60 * 60 * 1000 }; // 4 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Check permission
adminSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'super_admin') return true;
  return this.permissions[resource] && this.permissions[resource][action];
};

// Transform JSON output (remove sensitive data)
adminSchema.methods.toJSON = function() {
  const adminObject = this.toObject();
  delete adminObject.password;
  delete adminObject.loginAttempts;
  delete adminObject.lockUntil;
  return adminObject;
};

module.exports = mongoose.model('Admin', adminSchema);
