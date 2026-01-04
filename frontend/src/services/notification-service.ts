import apiClient from '@/lib/api-client';
import {
  Notification,
  NotificationResponse,
  NotificationPreferencesResponse,
  NotificationPreferencesData,
  UnreadCountResponse
} from '../types/notification';

export class NotificationService {
  /**
   * Get user notifications with pagination
   */
  async getNotifications(limit: number = 50, offset: number = 0): Promise<NotificationResponse> {
    const response = await apiClient.get('/notifications', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferencesData): Promise<void> {
    await apiClient.put('/notifications/preferences', { preferences });
  }

  /**
   * Send test notification (for debugging)
   */
  async sendTestNotification(): Promise<void> {
    await apiClient.post('/notifications/test');
  }
}

export const notificationService = new NotificationService();
export default notificationService;