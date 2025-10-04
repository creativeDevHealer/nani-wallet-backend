const mongoose = require('mongoose');

const clearTransactions = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/naniwallet');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');
    
    const countBefore = await transactionsCollection.countDocuments();
    console.log(`Found ${countBefore} transactions to delete`);
    
    if (countBefore > 0) {
      const result = await transactionsCollection.deleteMany({});
      console.log(`Successfully deleted ${result.deletedCount} transactions`);
    }
    
    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
  }
};