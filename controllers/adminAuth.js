const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Admin login
 */
async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username },
        { email: username.toLowerCase() }
      ]
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }

    // Update last login
    await Admin.updateOne(
      { _id: admin._id },
      { lastLogin: new Date() }
    );

    // Generate JWT token
    const token = generateAdminJWT(admin);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Verify admin JWT token middleware
 */
function verifyAdminToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Ensure it's an admin token
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

/**
 * Check specific permission middleware
 */
function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      const admin = await Admin.findById(req.admin.adminId);
      
      if (!admin || !admin.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Admin account not found or inactive'
        });
      }

      if (!admin.hasPermission(resource, action)) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions for ${resource}.${action}`
        });
      }

      req.adminUser = admin;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

/**
 * Get admin profile
 */
async function getAdminProfile(req, res) {
  try {
    const admin = await Admin.findById(req.admin.adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Generate JWT token for admin
 */
function generateAdminJWT(admin) {
  const payload = {
    adminId: admin._id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    isAdmin: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 hours (shorter for admin)
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key');
}

/**
 * Create initial super admin (for setup)
 */
async function createSuperAdmin(req, res) {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Admin users already exist. Use regular admin creation.'
      });
    }

    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Create super admin
    const superAdmin = new Admin({
      username,
      email: email.toLowerCase(),
      password,
      fullName,
      role: 'super_admin',
      permissions: {
        users: { view: true, edit: true, delete: true },
        kyc: { view: true, approve: true, reject: true },
        transactions: { view: true, edit: true },
        reports: { view: true, export: true }
      }
    });

    await superAdmin.save();

    const token = generateAdminJWT(superAdmin);

    return res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      token,
      admin: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        role: superAdmin.role
      }
    });

  } catch (error) {
    console.error('Create super admin error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  adminLogin,
  verifyAdminToken,
  requirePermission,
  getAdminProfile,
  createSuperAdmin,
  generateAdminJWT
};
