const express = require('express');
const router = express.Router();

const {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  updateFCMToken,
  getNotificationStats
} = require('../controllers/notificationController');

// Create notification
router.post('/', createNotification);

// Get user notifications
router.get('/user/:userId', getUserNotifications);

// Mark notification as read
router.patch('/:notificationId/read', markNotificationAsRead);

// Mark all notifications as read for user
router.patch('/user/:userId/read-all', markAllNotificationsAsRead);

// Delete notification
router.delete('/:notificationId', deleteNotification);

// Update FCM token
router.put('/user/:userId/fcm-token', updateFCMToken);

// Get notification statistics
router.get('/user/:userId/stats', getNotificationStats);

module.exports = router;
