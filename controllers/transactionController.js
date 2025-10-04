const Transaction = require('../models/Transaction');
const PaymentMethod = require('../models/PaymentMethod');
const { ethers } = require('ethers');
const { createTransactionNotification } = require('./notificationController');

// Get transaction history for a user
const getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type, status } = req.query;
    
    const query = { userId };
    if (type) query.type = type;
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'fullName email');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history'
    });
  }
};

// Get a specific transaction
const getTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = await Transaction.findById(transactionId)
      .populate('userId', 'fullName email');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
};

// Create a new transaction (for tracking)
const createTransaction = async (req, res) => {
  try {
    const {
      userId,
      walletId,
      type,
      amount,
      currency,
      tokenAddress,
      recipientAddress,
      senderAddress,
      network,
      chainId,
      paymentMethod,
      purpose
    } = req.body;
    
    const transaction = new Transaction({
      userId,
      walletId,
      type,
      amount,
      currency,
      tokenAddress,
      recipientAddress,
      senderAddress,
      network,
      chainId,
      paymentMethod,
      purpose,
      status: 'pending'
    });
    
    await transaction.save();
    
    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
};

// Update transaction status
const updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, txHash, blockNumber, gasUsed, gasPrice } = req.body;
    
    const updateData = { status };
    if (txHash) updateData.txHash = txHash;
    if (blockNumber) updateData.blockNumber = blockNumber;
    if (gasUsed) updateData.gasUsed = gasUsed;
    if (gasPrice) updateData.gasPrice = gasPrice;
    if (status === 'confirmed') updateData.confirmedAt = new Date();
    
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      updateData,
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Create notification when transaction status changes to confirmed
    if (status === 'confirmed') {
      try {
        await createTransactionNotification(transaction.userId, transaction);
      } catch (notificationError) {
        console.warn('Failed to create transaction notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction'
    });
  }
};

// Estimate gas for a transaction
const estimateGas = async (req, res) => {
  try {
    const { to, value, data, network } = req.body;
    
    // This is a simplified gas estimation
    // In production, you'd use actual RPC providers
    const gasEstimate = {
      gasLimit: '21000', // Standard ETH transfer
      gasPrice: '20000000000', // 20 gwei
      maxFeePerGas: '25000000000', // 25 gwei
      maxPriorityFeePerGas: '2000000000' // 2 gwei
    };
    
    res.json({
      success: true,
      data: gasEstimate
    });
  } catch (error) {
    console.error('Error estimating gas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate gas'
    });
  }
};

// Broadcast transaction (for tracking purposes)
const broadcastTransaction = async (req, res) => {
  try {
    const { transactionId, txHash } = req.body;
    
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        txHash,
        status: 'pending'
      },
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error broadcasting transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast transaction'
    });
  }
};

// Get transactions by ETH address
const getTransactionsByEthAddress = async (req, res) => {
  try {
    const { ethaddress } = req.params;
    const { page = 1, limit = 20, type, status, token, network } = req.query;
    
    // Validate ETH address format
    if (!ethers.isAddress(ethaddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ETH address format'
      });
    }
    
    const query = { ethaddress: ethaddress.toLowerCase() };
    if (type) query.type = type;
    if (status) query.status = status;
    if (token) query.token = token;
    if (network) query.network = network;
    
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'fullName email');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions by ETH address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
};

// Store transaction history
const storeTransactionHistory = async (req, res) => {
  try {
    const {
      ethaddress,
      txHash,
      toAddress,
      amountUSD,
      type,
      token,
      network,
      status = 'pending',
      timestamp,
      userId,
      // Optional fields for backward compatibility
      amount,
      currency,
      tokenAddress,
      recipientAddress,
      senderAddress,
      blockNumber,
      gasUsed,
      gasPrice,
      chainId,
      paymentMethod,
      purpose,
      kycVerified,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!ethaddress || !txHash || !toAddress || !amountUSD || !type || !token || !network) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ethaddress, txHash, toAddress, amountUSD, type, token, network'
      });
    }
    
    // Validate ETH address format
    if (!ethers.isAddress(ethaddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ETH address format'
      });
    }
    
    // Validate toAddress format
    if (!ethers.isAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid toAddress format'
      });
    }
    
    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({ txHash });
    if (existingTransaction) {
      return res.status(409).json({
        success: false,
        error: 'Transaction with this hash already exists'
      });
    }
    
    const transaction = new Transaction({
      ethaddress: ethaddress.toLowerCase(),
      txHash,
      toAddress: toAddress.toLowerCase(),
      amountUSD,
      type,
      token,
      network,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      userId: userId || null,
      // Legacy fields
      amount,
      currency,
      tokenAddress,
      recipientAddress,
      senderAddress,
      blockNumber,
      gasUsed,
      gasPrice,
      chainId,
      paymentMethod,
      purpose,
      kycVerified,
      metadata
    });
    
    await transaction.save();
    
    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error storing transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store transaction history'
    });
  }
};

// Update transaction by txHash
const updateTransactionByHash = async (req, res) => {
  try {
    const { txHash } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated
    delete updateData.txHash;
    delete updateData._id;
    delete updateData.createdAt;
    
    const transaction = await Transaction.findOneAndUpdate(
      { txHash },
      updateData,
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction by hash:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction'
    });
  }
};

// Get transaction statistics
const getTransactionStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$amount' } }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics'
    });
  }
};

module.exports = {
  getTransactionHistory,
  getTransaction,
  createTransaction,
  updateTransactionStatus,
  estimateGas,
  broadcastTransaction,
  getTransactionStats,
  getTransactionsByEthAddress,
  storeTransactionHistory,
  updateTransactionByHash
};
