'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { NotificationList } from './notification-list';
import { useNotifications } from '../../hooks/use-notifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { unreadCount, isConnected } = useNotifications();

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
        aria-label="Notifications"
        disabled
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={`Notification Center${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          title={`Notification Center${unreadCount > 0 ? ` - ${unreadCount} unread notifications` : ''}`}
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
            <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-yellow-500 border border-background" title="Offline - Real-time notifications unavailable" />
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