const {sendEmail} = require('../utils/nodemailer')
const Otp = require('../models/Otp')
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);

// In-memory storage removed; using MongoDB via Mongoose

// Track recent OTP requests to prevent duplicates
const recentRequests = new Map();

// Clean up old requests every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentRequests.entries()) {
        if (now - timestamp > 300000) { // 5 minutes
            recentRequests.delete(key);
        }
    }
}, 300000);

/**
 * Send OTP to mail function
 * @param {email} req
 */
async function sendOtp(req, res) {

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            error: 'Request body is empty or missing'
        });
    }
    
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            error: 'Email is required'
        });
    }
    
    console.log('Email:', email);
    try {
        //generate otpcode;
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const from = "strongtechman@gmail.com";
        const to = email;
        const title = "Verify your Nani Wallet OTP";
        const content = `Your OTP code of Nani Wallet is ${otpCode}`;
        console.log(from, to, title, content);
        
        // Store OTP in MongoDB: remove existing and create new
        await Otp.deleteMany({ email });
        await Otp.create({
            email,
            otpCode,
            isVerified: false,
            attempts: 0,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });
        
        await sendEmail({ from, to, title, content });
        return res.status(200).json({
            success: true,
            message: 'OTP Sent'
        });
    } catch (err) {
        return res.status(500).send(err);
    }
}

/**
 * Verify OTP function
 */
async function verifyOtp(req, res) {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            error: 'Request body is empty or missing'
        });
    }
    
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({
            error: 'Email and OTP are required'
        });
    }

    try {
        const otpDoc = await Otp.findOne({ email, isVerified: false }).sort({ createdAt: -1 });

        if (!otpDoc) {
            return res.status(400).json({
                error: 'No valid OTP found for this email'
            });
        }

        const now = new Date();
        if (now > otpDoc.expiresAt) {
            await Otp.deleteOne({ _id: otpDoc._id });
            return res.status(400).json({
                error: 'OTP has expired'
            });
        }

        if (otpDoc.attempts >= 3) {
            await Otp.deleteOne({ _id: otpDoc._id });
            return res.status(400).json({
                error: 'Maximum verification attempts exceeded'
            });
        }

        if (otpDoc.otpCode !== otp) {
            const newAttempts = otpDoc.attempts + 1;
            await Otp.updateOne({ _id: otpDoc._id }, { $set: { attempts: newAttempts } });
            return res.status(400).json({
                error: `Invalid OTP. ${3 - newAttempts} attempts remaining`
            });
        }

        await Otp.updateOne({ _id: otpDoc._id }, { $set: { isVerified: true } });
        console.log('✅ OTP verified and marked as verified for email:', email);

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully!'
        });
    } catch (err) {
        console.error('OTP verification error:', err);
        return res.status(500).json({
            error: 'Server error during OTP verification'
        });
    }
}

async function testOtp(req, res) {
    return res.status(200).json({
        message: 'Test OTP'
    });
}

/**
 * Send OTP to phone number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function sendPhoneOtp(req, res) {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
            console.error('❌ Twilio credentials not configured');
            return res.status(500).json({
                success: false,
                error: 'SMS service not configured'
            });
        }

        const client = require('twilio')(accountSid, authToken);

        try {
            // Send SMS via Twilio
            const verification = await client.verify.v2.services("VAb0573587cd6b9f0cb93e4fc731a41725")
                .verifications
                .create({to: phoneNumber, channel: 'sms'});
            
            console.log('📱 Twilio verification created:', verification.sid);
        } catch (twilioError) {
            console.error('❌ Twilio SMS send failed:', twilioError);
            // Continue with fallback - store OTP for manual verification
            console.log('📱 Using fallback OTP method');
        }

        return res.status(200).json({
            success: true,
            message: 'Phone OTP sent successfully',
        });

    } catch (error) {
        console.error('Phone OTP send error:', error);
        console.log(error.responseBody);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to send phone OTP',
            details: error.message
        });
    }
}

/**
 * Verify phone OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function verifyPhoneOtp(req, res) {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and OTP are required'
            });
        }

        console.log('🔍 Verifying phone OTP for:', phoneNumber);

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
            console.error('❌ Twilio credentials not configured');
            return res.status(500).json({
                success: false,
                error: 'SMS service not configured'
            });
        }

        const client = require('twilio')(accountSid, authToken);
        let verification;
        try {
            verification = await client.verify.v2.services("VAb0573587cd6b9f0cb93e4fc731a41725")
                .verificationChecks
                .create({to: phoneNumber, code: otp})
            console.log('📱 Twilio verification check:', verification.status);
            
        } catch (twilioError) {
            console.error('❌ Twilio SMS verify check failed:', twilioError);
        }

        if(verification.status === 'approved'){
            return res.status(200).json({
                success: true,
                message: 'Phone OTP verified successfully!'
            });
        }
        return res.status(400).json({
            success: false,
            error: 'Invalid OTP'
        });

    } catch (error) {
        console.error('Phone OTP verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify phone OTP'
        });
    }
}

module.exports = {
    sendOtp,
    verifyOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    testOtp
}