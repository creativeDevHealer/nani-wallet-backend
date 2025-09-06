const {sendEmail} = require('../utils/nodemailer')

/**
 * Send OTP to mail function
 * @param {email} req
 */
async function sendOtp(req, res) {
    const { email } = req.body;
    try {
        //generate otpcode;
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const from = "noreplynaniwallet@gmail.com";
        const to = email;
        const title = "Verify your Nani Wallet OTP";
        const content = `Your OTP code of Nani Wallet is ${otpCode}`;
        //remove otps from firestore if otp of email exists
        //add otp to firestore with email
        await sendEmail(from, to, title, content);
        return res.status(200).json({
            message: 'OTP Sent'
        });
    } catch (err) {
        return res.status(500).send('Server error.');
    }
}

/**
 * Verify OTP function
 */
async function verifyOtp(req, res) {
    const { email, otp } = req.body;

    try {
        //find otp code with email from firestore
        return res.status(200).json({
            message: 'Verify Success!'
        });
    } catch (err) {
        return res.status(500).send('Server error.');
    }
}

module.exports = {
    sendOtp,
    verifyOtp
}