const express = require('express');
const router = express.Router();
const { submitKYC, getKYCStatus, getPendingKYC, updateKYCStatus, upload } = require('../controllers/kyc');
const { verifyAppToken } = require('../controllers/auth');

// Use the proper JWT verification middleware from auth controller
const authenticateToken = verifyAppToken;

// Submit KYC information
router.post('/submit', authenticateToken, upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]), submitKYC);

// Get KYC status
router.get('/status', authenticateToken, getKYCStatus);

// Admin routes (would require admin authentication in production)
router.get('/pending', authenticateToken, getPendingKYC);
router.post('/update-status', authenticateToken, updateKYCStatus);

module.exports = router;
