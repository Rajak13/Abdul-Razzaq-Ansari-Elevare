'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  VideoCameraIcon,
  UserGroupIcon,
  ClockIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { socketService } from '@/services/socket-service';
import { Button } from '@/components/ui/button';

interface CallStatus {
  isActive: boolean;
  participants: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  startedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  startedAt?: string;
}

interface VideoCallButtonProps {
  groupId: string;
  groupName: string;
  memberCount: number;
  disabled?: boolean;
  className?: string;
}

export function StartVideoCallButton({ 
  groupId, 
  groupName, 
  memberCount,
  disabled = false,
  className = '' 
}: VideoCallButtonProps) {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>({
    isActive: false,
    participants: [],
    startedBy: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (socket && socket.connected) {
      setIsConnected(true);
      
      // Join group to receive call status updates
      socket.emit('join_group', groupId);

      // Request current call status immediately
      socket.emit('get_call_status', { groupId });

      // Listen for call status updates
      socket.on('group_call_status', (status: any) => {
        console.log('📞 Received call status:', status);
        if (status.groupId === groupId) {
          setCallStatus({
            isActive: status.isActive,
            participants: status.participants || [],
            startedBy: status.startedBy,
            startedAt: status.startedAt
          });
        }
      });

      socket.on('group_call_started', (data: any) => {
        console.log('🎥 Call started:', data);
        if (data.groupId === groupId) {
          setCallStatus({
            isActive: true,
            participants: [{ userId: data.startedBy.id, user: data.startedBy }],
            startedBy: data.startedBy,
            startedAt: data.startedAt
          });
        }
      });

      socket.on('group_call_ended', (data: any) => {
        console.log('📞 Call ended:', data);
        if (data.groupId === groupId) {
          setCallStatus({
            isActive: false,
            participants: [],
            startedBy: null
          });
        }
      });

      return () => {
        socket.off('group_call_status');
        socket.off('group_call_started');
        socket.off('group_call_ended');
      };
    } else {
      setIsConnected(false);
      
      // Try to reconnect if we have a token
      const token = localStorage.getItem('auth_token');
      if (token) {
        socketService.connect(token);
      }
    }
  }, [groupId]);

  const handleVideoCall = async () => {
    setIsStarting(true);
    try {
      router.push(`/groups/${groupId}/video-call`);
    } catch (error) {
      console.error('Error starting video call:', error);
      setIsStarting(false);
    }
  };

  if (!isConnected) {
    return (
      <Button
        disabled
        className={className}
        size="lg"
      >
        <VideoCameraIcon className="w-5 h-5 mr-2" />
        Connecting...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleVideoCall}
      disabled={disabled || isStarting}
      className={`${callStatus.isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} ${className}`}
      size="lg"
    >
      {callStatus.isActive ? (
        <>
          <PhoneIcon className="w-5 h-5 mr-2" />
          {isStarting ? 'Joining...' : `Join Call (${callStatus.participants.length} active)`}
        </>
      ) : (
        <>
          <VideoCameraIcon className="w-5 h-5 mr-2" />
          {isStarting ? 'Starting...' : 'Start Video Call'}
        </>
      )}
      
      {callStatus.isActive && !isStarting && (
        <div className="ml-2 flex items-center">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
        </div>
      )}
    </Button>
  );
}

// Compact version for smaller spaces
export function StartVideoCallButtonCompact({ 
  groupId, 
  groupName, 
  memberCount,
  disabled = false,
  className = ''
}: VideoCallButtonProps) {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>({
    isActive: false,
    participants: [],
    startedBy: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (socket && socket.connected) {
      setIsConnected(true);
      socket.emit('join_group', groupId);

      socket.on('group_call_status', (status: any) => {
        if (status.groupId === groupId) {
          setCallStatus({
            isActive: status.isActive,
            participants: status.participants || [],
            startedBy: status.startedBy,
            startedAt: status.startedAt
          });
        }
      });

      return () => {
        socket.off('group_call_status');
      };
    }
  }, [groupId]);

  const handleVideoCall = async () => {
    setIsStarting(true);
    try {
      router.push(`/groups/${groupId}/video-call`);
    } catch (error) {
      console.error('Error starting video call:', error);
      setIsStarting(false);
    }
  };

  return (
    <Button
      onClick={handleVideoCall}
      disabled={disabled || isStarting || !isConnected}
      variant="outline"
      size="sm"
      className={`${callStatus.isActive ? 'border-green-500 text-green-600 hover:bg-green-50' : ''} ${className}`}
    >
      {callStatus.isActive ? (
        <>
          <PhoneIcon className="w-4 h-4 mr-1" />
          Join ({callStatus.participants.length})
        </>
      ) : (
        <>
          <VideoCameraIcon className="w-4 h-4 mr-1" />
          {isStarting ? 'Starting...' : 'Video Call'}
        </>
      )}
    </Button>
  );
}

