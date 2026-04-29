'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { isAdmin } from '@/lib/maintenance-checker';

const COUNTDOWN_SECONDS = 15;

export function MaintenanceNotification() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('maintenance.notification');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Skip if user is admin
    if (isAdmin()) {
      return;
    }

    // Connect to socket for maintenance events (no auth required for these events)
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001', {
      transports: process.env.NODE_ENV === 'production' ? ['polling'] : ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('auth_token') || ''
      }
    });

    setSocket(newSocket);

    const handleMaintenanceActivated = (data: { message: string; estimatedDuration?: number }) => {
      setMaintenanceMessage(data.message);
      setCountdown(COUNTDOWN_SECONDS);

      // Show toast notification
      toast.warning(t('title'), {
        description: t('description', { seconds: COUNTDOWN_SECONDS }),
        duration: COUNTDOWN_SECONDS * 1000,
      });
    };

    const handleMaintenanceDeactivated = () => {
      setCountdown(null);
      setMaintenanceMessage('');
      
      toast.success(t('deactivated'), {
        description: t('deactivatedDescription'),
      });
    };

    // Listen for maintenance mode events
    newSocket.on('maintenance_mode_activated', handleMaintenanceActivated);
    newSocket.on('maintenance_mode_deactivated', handleMaintenanceDeactivated);

    return () => {
      newSocket.off('maintenance_mode_activated', handleMaintenanceActivated);
      newSocket.off('maintenance_mode_deactivated', handleMaintenanceDeactivated);
      newSocket.disconnect();
    };
  }, [t]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdown === 0) {
        // Redirect to maintenance page
        const locale = pathname.split('/')[1] || 'en';
        router.push(`/${locale}/maintenance`);
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, pathname, router]);

  // Don't render anything if no countdown
  if (countdown === null) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-lg">{t('title')}</p>
              <p className="text-sm opacity-90">
                {maintenanceMessage || t('defaultMessage')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums">{countdown}</div>
              <div className="text-xs opacity-90">{t('seconds')}</div>
            </div>
            <button
              onClick={() => {
                const locale = pathname.split('/')[1] || 'en';
                router.push(`/${locale}/maintenance`);
              }}
              className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {t('goNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
