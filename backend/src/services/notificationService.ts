import { query, getClient } from '../db/connection';
import { 
  Notification, 
  NotificationPreference, 
  NotificationType, 
  CreateNotificationData,
  NotificationPreferencesData,
  NotificationScheduleData
} from '../types/notification';
import logger from '../utils/logger';
import { SocketService } from './socketService';
import { EmailService } from './emailService';

export class NotificationService {
  private socketService: SocketService;
  private emailService: EmailService;

  constructor(socketService: SocketService, emailService: EmailService) {
    this.socketService = socketService;
    this.emailService = emailService;
  }

  /**
   * Create a new notification in the database
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const result = await query<Notification>(
        `INSERT INTO notifications (user_id, type, title, content, link)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.user_id, data.type, data.title, data.content, data.link]
      );

      const notification = result.rows[0];
      logger.info('Notification created', { 
        notificationId: notification.id, 
        userId: notification.user_id,
        type: notification.type 
      });

      return notification;
    } catch (error) {
      logger.error('Error creating notification', { error, data });
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    try {
      const result = await query<Notification>(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching user notifications', { error, userId });
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error fetching unread count', { error, userId });
      throw new Error('Failed to fetch unread count');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE notifications 
         SET is_read = TRUE 
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE notifications 
         SET is_read = TRUE 
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );

      logger.info('Marked all notifications as read', { userId, count: result.rowCount });
      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read', { error, userId });
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM notifications 
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting notification', { error, notificationId, userId });
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      const result = await query<NotificationPreference>(
        `SELECT * FROM notification_preferences 
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching notification preferences', { error, userId });
      throw new Error('Failed to fetch notification preferences');
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: NotificationPreferencesData): Promise<boolean> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Delete existing preferences
      await client.query(
        'DELETE FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      // Insert new preferences
      for (const [notificationType, enabled] of Object.entries(preferences)) {
        if (Object.values(NotificationType).includes(notificationType as NotificationType)) {
          await client.query(
            `INSERT INTO notification_preferences (user_id, notification_type, enabled)
             VALUES ($1, $2, $3)`,
            [userId, notificationType, enabled]
          );
        }
      }

      await client.query('COMMIT');
      logger.info('Updated notification preferences', { userId, preferences });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating notification preferences', { error, userId, preferences });
      throw new Error('Failed to update notification preferences');
    } finally {
      client.release();
    }
  }

  /**
   * Check if user has enabled a specific notification type
   */
  async isNotificationEnabled(userId: string, notificationType: NotificationType): Promise<boolean> {
    try {
      const result = await query<{ enabled: boolean }>(
        `SELECT enabled FROM notification_preferences 
         WHERE user_id = $1 AND notification_type = $2`,
        [userId, notificationType]
      );

      // If no preference is set, default to enabled
      return result.rows.length === 0 ? true : result.rows[0].enabled;
    } catch (error) {
      logger.error('Error checking notification preference', { error, userId, notificationType });
      // Default to enabled on error
      return true;
    }
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification(data: NotificationScheduleData): Promise<void> {
    try {
      // Check if user has enabled this notification type
      const isEnabled = await this.isNotificationEnabled(data.notification.user_id, data.notification.type);
      
      if (!isEnabled) {
        logger.info('Notification skipped - user has disabled this type', {
          userId: data.notification.user_id,
          type: data.notification.type
        });
        return;
      }

      // Create notification in database
      const notification = await this.createNotification(data.notification);

      // Send via WebSocket if enabled (immediate)
      if (data.delivery_channels.websocket && this.socketService) {
        this.socketService.sendNotification(data.notification.user_id, notification);
      }

      // Send via email if enabled (async - don't wait)
      if (data.delivery_channels.email) {
        // Fire and forget - don't await email sending to avoid blocking the response
        this.sendEmailNotification(notification).catch(error => {
          logger.error('Async email notification failed', { 
            error, 
            notificationId: notification.id,
            userId: notification.user_id 
          });
        });
      }

      logger.info('Notification sent successfully', {
        notificationId: notification.id,
        userId: notification.user_id,
        channels: data.delivery_channels
      });
    } catch (error) {
      logger.error('Error sending notification', { error, data });
      throw new Error('Failed to send notification');
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email from database
      const userResult = await query<{ email: string, name: string }>(
        'SELECT email, name FROM users WHERE id = $1',
        [notification.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      await this.emailService.sendNotificationEmail({
        to: user.email,
        subject: notification.title,
        text: notification.content,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${notification.title}</h2>
            <p>${notification.content}</p>
            ${notification.link ? `<p><a href="${notification.link}" style="color: #2563eb;">View Details</a></p>` : ''}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated notification from Elevare. 
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        `
      });

      logger.info('Email notification sent', {
        notificationId: notification.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Error sending email notification', { error, notificationId: notification.id });
      // Don't throw error for email failures - notification was still created
    }
  }

  /**
   * Schedule task deadline notifications
   */
  async scheduleTaskDeadlineNotification(taskId: string, userId: string, taskTitle: string, dueDate: Date): Promise<void> {
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);

    // Send notification if due within 24 hours
    if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
      const notificationData: NotificationScheduleData = {
        notification: {
          user_id: userId,
          type: NotificationType.TASK_DEADLINE,
          title: 'Task Deadline Approaching',
          content: `Your task "${taskTitle}" is due ${hoursUntilDue < 1 ? 'in less than an hour' : `in ${Math.round(hoursUntilDue)} hours`}.`,
          link: `/tasks/${taskId}`
        },
        delivery_channels: {
          websocket: true,
          email: hoursUntilDue <= 1 // Only send email for urgent (1 hour) notifications
        }
      };

      await this.sendNotification(notificationData);
    }
  }

  /**
   * Send group message notification
   */
  async sendGroupMessageNotification(groupId: string, senderId: string, senderName: string, message: string): Promise<void> {
    try {
      // Get all group members except the sender
      const membersResult = await query<{ user_id: string }>(
        `SELECT user_id FROM group_members 
         WHERE group_id = $1 AND user_id != $2`,
        [groupId, senderId]
      );

      // Get group name
      const groupResult = await query<{ name: string }>(
        'SELECT name FROM study_groups WHERE id = $1',
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        throw new Error('Group not found');
      }

      const groupName = groupResult.rows[0].name;

      // Send notification to each member
      for (const member of membersResult.rows) {
        const notificationData: NotificationScheduleData = {
          notification: {
            user_id: member.user_id,
            type: NotificationType.GROUP_MESSAGE,
            title: `New message in ${groupName}`,
            content: `${senderName}: ${message.length > 100 ? message.substring(0, 100) + '...' : message}`,
            link: `/groups/${groupId}`
          },
          delivery_channels: {
            websocket: true,
            email: false // Group messages typically don't need email notifications
          }
        };

        await this.sendNotification(notificationData);
      }
    } catch (error) {
      logger.error('Error sending group message notification', { error, groupId, senderId });
      // Don't throw error - message was still sent
    }
  }

  /**
   * Send join request approval notification
   */
  async sendJoinRequestApprovalNotification(userId: string, groupId: string, groupName: string): Promise<void> {
    const notificationData: NotificationScheduleData = {
      notification: {
        user_id: userId,
        type: NotificationType.JOIN_REQUEST_APPROVED,
        title: 'Join Request Approved',
        content: `Your request to join "${groupName}" has been approved. Welcome to the group!`,
        link: `/groups/${groupId}`
      },
      delivery_channels: {
        websocket: true,
        email: true
      }
    };

    await this.sendNotification(notificationData);
  }

  /**
   * Send join request received notification to group owner
   */
  async sendJoinRequestReceivedNotification(ownerId: string, groupId: string, groupName: string, requesterName: string): Promise<void> {
    const notificationData: NotificationScheduleData = {
      notification: {
        user_id: ownerId,
        type: NotificationType.JOIN_REQUEST_RECEIVED,
        title: 'New Join Request',
        content: `${requesterName} has requested to join "${groupName}".`,
        link: `/groups/${groupId}`
      },
      delivery_channels: {
        websocket: true,
        email: true
      }
    };

    await this.sendNotification(notificationData);
  }

  /**
   * Send resource comment notification
   */
  async sendResourceCommentNotification(resourceId: string, resourceTitle: string, commenterName: string, comment: string, resourceOwnerId: string): Promise<void> {
    const notificationData: NotificationScheduleData = {
      notification: {
        user_id: resourceOwnerId,
        type: NotificationType.RESOURCE_COMMENT,
        title: 'New comment on your resource',
        content: `${commenterName} commented on "${resourceTitle}": ${comment.length > 100 ? comment.substring(0, 100) + '...' : comment}`,
        link: `/resources/${resourceId}`
      },
      delivery_channels: {
        websocket: true,
        email: false
      }
    };

    await this.sendNotification(notificationData);
  }
}