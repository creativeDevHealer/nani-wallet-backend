const express = require('express');
const router = express.Router();

// Import admin controllers
const { 
  adminLogin, 
  verifyAdminToken, 
  requirePermission, 
  getAdminProfile,
  createSuperAdmin
} = require('../controllers/adminAuth');

const {
  getUsers,
  getUserById,
  updateUserStatus,
  getKYCSubmissions,
  getKYCById,
  updateKYCStatus,
  getDashboardStats
} = require('../controllers/adminController');

// Public admin routes
router.post('/login', adminLogin);
router.post('/setup', createSuperAdmin); // Only works if no admins exist

// Protected admin routes
router.use(verifyAdminToken); // All routes below require admin authentication

// Admin profile
router.get('/profile', getAdminProfile);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// User management routes
router.get('/users', requirePermission('users', 'view'), getUsers);
router.get('/users/:userId', requirePermission('users', 'view'), getUserById);
router.put('/users/:userId/status', requirePermission('users', 'edit'), updateUserStatus);

// KYC management routes
router.get('/kyc', requirePermission('kyc', 'view'), getKYCSubmissions);
router.get('/kyc/:kycId', requirePermission('kyc', 'view'), getKYCById);
router.put('/kyc/:kycId/status', requirePermission('kyc', 'approve'), updateKYCStatus);

module.exports = router;
