const express = require('express')
const dotenv = require("dotenv")
const cors = require("cors")
const { connectMongo } = require('./config/mongodb')

// Load environment variables
dotenv.config()

// Import routes
const otpRouter = require('./routes/otp')
const authRouter = require('./routes/auth')
const transactionRouter = require('./routes/transaction')
const paymentMethodRouter = require('./routes/paymentMethod')
const kycRouter = require('./routes/kyc')
const adminRouter = require('./routes/admin')

// Import middleware
const { requestLogger, requestId } = require('./middlewares/logger')
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler')
const { securityHeaders, rateLimiter, authRateLimiter, otpRateLimiter } = require('./middlewares/security')

const app = express()
const port = process.env.PORT || 3000

// Security middleware
app.use(securityHeaders)
app.use(requestId)
app.use(requestLogger)

// CORS configuration - Allow all origins for development
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}))

// Body parsing middleware
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Static file serving for uploads with CORS headers
const path = require('path');

// Handle preflight requests for uploads
app.options('/uploads/:folder/:filename', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    res.sendStatus(200);
});

// Serve static files with explicit CORS headers
app.use('/uploads', (req, res, next) => {
    // Set CORS headers for all responses
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api/', rateLimiter)

// Image proxy endpoint to bypass CORS issues
app.get('/api/image/:folder/:filename', (req, res) => {
    const { folder, filename } = req.params;
    const imagePath = path.join(__dirname, 'uploads', folder, filename);
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Check if download is requested
    const isDownload = req.query.download === 'true';
    if (isDownload) {
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        res.header('Content-Type', 'application/octet-stream');
    }
    
    // Send the file
    res.sendFile(imagePath, (err) => {
        if (err) {
            res.status(404).json({ error: 'Image not found' });
        }
    });
});

// Apply stricter rate limiting to sensitive endpoints
app.use('/api/otp', otpRateLimiter, otpRouter)
app.use('/api/auth', authRateLimiter, authRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/payment-methods', paymentMethodRouter)
app.use('/api/kyc', kycRouter)
app.use('/api/admin', adminRouter)

// Test endpoint to check database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const connectionState = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        res.json({
            success: true,
            message: 'Database connection test',
            connectionState: states[connectionState],
            isConnected: connectionState === 1
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Initialize MongoDB and start server
const startServer = async () => {
    try {
        await connectMongo();
        app.listen(port, "0.0.0.0", () => {
            console.log(`🚀 Server running on http://localhost:${port}`)
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
            console.log(`🗄️  Database: ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naniwallet'}`)
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();