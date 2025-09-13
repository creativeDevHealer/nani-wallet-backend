const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, index: true },
        otpCode: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

// Automatically delete documents after expiration
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);


