const express = require('express')
const router = express.Router()

const { sendOtp, verifyOtp, testOtp, sendPhoneOtp, verifyPhoneOtp} = require('../controllers/otp')

router.post('/send', sendOtp)
router.post('/verify', verifyOtp)
router.post('/send-phone', sendPhoneOtp)
router.post('/verify-phone', verifyPhoneOtp)
router.get('/test', testOtp)

module.exports = router