// Video call card for prominent display
export function VideoCallCard({ 
  groupId, 
  groupName, 
  memberCount,
  disabled = false 
}: VideoCallButtonProps) {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>({
    isActive: false,
    participants: [],
    startedBy: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (socket && socket.connected) {
      setIsConnected(true);
      socket.emit('join_group', groupId);

      socket.on('group_call_status', (status: any) => {
        if (status.groupId === groupId) {
          setCallStatus({
            isActive: status.isActive,
            participants: status.participants || [],
            startedBy: status.startedBy,
            startedAt: status.startedAt
          });
        }
      });

      socket.on('group_call_started', (data: any) => {
        if (data.groupId === groupId) {
          setCallStatus({
            isActive: true,
            participants: [{ userId: data.startedBy.id, user: data.startedBy }],
            startedBy: data.startedBy,
            startedAt: data.startedAt
          });
        }
      });

      socket.on('group_call_ended', (data: any) => {
        if (data.groupId === groupId) {
          setCallStatus({
            isActive: false,
            participants: [],
            startedBy: null
          });
        }
      });

      return () => {
        socket.off('group_call_status');
        socket.off('group_call_started');
        socket.off('group_call_ended');
      };
    }
  }, [groupId]);

  const handleVideoCall = async () => {
    setIsStarting(true);
    try {
      router.push(`/groups/${groupId}/video-call`);
    } catch (error) {
      console.error('Error starting video call:', error);
      setIsStarting(false);
    }
  };

  const getTimeAgo = (startedAt?: string) => {
    if (!startedAt) return '';
    const now = new Date();
    const started = new Date(startedAt);
    const diffMs = now.getTime() - started.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  return (
    <div className={`rounded-lg p-6 text-white ${
      callStatus.isActive 
        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
        : 'bg-gradient-to-r from-blue-500 to-purple-600'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-full">
            {callStatus.isActive ? (
              <PhoneIcon className="w-8 h-8" />
            ) : (
              <VideoCameraIcon className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {callStatus.isActive ? 'Video Call Active' : 'Video Study Session'}
            </h3>
            <p className={callStatus.isActive ? 'text-green-100' : 'text-blue-100'}>
              {callStatus.isActive 
                ? `${callStatus.participants.length} participant${callStatus.participants.length !== 1 ? 's' : ''} in call`
                : `Connect with ${memberCount} member${memberCount !== 1 ? 's' : ''} in ${groupName}`
              }
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleVideoCall}
          disabled={disabled || isStarting || !isConnected}
          variant="secondary"
          size="lg"
          className={`bg-white hover:bg-gray-100 ${
            callStatus.isActive ? 'text-green-600' : 'text-blue-600'
          }`}
        >
          {callStatus.isActive ? (
            <>
              <PhoneIcon className="w-5 h-5 mr-2" />
              {isStarting ? 'Joining...' : 'Join Call'}
            </>
          ) : (
            <>
              <VideoCameraIcon className="w-5 h-5 mr-2" />
              {isStarting ? 'Starting...' : 'Start Call'}
            </>
          )}
        </Button>
      </div>
      
      {callStatus.isActive && callStatus.startedBy ? (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <UserGroupIcon className="w-4 h-4" />
              <span>Started by {callStatus.startedBy.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              {callStatus.startedAt && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{getTimeAgo(callStatus.startedAt)}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center space-x-4 text-sm text-blue-100">
          <div className="flex items-center space-x-1">
            <UserGroupIcon className="w-4 h-4" />
            <span>Group video calls</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Screen sharing</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Breakout rooms</span>
          </div>
        </div>
      )}
    </div>
  );
}