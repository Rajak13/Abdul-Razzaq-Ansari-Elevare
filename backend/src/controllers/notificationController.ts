import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { socketService } from '../services/socketService';
import { EmailService } from '../services/emailService';
import { NotificationPreferencesData } from '../types/notification';
import logger from '../utils/logger';

// Initialize services lazily
const emailService = new EmailService();
let notificationService: NotificationService;

function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService(socketService, emailService);
  }
  return notificationService;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await getNotificationService().getUserNotifications(userId, limit, offset);
    const unreadCount = await getNotificationService().getUnreadCount(userId);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    });
  } catch (error) {
    logger.error('Error fetching user notifications', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const count = await getNotificationService().getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    logger.error('Error fetching unread count', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const notificationId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const success = await getNotificationService().markAsRead(notificationId, userId);
    
    if (!success) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification as read', { error, userId: req.user?.userId, notificationId: req.params.id });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await getNotificationService().markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking all notifications as read', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const notificationId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const success = await getNotificationService().deleteNotification(notificationId, userId);
    
    if (!success) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting notification', { error, userId: req.user?.userId, notificationId: req.params.id });
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const preferences = await getNotificationService().getUserPreferences(userId);
    res.json({ preferences });
  } catch (error) {
    logger.error('Error fetching notification preferences', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const preferences: NotificationPreferencesData = req.body.preferences;
    
    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({ error: 'Invalid preferences data' });
      return;
    }

    await getNotificationService().updateUserPreferences(userId, preferences);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating notification preferences', { error, userId: req.user?.userId, preferences: req.body.preferences });
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
}

/**
 * Send test notification (for debugging)
 */
export async function sendTestNotification(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await getNotificationService().sendNotification({
      notification: {
        user_id: userId,
        type: 'system_update' as any,
        title: 'Test Notification',
        content: 'This is a test notification to verify the system is working correctly.',
        link: '/dashboard'
      },
      delivery_channels: {
        websocket: true,
        email: false
      }
    });

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    logger.error('Error sending test notification', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to send test notification' });
  }
}