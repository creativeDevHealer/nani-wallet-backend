const express = require('express');
const router = express.Router();

const { 
    verifyWeb3AuthToken, 
    verifyAppToken, 
    getUserProfile, 
    updateUserProfile, 
    signOut,
    registerUser,
    loginUser,
    verifyToken
} = require('../controllers/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-token', verifyToken);
router.post('/verify', verifyWeb3AuthToken);

// Protected routes (require authentication)
router.get('/profile', verifyAppToken, getUserProfile);
router.put('/profile', verifyAppToken, updateUserProfile);
router.post('/signout', verifyAppToken, signOut);

module.exports = router;
