import { Pool } from 'pg';
import logger from '../utils/logger';

export interface AdminNotification {
  id: string;
  admin_id: string | null; // null for broadcast to all admins
  type: 'new_report' | 'user_suspended' | 'content_deleted' | 'system_alert';
  title: string;
  message: string;
  data: Record<string, any>; // Type-specific data
  read: boolean;
  created_at: Date;
}

export interface NotificationFilters {
  unread?: boolean;
  type?: AdminNotification['type'];
  limit?: number;
  offset?: number;
}

export class AdminNotificationService {
  constructor(private db: Pool) {}

  /**
   * Create a notification for a specific admin or broadcast to all admins
   */
  async createNotification(
    type: AdminNotification['type'],
    title: string,
    message: string,
    data: Record<string, any>,
    adminId?: string
  ): Promise<AdminNotification> {
    try {
      const query = `
        INSERT INTO admin_notifications (admin_id, type, title, message, data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        adminId || null,
        type,
        title,
        message,
        JSON.stringify(data)
      ];

      const result = await this.db.query(query, values);
      const notification = result.rows[0];

      logger.debug('Admin notification created', {
        notificationId: notification.id,
        type,
        adminId: adminId || 'broadcast',
        title
      });

      return {
        id: notification.id,
        admin_id: notification.admin_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        created_at: notification.created_at
      };

    } catch (error) {
      logger.error('Failed to create admin notification', {
        type,
        title,
        adminId,
        error
      });
      throw new Error('Failed to create admin notification');
    }
  }

  /**
   * Get notifications for a specific admin with optional filtering
   */
  async getNotifications(
    adminId: string,
    filters: NotificationFilters = {}
  ): Promise<AdminNotification[]> {
    try {
      const conditions: string[] = ['(admin_id = $1 OR admin_id IS NULL)'];
      const values: any[] = [adminId];
      let paramCount = 1;

      // Add filter conditions
      if (filters.unread !== undefined) {
        conditions.push(`read = $${++paramCount}`);
        values.push(filters.unread ? false : true);
      }

      if (filters.type) {
        conditions.push(`type = $${++paramCount}`);
        values.push(filters.type);
      }

      const whereClause = conditions.join(' AND ');
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const query = `
        SELECT *
        FROM admin_notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      values.push(limit, offset);

      const result = await this.db.query(query, values);

      logger.debug('Retrieved admin notifications', {
        adminId,
        filters,
        count: result.rows.length
      });

      return result.rows.map(row => ({
        id: row.id,
        admin_id: row.admin_id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: row.data,
        read: row.read,
        created_at: row.created_at
      }));

    } catch (error) {
      logger.error('Failed to get admin notifications', {
        adminId,
        filters,
        error
      });
      throw new Error('Failed to get admin notifications');
    }
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(notificationId: string, adminId: string): Promise<void> {
    try {
      const query = `
        UPDATE admin_notifications
        SET read = TRUE
        WHERE id = $1 AND (admin_id = $2 OR admin_id IS NULL)
      `;

      const result = await this.db.query(query, [notificationId, adminId]);

      if (result.rowCount === 0) {
        throw new Error('Notification not found or access denied');
      }

      logger.debug('Notification marked as read', {
        notificationId,
        adminId
      });

    } catch (error) {
      logger.error('Failed to mark notification as read', {
        notificationId,
        adminId,
        error
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a specific admin
   */
  async markAllAsRead(adminId: string): Promise<void> {
    try {
      const query = `
        UPDATE admin_notifications
        SET read = TRUE
        WHERE (admin_id = $1 OR admin_id IS NULL) AND read = FALSE
      `;

      const result = await this.db.query(query, [adminId]);

      logger.debug('All notifications marked as read', {
        adminId,
        count: result.rowCount
      });

    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        adminId,
        error
      });
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Get unread notification count for a specific admin
   */
  async getUnreadCount(adminId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM admin_notifications
        WHERE (admin_id = $1 OR admin_id IS NULL) AND read = FALSE
      `;

      const result = await this.db.query(query, [adminId]);
      const count = parseInt(result.rows[0].count);

      logger.debug('Retrieved unread notification count', {
        adminId,
        count
      });

      return count;

    } catch (error) {
      logger.error('Failed to get unread notification count', {
        adminId,
        error
      });
      throw new Error('Failed to get unread notification count');
    }
  }

  /**
   * Broadcast a notification to all admin users
   */
  async broadcastToAdmins(
    type: AdminNotification['type'],
    title: string,
    message: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Create a broadcast notification (admin_id = NULL)
      await this.createNotification(type, title, message, data);

      logger.info('Notification broadcast to all admins', {
        type,
        title
      });

    } catch (error) {
      logger.error('Failed to broadcast notification to admins', {
        type,
        title,
        error
      });
      throw new Error('Failed to broadcast notification to admins');
    }
  }

  /**
   * Delete old notifications based on retention period (90 days)
   */
  async cleanupOldNotifications(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query = `
        DELETE FROM admin_notifications
        WHERE created_at < $1
      `;

      const result = await this.db.query(query, [cutoffDate]);
      const deletedCount = result.rowCount || 0;

      logger.info('Old notifications cleaned up', {
        retentionDays,
        cutoffDate,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old notifications', {
        retentionDays,
        error
      });
      throw new Error('Failed to cleanup old notifications');
    }
  }
}

export default AdminNotificationService;
