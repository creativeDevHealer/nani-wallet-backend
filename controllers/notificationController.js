const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.warn('Firebase Admin not initialized:', error.message);
  }
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
async function sendPushNotification(fcmToken, notification) {
  if (!fcmToken || !admin.apps.length) {
    return { success: false, error: 'FCM token missing or Firebase not configured' };
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        type: notification.type,
        notificationId: notification._id.toString(),
        ...notification.data,
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#22c55e', // Islamic green
          sound: 'default',
          priority: notification.priority === 'urgent' ? 'high' : 'normal',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: notification.title,
              body: notification.message,
            },
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent:', response);
    
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Failed to send push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create and send a notification
 */
async function createNotification(req, res) {
  try {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      transactionId,
      priority = 'normal',
      scheduledFor = null,
      sendPush = true
    } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, type, title, message'
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create notification
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      transactionId,
      priority,
      scheduledFor,
      status: 'sent'
    });

    await notification.save();

    // Send push notification if requested and user has FCM token
    let pushResult = { success: false };
    if (sendPush && user.fcmToken) {
      pushResult = await sendPushNotification(user.fcmToken, notification);
      
      if (pushResult.success) {
        notification.pushSent = true;
        notification.pushDelivered = true;
        notification.status = 'delivered';
        await notification.save();
      } else {
        notification.status = 'failed';
        await notification.save();
      }
    }

    res.status(201).json({
      success: true,
      data: {
        notification,
        pushNotification: pushResult
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
}

/**
 * Get notifications for a user
 */
async function getUserNotifications(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type, status, unreadOnly = false } = req.query;

    const query = { userId };
    if (type) query.type = type;
    if (status) query.status = status;
    if (unreadOnly === 'true') query.readAt = { $exists: false };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('transactionId', 'type amount currency status')
      .populate('userId', 'fullName email');

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(req, res) {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { 
        status: 'read',
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(req, res) {
  try {
    const { userId } = req.params;

    const result = await Notification.updateMany(
      { userId, status: { $ne: 'read' } },
      { 
        status: 'read',
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
}

/**
 * Delete a notification
 */
async function deleteNotification(req, res) {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
}

/**
 * Update user's FCM token
 */
async function updateFCMToken(req, res) {
  try {
    const { userId } = req.params;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'FCM token is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { fcmToken: user.fcmToken }
    });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update FCM token'
    });
  }
}

/**
 * Get notification statistics for a user
 */
async function getNotificationStats(req, res) {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Notification.aggregate([
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
          unread: {
            $sum: {
              $cond: [{ $eq: ['$status', 'read'] }, 0, 1]
            }
          }
        }
      }
    ]);

    const totalUnread = await Notification.countDocuments({
      userId,
      status: { $ne: 'read' }
    });

    res.json({
      success: true,
      data: {
        byType: stats,
        totalUnread,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification statistics'
    });
  }
}

/**
 * Create transaction notification helper
 */
async function createTransactionNotification(userId, transaction, type = 'transaction') {
  try {
    const titles = {
      'send': '💰 Transaction Sent',
      'receive': '💰 Money Received',
      'top_up': '💰 Wallet Topped Up',
      'swap': '🔄 Token Swapped'
    };

    const messages = {
      'send': `You sent ${transaction.amount} ${transaction.currency} to ${transaction.recipientAddress?.slice(0, 8)}...`,
      'receive': `You received ${transaction.amount} ${transaction.currency} from ${transaction.senderAddress?.slice(0, 8)}...`,
      'top_up': `Your wallet was topped up with ${transaction.amount} ${transaction.currency}`,
      'swap': `You swapped ${transaction.amount} ${transaction.currency}`
    };

    const notification = new Notification({
      userId,
      type,
      title: titles[transaction.type] || 'Transaction Update',
      message: messages[transaction.type] || `Transaction ${transaction.type} completed`,
      transactionId: transaction._id,
      data: {
        transactionType: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status
      }
    });

    await notification.save();

    // Send push notification
    const user = await User.findById(userId);
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating transaction notification:', error);
    return null;
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  updateFCMToken,
  getNotificationStats,
  createTransactionNotification
};
