const admin = require('firebase-admin');
const serviceAccount = require("../naniwallet-faf9e-firebase-adminsdk-fbsvc-fc0d553440.json");

// Initialize Firebase Admin SDK
let db;

const initializeFirebase = () => {
    try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        db = admin.firestore();
        console.log('✅ Firebase initialized successfully');
        return db;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        throw error;
    }
};

// Get Firestore database instance
const getFirestore = () => {
    if (!db) {
        return initializeFirebase();
    }
    return db;
};

// Check if Firebase is available
const isFirebaseAvailable = () => {
    return db !== null && db !== undefined;
};

module.exports = {
    admin,
    initializeFirebase,
    getFirestore,
    isFirebaseAvailable
};