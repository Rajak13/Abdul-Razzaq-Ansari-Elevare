export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum NotificationType {
  TASK_DEADLINE = 'task_deadline',
  GROUP_MESSAGE = 'group_message',
  JOIN_REQUEST_RECEIVED = 'join_request_received',
  JOIN_REQUEST_APPROVED = 'join_request_approved',
  RESOURCE_COMMENT = 'resource_comment',
  SYSTEM_UPDATE = 'system_update'
}

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}

export interface NotificationPreferencesData {
  [key: string]: boolean;
}

export interface NotificationDeliveryChannel {
  websocket: boolean;
  email: boolean;
}

export interface NotificationScheduleData {
  notification: CreateNotificationData;
  delivery_channels: NotificationDeliveryChannel;
  scheduled_for?: Date;
}