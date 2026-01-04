export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export enum NotificationType {
  TASK_DEADLINE = 'task_deadline',
  GROUP_MESSAGE = 'group_message',
  JOIN_REQUEST_RECEIVED = 'join_request_received',
  JOIN_REQUEST_APPROVED = 'join_request_approved',
  RESOURCE_COMMENT = 'resource_comment',
  SYSTEM_UPDATE = 'system_update',
  VIDEO_CALL_STARTED = 'video_call_started'
}

export interface NotificationPreferencesData {
  [key: string]: boolean;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[];
}

export interface UnreadCountResponse {
  count: number;
}