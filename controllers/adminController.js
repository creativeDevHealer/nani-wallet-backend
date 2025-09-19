const User = require('../models/User');
const KYC = require('../models/KYC');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');

/**
 * Get all users with pagination and search
 */
async function getUsers(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      kycStatus = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build search query
    const searchQuery = {};
    
    if (search) {
      searchQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);
    
    // Get users with pagination
    const users = await User.find(searchQuery)
      .populate('kycId', 'status submittedAt reviewedAt')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-password');

    // Filter by KYC status if specified
    let filteredUsers = users;
    if (kycStatus) {
      filteredUsers = users.filter(user => {
        if (!user.kycId) return kycStatus === 'notstarted';
        return user.kycId.status === kycStatus;
      });
    }

    return res.status(200).json({
      success: true,
      users: filteredUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
}

/**
 * Get user details by ID
 */
async function getUserById(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('kycId')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's transaction summary
    const transactionStats = await Transaction.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      user: {
        ...user.toJSON(),
        transactionStats: transactionStats[0] || {
          totalTransactions: 0,
          totalAmount: 0,
          successfulTransactions: 0
        }
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
}

/**
 * Update user status (activate/deactivate)
 */
async function updateUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log admin action
    console.log(`🔧 Admin ${req.admin.username} ${isActive ? 'activated' : 'deactivated'} user ${user.email}. Reason: ${reason || 'None provided'}`);

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
}

/**
 * Get KYC submissions with filters
 */
async function getKYCSubmissions(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Get total count
    const totalKYCs = await KYC.countDocuments(query);

    // Get KYC submissions
    const kycSubmissions = await KYC.find(query)
      .populate('userId', 'fullName email phoneNumber createdAt')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      kycSubmissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalKYCs / limit),
        totalKYCs,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get KYC submissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC submissions'
    });
  }
}

/**
 * Get KYC details by ID
 */
async function getKYCById(req, res) {
  try {
    const { kycId } = req.params;

    const kyc = await KYC.findById(kycId)
      .populate('userId', 'fullName email phoneNumber createdAt walletAddress');

    if (!kyc) {
      return res.status(404).json({
        success: false,
        error: 'KYC submission not found'
      });
    }

    return res.status(200).json({
      success: true,
      kyc
    });

  } catch (error) {
    console.error('Get KYC by ID error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC details'
    });
  }
}

/**
 * Approve or reject KYC
 */
async function updateKYCStatus(req, res) {
  try {
    const { kycId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin.adminId;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "approved" or "rejected"'
      });
    }

    const kyc = await KYC.findById(kycId).populate('userId', 'fullName email');
    
    if (!kyc) {
      return res.status(404).json({
        success: false,
        error: 'KYC submission not found'
      });
    }

    if (kyc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending KYC submissions can be updated'
      });
    }

    // Update KYC status
    const updatedKYC = await KYC.findByIdAndUpdate(
      kycId,
      {
        status,
        verificationNotes: notes || '',
        reviewedAt: new Date(),
        reviewedBy: adminId
      },
      { new: true }
    ).populate('userId', 'fullName email');

    // Log admin action
    const admin = await Admin.findById(adminId);
    console.log(`🔧 Admin ${admin.username} ${status} KYC for user ${updatedKYC.userId.email}. Notes: ${notes || 'None'}`);

    return res.status(200).json({
      success: true,
      message: `KYC ${status} successfully`,
      kyc: updatedKYC
    });

  } catch (error) {
    console.error('Update KYC status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update KYC status'
    });
  }
}

/**
 * Get dashboard statistics
 */
async function getDashboardStats(req, res) {
  try {
    // Get user statistics
    const userStats = await User.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          active: [{ $match: { isActive: true } }, { $count: "count" }],
          emailVerified: [{ $match: { emailVerified: true } }, { $count: "count" }],
          withWallet: [{ $match: { walletAddress: { $ne: null } } }, { $count: "count" }]
        }
      }
    ]);

    // Get KYC statistics - need to account for users without KYC records
    const kycStats = await KYC.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total users to calculate users with no KYC (notstarted)
    const totalUsers = userStats[0].total[0]?.count || 0;
    const totalKYCRecords = await KYC.countDocuments({});

    // Get transaction statistics
    const transactionStats = await Transaction.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          confirmed: [{ $match: { status: 'confirmed' } }, { $count: "count" }],
          pending: [{ $match: { status: 'pending' } }, { $count: "count" }],
          failed: [{ $match: { status: 'failed' } }, { $count: "count" }],
          totalVolume: [
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]
        }
      }
    ]);

    // Format KYC stats
    const kycStatsFormatted = {
      notstarted: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    kycStats.forEach(stat => {
      kycStatsFormatted[stat._id] = stat.count;
    });

    // Calculate users who haven't started KYC (users without KYC records)
    kycStatsFormatted.notstarted = totalUsers - totalKYCRecords;

    console.log('📊 Dashboard Stats Debug:', {
      totalUsers,
      totalKYCRecords,
      kycStatsRaw: kycStats,
      kycStatsFormatted,
      userStats: userStats[0],
      transactionStats: transactionStats[0]
    });

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: userStats[0].total[0]?.count || 0,
          active: userStats[0].active[0]?.count || 0,
          emailVerified: userStats[0].emailVerified[0]?.count || 0,
          withWallet: userStats[0].withWallet[0]?.count || 0
        },
        kyc: kycStatsFormatted,
        transactions: {
          total: transactionStats[0].total[0]?.count || 0,
          confirmed: transactionStats[0].confirmed[0]?.count || 0,
          pending: transactionStats[0].pending[0]?.count || 0,
          failed: transactionStats[0].failed[0]?.count || 0,
          totalVolume: transactionStats[0].totalVolume[0]?.total || 0
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  getKYCSubmissions,
  getKYCById,
  updateKYCStatus,
  getDashboardStats
};
