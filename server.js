const express = require('express')
const dotenv = require("dotenv")
const cors = require("cors")
const { connectMongo } = require('./config/mongodb')

dotenv.config()

const otpRouter = require('./routes/otp')
const authRouter = require('./routes/auth')
const transactionRouter = require('./routes/transaction')
const paymentMethodRouter = require('./routes/paymentMethod')
const app = express()
const port = 3000

app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

app.use('/api/otp', otpRouter)
app.use('/api/auth', authRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/payment-methods', paymentMethodRouter)

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

// Initialize MongoDB and start server
const startServer = async () => {
    try {
        await connectMongo();
        app.listen(port, "0.0.0.0", () => {
            console.log(`Server running on http://localhost:${port}`)
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();