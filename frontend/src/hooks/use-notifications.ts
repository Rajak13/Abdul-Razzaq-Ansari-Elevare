import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { notificationService } from '../services/notification-service';
import { socketService } from '../services/socket-service';
import { Notification, NotificationPreferencesData } from '../types/notification';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const t = useTranslations('notifications');

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
      toast.success(t('preferences.saved'));
    },
    onError: () => {
      toast.error(t('toast.error'));
    },
  });

  const sendTestNotificationMutation = useMutation({
    mutationFn: () => notificationService.sendTestNotification(),
    onSuccess: () => {
      toast.success(t('toast.success'));
    },
    onError: () => {
      toast.error(t('toast.error'));
    },
  });

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    const audio = new Audio('/sounds/mixkit-bell-notification-933.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Blocked by browser autoplay policy — silent fail is fine
    });
  }, []);

  // Stable refs so the socket listener is registered exactly once
  const queryClientRef = useRef(queryClient);
  const playNotificationSoundRef = useRef(playNotificationSound);
  const tRef = useRef(t);
  queryClientRef.current = queryClient;
  playNotificationSoundRef.current = playNotificationSound;
  tRef.current = t;

  // Handle real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || !isAuthenticated) return;

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    // Use a stable function reference so we never register duplicate listeners
    const handleNotification = (notification: Notification) => {
      queryClientRef.current.invalidateQueries({ queryKey: ['notifications'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      playNotificationSoundRef.current();

      toast(notification.title, {
        description: notification.content,
        duration: 5000,
        action: notification.link ? {
          label: tRef.current('actions.view'),
          onClick: () => {
            const locale = window.location.pathname.split('/')[1] || 'en';
            const link = notification.link!.startsWith('/') && !notification.link!.startsWith(`/${locale}`)
              ? `/${locale}${notification.link}`
              : notification.link!;
            window.location.href = link;
          }
        } : undefined,
        className: 'notification-toast',
      });
    };

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Remove any previously registered listener before adding a new one
    socketService.offNotification();
    socketService.onNotification(handleNotification);

    const socket = socketService.getSocket();
    if (socket) {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      setIsConnected(socket.connected);
    }

    return () => {
      socketService.offNotification(handleNotification);
      const s = socketService.getSocket();
      if (s) {
        s.off('connect', handleConnect);
        s.off('disconnect', handleDisconnect);
      }
    };
  // Only re-run when auth state changes — refs keep everything else stable
  }, [isAuthenticated]);

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