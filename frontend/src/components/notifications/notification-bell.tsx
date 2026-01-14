'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { NotificationList } from './notification-list';
import { useNotifications } from '../../hooks/use-notifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { unreadCount, isConnected } = useNotifications();
  const t = useTranslations('notifications');

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a static version for SSR
    return (
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        aria-label={t('title')}
        disabled
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  const ariaLabel = unreadCount > 0 
    ? `${t('title')} (${unreadCount} ${t('unread')})`
    : t('title');
  
  const titleText = unreadCount > 0
    ? `${t('title')} - ${unreadCount} ${t('unread')}`
    : t('title');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={ariaLabel}
          title={titleText}
        >
          {isConnected && unreadCount > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-yellow-500 border border-background" title={t('offline')} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={4}
      >
        <NotificationList onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}