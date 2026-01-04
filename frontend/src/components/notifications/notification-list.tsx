'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings, 
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  UserPlus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { useNotifications } from '../../hooks/use-notifications';
import { Notification, NotificationType } from '../../types/notification';
import { NotificationPreferences } from './notification-preferences';

interface NotificationListProps {
  onClose?: () => void;
}

const notificationIcons = {
  [NotificationType.TASK_DEADLINE]: Calendar,
  [NotificationType.GROUP_MESSAGE]: MessageSquare,
  [NotificationType.JOIN_REQUEST_RECEIVED]: UserPlus,
  [NotificationType.JOIN_REQUEST_APPROVED]: Users,
  [NotificationType.RESOURCE_COMMENT]: FileText,
  [NotificationType.SYSTEM_UPDATE]: AlertCircle,
};

const notificationColors = {
  [NotificationType.TASK_DEADLINE]: 'text-orange-500',
  [NotificationType.GROUP_MESSAGE]: 'text-blue-500',
  [NotificationType.JOIN_REQUEST_RECEIVED]: 'text-purple-500',
  [NotificationType.JOIN_REQUEST_APPROVED]: 'text-green-500',
  [NotificationType.RESOURCE_COMMENT]: 'text-purple-500',
  [NotificationType.SYSTEM_UPDATE]: 'text-red-500',
};

export function NotificationList({ onClose }: NotificationListProps) {
  const [showPreferences, setShowPreferences] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeleting,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      window.location.href = notification.link;
      onClose?.();
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  if (showPreferences) {
    return (
      <NotificationPreferences 
        onBack={() => setShowPreferences(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold">Notifications</h3>
          {!isConnected && (
            <Badge variant="outline" className="text-xs">
              Offline
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshNotifications}
            className="h-8 w-8 p-0"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreferences(true)}
            className="h-8 w-8 p-0"
            title="Settings"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      {unreadCount > 0 && (
        <div className="p-3 border-b bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            className="w-full"
          >
            <CheckCheck className="h-3 w-3 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <ScrollArea className="h-96">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const IconComponent = notificationIcons[notification.type] || Bell;
              const iconColor = notificationColors[notification.type] || 'text-gray-500';
              
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${iconColor}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${
                            !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              disabled={isMarkingAsRead}
                              className="h-6 w-6 p-0"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            disabled={isDeleting}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}