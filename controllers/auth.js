const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');
const KYC = require('../models/KYC');
const Otp = require('../models/Otp');

/**
 * Verify Web3Auth token and create session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function verifyWeb3AuthToken(req, res) {
    try {
        const { idToken, walletAddress, email, fullName } = req.body;

        if (!idToken || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: idToken and walletAddress'
            });
        }

        console.log('🔐 Verifying Web3Auth token for wallet:', walletAddress);

        // Verify the Web3Auth ID token
        // Note: In production, you should verify the token signature
        // For now, we'll decode it to get user information
        const decodedToken = jwt.decode(idToken);
        
        if (!decodedToken) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        // Verify wallet address format
        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ 
            $or: [
                { email: email?.toLowerCase() },
                { walletAddress: walletAddress }
            ]
        });

        if (!user) {
            // Create new user with Web3Auth data
            console.log('👤 Creating new user with Web3Auth data');
            user = new User({
                email: email?.toLowerCase() || `wallet_${walletAddress.slice(0, 8)}@naniwallet.com`,
                fullName: fullName || 'Web3 User',
                walletAddress: walletAddress,
                emailVerified: true
            });
            await user.save();
            console.log('✅ New user created with ID:', user._id);
            
            // Create initial KYC record
            const kyc = await createInitialKYC(user._id);
            user.kycId = kyc._id;
            await user.save();
            console.log('✅ KYC record linked to user');
        } else {
            // Update existing user with wallet address if not set
            if (!user.walletAddress) {
                user.walletAddress = walletAddress;
                await user.save();
                console.log('✅ Updated existing user with wallet address');
            }
            
            // Ensure existing user has KYC record (backward compatibility)
            if (!user.kycId) {
                const kyc = await createInitialKYC(user._id);
                user.kycId = kyc._id;
                await user.save();
                console.log('✅ Created missing KYC record for existing user');
            }
        }

        // Create a JWT token for our application
        const payload = {
            userId: user._id,
            email: user.email,
            walletAddress: walletAddress,
            verifierId: decodedToken.verifier_id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        const appToken = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key');

        return res.status(200).json({
            success: true,
            token: appToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                walletAddress: user.walletAddress,
                emailVerified: user.emailVerified
            }
        });

    } catch (error) {
        console.error('Web3Auth verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Verify app JWT token middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function verifyAppToken(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
}

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserProfile(req, res) {
    try {
        const user = req.user;

        // In a real application, you would fetch additional user data from database
        return res.status(200).json({
            success: true,
            user: {
                id: user.userId,
                email: user.email,
                walletAddress: user.walletAddress,
                verifierId: user.verifierId
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUserProfile(req, res) {
    try {
        const user = req.user;
        const { displayName, phoneNumber } = req.body;

        // In a real application, you would update user data in database
        // For now, we'll just return success

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.userId,
                email: user.email,
                walletAddress: user.walletAddress,
                displayName: displayName,
                phoneNumber: phoneNumber
            }
        });

    } catch (error) {
        console.error('Update user profile error:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}

/**
 * Sign out user (blacklist token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function signOut(req, res) {
    try {
        // In a real application, you would blacklist the token
        // For now, we'll just return success
        
        return res.status(200).json({
            success: true,
            message: 'Signed out successfully'
        });

    } catch (error) {
        console.error('Sign out error:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}

/**
 * Register new user after OTP verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function registerUser(req, res) {
    try {
        const { email, password, fullName, phoneNumber } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and full name are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Verify OTP was completed (check if OTP exists and is verified)
        console.log('🔍 Looking for verified OTP for email:', email.toLowerCase());
        const verifiedOtp = await Otp.findOne({ 
            email: email.toLowerCase(), 
            isVerified: true 
        });

        console.log('📧 Verified OTP found:', verifiedOtp ? 'YES' : 'NO');

        if (!verifiedOtp) {
            console.log('❌ No verified OTP found for email:', email.toLowerCase());
            return res.status(400).json({
                success: false,
                error: 'Email verification required. Please complete OTP verification first.'
            });
        }

        // Create new user
        console.log('👤 Creating new user for email:', email.toLowerCase());
        const user = new User({
            email: email.toLowerCase(),
            password,
            fullName,
            phoneNumber: phoneNumber,
            emailVerified: true,
            phoneVerified: phoneNumber ? true : false
        });

        await user.save();
        console.log('✅ User created successfully with ID:', user._id);
        
        // Create initial KYC record
        const kyc = await createInitialKYC(user._id);
        user.kycId = kyc._id;
        await user.save();
        console.log('✅ KYC record linked to user');

        // Clean up verified OTP
        await Otp.deleteOne({ _id: verifiedOtp._id });
        console.log('🗑️ Cleaned up verified OTP');

        // Generate JWT token
        const token = generateJWTToken(user);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                emailVerified: user.emailVerified,
                walletAddress: user.walletAddress
            }
        });

    } catch (error) {
        console.error('User registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error during registration'
        });
    }
}

/**
 * User login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked due to too many failed login attempts'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Increment login attempts
            await user.incLoginAttempts();
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0) {
            await user.resetLoginAttempts();
        }

        // Update last login
        await User.updateOne(
            { _id: user._id },
            { lastLogin: new Date() }
        );

        // Generate JWT token
        const token = generateJWTToken(user);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                emailVerified: user.emailVerified,
                walletAddress: user.walletAddress
            }
        });

    } catch (error) {
        console.error('User login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error during login'
        });
    }
}

/**
 * Verify JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function verifyToken(req, res) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if user still exists and is active
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }
        
        // Ensure user has KYC record (backward compatibility)
        if (!user.kycId) {
            const kyc = await createInitialKYC(user._id);
            user.kycId = kyc._id;
            await user.save();
            console.log('✅ Created missing KYC record during token verification');
        }

        return res.status(200).json({
            success: true,
            message: 'Token is valid',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                emailVerified: user.emailVerified,
                walletAddress: user.walletAddress
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
}

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUserProfile(req, res) {
    try {
        const userId = req.user.userId;
        const { fullName, phoneNumber, photoURL } = req.body;

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (photoURL) updateData.photoURL = photoURL;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                walletAddress: user.walletAddress
            }
        });

    } catch (error) {
        console.error('Update user profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error during profile update'
        });
    }
}

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserProfile(req, res) {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Ensure user has KYC record (backward compatibility)
        if (!user.kycId) {
            const kyc = await createInitialKYC(user._id);
            user.kycId = kyc._id;
            await user.save();
            console.log('✅ Created missing KYC record during profile fetch');
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                walletAddress: user.walletAddress,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Create initial KYC record for new user
 * @param {string} userId - User ID
 * @returns {Object} KYC record
 */
async function createInitialKYC(userId) {
    try {
        const kyc = new KYC({
            userId: userId,
            status: 'notstarted'
        });
        await kyc.save();
        console.log('✅ Initial KYC record created for user:', userId);
        return kyc;
    } catch (error) {
        console.error('❌ Failed to create initial KYC record:', error);
        throw error;
    }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateJWTToken(user) {
    const payload = {
        userId: user._id,
        email: user.email,
        fullName: user.fullName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key');
}

module.exports = {
    verifyWeb3AuthToken,
    verifyAppToken,
    getUserProfile,
    updateUserProfile,
    signOut,
    registerUser,
    loginUser,
    verifyToken
};
