'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Notification } from '../../types/notification';

interface ToastNotificationProps {
  notification: Notification;
  playSound?: boolean;
}

export function ToastNotification({ notification, playSound = true }: ToastNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = useTranslations('notifications');

  useEffect(() => {
    // Create audio element for notification sound
    if (playSound && typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, [playSound]);

  const showToast = () => {
    // Play notification sound
    if (playSound && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    }

    // Show toast notification
    toast(notification.title, {
      description: notification.content,
      duration: 5000,
      action: notification.link ? {
        label: t('actions.view'),
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

  // Auto-show toast when component mounts
  useEffect(() => {
    showToast();
  }, [notification]);

  return null; // This component doesn't render anything visible
}

// Hook for showing toast notifications
export function useToastNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = useTranslations('notifications');

  useEffect(() => {
    // Create audio element for notification sound
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);

  const showNotificationToast = (notification: Notification, playSound: boolean = true) => {
    // Play notification sound
    if (playSound && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    }

    // Show toast notification
    toast(notification.title, {
      description: notification.content,
      duration: 5000,
      action: notification.link ? {
        label: t('actions.view'),
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

  return { showNotificationToast };
}