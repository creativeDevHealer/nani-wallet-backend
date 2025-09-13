const mongoose = require('mongoose');

let isConnected = false;

async function connectMongo() {
    if (isConnected) return;
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naniwallet';
    try {
        await mongoose.connect(uri, {
            autoIndex: true,
        });
        isConnected = true;
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

module.exports = { connectMongo };


