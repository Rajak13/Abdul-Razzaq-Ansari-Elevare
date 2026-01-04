'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  VideoCameraIcon,
  XMarkIcon,
  UserGroupIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { socketService } from '@/services/socket-service';
import { useAuth } from '@/contexts/auth-context';

interface CallNotification {
  id: string;
  type: 'call_started';
  title: string;
  message: string;
  data: {
    callId: string;
    groupId: string;
    startedBy: {
      id: string;
      name: string;
      email: string;
    };
  };
  timestamp: string;
}

export function VideoCallNotificationProvider({ children }: { children: React.ReactNode }) {
  // Video call notifications are now handled through the main notification center
  // This component is kept for backward compatibility but notifications
  // are created in the database and displayed through NotificationCenter
  return <>{children}</>;
}

interface NotificationCardProps {
  notification: CallNotification;
  onJoin: () => void;
  onDismiss: () => void;
}

function VideoCallNotificationCard({ notification, onJoin, onDismiss }: NotificationCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className={`transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <VideoCameraIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
            
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={onJoin}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <PhoneIcon className="w-4 h-4 mr-1" />
                Join Call
              </button>
              
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
        
        {/* Live indicator */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <UserGroupIcon className="w-3 h-3" />
            <span>Started by {notification.data.startedBy.name}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast notification for quick alerts
export function VideoCallToast({ 
  message, 
  type = 'info',
  onAction,
  actionLabel = 'Join'
}: {
  message: string;
  type?: 'info' | 'success' | 'warning';
  onAction?: () => void;
  actionLabel?: string;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const bgColor = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200'
  }[type];

  const textColor = {
    info: 'text-blue-800',
    success: 'text-green-800',
    warning: 'text-yellow-800'
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColor} border rounded-lg p-4 shadow-lg max-w-sm`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${textColor}`}>
          {message}
        </p>
        
        {onAction && (
          <button
            onClick={onAction}
            className={`ml-3 text-sm font-medium ${textColor} hover:underline`}
          >
            {actionLabel}
          </button>
        )}
        
        <button
          onClick={() => setIsVisible(false)}
          className={`ml-2 ${textColor} hover:opacity-70`}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}