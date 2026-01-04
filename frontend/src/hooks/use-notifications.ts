import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification-service';
import { socketService } from '../services/socket-service';
import { Notification, NotificationPreferencesData } from '../types/notification';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Query for notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isAuthenticated && !authLoading,
  });

  // Query for unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 1000 * 30, // 30 seconds
    enabled: isAuthenticated && !authLoading,
  });

  // Query for preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationService.getPreferences(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: isAuthenticated && !authLoading,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: NotificationPreferencesData) => 
      notificationService.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      toast.success('Notification preferences updated');
    },
    onError: () => {
      toast.error('Failed to update notification preferences');
    },
  });

  const sendTestNotificationMutation = useMutation({
    mutationFn: () => notificationService.sendTestNotification(),
    onSuccess: () => {
      toast.success('Test notification sent');
    },
    onError: () => {
      toast.error('Failed to send test notification');
    },
  });

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Could not create audio element:', error);
    }
  }, []);

  // Handle real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || !isAuthenticated) return;

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    const handleNotification = (notification: Notification) => {
      // Update queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

      // Play notification sound
      playNotificationSound();

      // Show toast notification
      toast(notification.title, {
        description: notification.content,
        duration: 5000,
        action: notification.link ? {
          label: 'View',
          onClick: () => window.location.href = notification.link!
        } : undefined,
        className: 'notification-toast',
      });
    };

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Set up event listeners
    socketService.onNotification(handleNotification);
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      setIsConnected(socket.connected);
    }

    // Cleanup
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
      socketService.offNotification(handleNotification);
    };
  }, [queryClient, playNotificationSound, isAuthenticated]);

  // Actions
  const markAsRead = useCallback((notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback((notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  }, [deleteNotificationMutation]);

  const updatePreferences = useCallback((preferences: NotificationPreferencesData) => {
    updatePreferencesMutation.mutate(preferences);
  }, [updatePreferencesMutation]);

  const sendTestNotification = useCallback(() => {
    sendTestNotificationMutation.mutate();
  }, [sendTestNotificationMutation]);

  const refreshNotifications = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }, [refetch, queryClient]);

  return {
    // Data
    notifications: notificationsData?.notifications || [],
    unreadCount,
    preferences: preferencesData?.preferences || [],
    
    // Loading states
    isLoading,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isSendingTest: sendTestNotificationMutation.isPending,
    
    // Connection state
    isConnected,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    sendTestNotification,
    refreshNotifications,
    playNotificationSound,
    
    // Error
    error,
  };
}