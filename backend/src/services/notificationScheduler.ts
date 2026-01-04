import { NotificationService } from './notificationService';
import { socketService } from './socketService';
import { EmailService } from './emailService';
import { query } from '../db/connection';
import logger from '../utils/logger';

export class NotificationScheduler {
  private notificationService: NotificationService | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private getNotificationService(): NotificationService {
    if (!this.notificationService) {
      const emailService = new EmailService();
      this.notificationService = new NotificationService(socketService, emailService);
    }
    return this.notificationService;
  }

  /**
   * Start the notification scheduler
   */
  start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      logger.warn('Notification scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting notification scheduler', { intervalMinutes });

    // Run immediately on start
    this.checkTaskDeadlines();

    // Then run at regular intervals
    this.intervalId = setInterval(() => {
      this.checkTaskDeadlines();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Notification scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Notification scheduler stopped');
  }

  /**
   * Check for upcoming task deadlines and send notifications
   */
  private async checkTaskDeadlines(): Promise<void> {
    try {
      logger.debug('Checking task deadlines for notifications');

      // Get tasks due within the next 24 hours that haven't been notified recently
      const result = await query(`
        SELECT t.id, t.user_id, t.title, t.due_date,
               EXTRACT(EPOCH FROM (t.due_date - NOW())) / 3600 as hours_until_due
        FROM tasks t
        WHERE t.status = 'pending'
          AND t.due_date IS NOT NULL
          AND t.due_date > NOW()
          AND t.due_date <= NOW() + INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = t.user_id
              AND n.type = 'task_deadline'
              AND n.content LIKE '%' || t.title || '%'
              AND n.created_at > NOW() - INTERVAL '12 hours'
          )
        ORDER BY t.due_date ASC
      `);

      const tasks = result.rows;
      logger.info('Found tasks with upcoming deadlines', { count: tasks.length });

      for (const task of tasks) {
        try {
          await this.getNotificationService().scheduleTaskDeadlineNotification(
            task.id,
            task.user_id,
            task.title,
            new Date(task.due_date)
          );

          logger.debug('Scheduled deadline notification', {
            taskId: task.id,
            userId: task.user_id,
            hoursUntilDue: Math.round(task.hours_until_due)
          });
        } catch (error) {
          logger.error('Error scheduling task deadline notification', {
            error,
            taskId: task.id,
            userId: task.user_id
          });
        }
      }
    } catch (error) {
      logger.error('Error checking task deadlines', { error });
    }
  }

  /**
   * Send a test notification (for debugging)
   */
  async sendTestNotification(userId: string): Promise<void> {
    try {
      await this.getNotificationService().sendNotification({
        notification: {
          user_id: userId,
          type: 'system_update' as any,
          title: 'Test Notification',
          content: 'This is a test notification from the scheduler.',
          link: '/dashboard'
        },
        delivery_channels: {
          websocket: true,
          email: false
        }
      });

      logger.info('Test notification sent', { userId });
    } catch (error) {
      logger.error('Error sending test notification', { error, userId });
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; intervalId: number | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId ? Number(this.intervalId) : null
    };
  }
}

// Export singleton instance
let schedulerInstance: NotificationScheduler | null = null;

export function getNotificationScheduler(): NotificationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new NotificationScheduler();
  }
  return schedulerInstance;
}