'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import {
  VideoCameraIcon,
  UserGroupIcon,
  ClockIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { socketService } from '@/services/socket-service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    let cleanup: (() => void) | undefined;

    const setupListeners = () => {
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        setIsConnected(true);
        socket.emit('join_group', groupId);
        socket.emit('get_call_status', { groupId });

        socket.on('group_call_status', (status: any) => {
          setCallStatus({
            isActive: status.isActive,
            participants: status.participants || [],
            startedBy: status.startedBy,
            startedAt: status.startedAt
          });
        });

        socket.on('group_call_started', (data: any) => {
          setCallStatus({
            isActive: true,
            participants: [{ userId: data.startedBy?.id || 'unknown', user: data.startedBy }],
            startedBy: data.startedBy,
            startedAt: data.startedAt
          });
        });

        socket.on('group_call_ended', () => {
          setCallStatus({ isActive: false, participants: [], startedBy: null });
        });

        cleanup = () => {
          socket.off('group_call_status');
          socket.off('group_call_started');
          socket.off('group_call_ended');
        };
      } else {
        setIsConnected(false);
      }
    };

    setupListeners();

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect', setupListeners);
      socket.on('disconnect', () => setIsConnected(false));
      return () => {
        socket.off('connect', setupListeners);
        socket.off('disconnect');
        if (cleanup) cleanup();
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
      variant={callStatus.isActive ? "default" : "secondary"}
      className={`${callStatus.isActive ? 'animate-pulse ring-2 ring-primary ring-offset-2' : ''} ${className}`}
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

      // Request current call status immediately
      socket.emit('get_call_status', { groupId });

      socket.on('group_call_status', (status: any) => {
        console.log('📞 Compact button received call status:', status);
        setCallStatus({
          isActive: status.isActive,
          participants: status.participants || [],
          startedBy: status.startedBy,
          startedAt: status.startedAt
        });
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
      variant={callStatus.isActive ? "default" : "outline"}
      size="sm"
      className={`${callStatus.isActive ? 'animate-pulse' : ''} ${className}`}
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
    let cleanup: (() => void) | undefined;

    const setupListeners = () => {
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        setIsConnected(true);
        socket.emit('join_group', groupId);
        socket.emit('get_call_status', { groupId });

        socket.on('group_call_status', (status: any) => {
          setCallStatus({
            isActive: status.isActive,
            participants: status.participants || [],
            startedBy: status.startedBy,
            startedAt: status.startedAt
          });
        });

        socket.on('group_call_started', (data: any) => {
          setCallStatus({
            isActive: true,
            participants: [{ userId: data.startedBy?.id || 'unknown', user: data.startedBy }],
            startedBy: data.startedBy,
            startedAt: data.startedAt
          });
        });

        socket.on('group_call_ended', () => {
          setCallStatus({ isActive: false, participants: [], startedBy: null });
        });

        cleanup = () => {
          socket.off('group_call_status');
          socket.off('group_call_started');
          socket.off('group_call_ended');
        };
      } else {
        setIsConnected(false);
      }
    };

    setupListeners();

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect', setupListeners);
      socket.on('disconnect', () => setIsConnected(false));
      return () => {
        socket.off('connect', setupListeners);
        socket.off('disconnect');
        if (cleanup) cleanup();
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

  // Log current state for debugging
  console.log('🎨 VideoCallCard rendering with state:', {
    groupId,
    isConnected,
    isActive: callStatus.isActive,
    participantCount: callStatus.participants.length,
    startedBy: callStatus.startedBy?.name
  });

  return (
    <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${callStatus.isActive
      ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5'
      : 'border-border bg-card'
      }`}>
      {callStatus.isActive && (
        <div className="absolute top-0 right-0 p-2">
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            <span>LIVE</span>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full transition-colors duration-300 ${callStatus.isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
            }`}>
            {callStatus.isActive ? (
              <PhoneIcon className="w-6 h-6" />
            ) : (
              <VideoCameraIcon className="w-6 h-6" />
            )}
          </div>
          <div>
            <CardTitle className="text-lg">
              {callStatus.isActive ? 'Video Call Active' : 'Video Study Session'}
            </CardTitle>
            <CardDescription className={callStatus.isActive ? 'text-primary font-medium' : ''}>
              {callStatus.isActive
                ? `${callStatus.participants.length} participant${callStatus.participants.length !== 1 ? 's' : ''} in call`
                : `Connect with ${memberCount} member${memberCount !== 1 ? 's' : ''} in ${groupName}`
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleVideoCall}
            disabled={disabled || isStarting || !isConnected}
            variant={callStatus.isActive ? "default" : "secondary"}
            size="lg"
            className="w-full"
          >
            {callStatus.isActive ? (
              <>
                <PhoneIcon className="w-5 h-5 mr-2" />
                {isStarting ? 'Joining...' : 'Join Call'}
              </>
            ) : (
              <>
                <VideoCameraIcon className="w-5 h-5 mr-2" />
                {isStarting ? 'Starting...' : 'Start Video Call'}
              </>
            )}
          </Button>

          {callStatus.isActive && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="w-4 h-4" />
                <span>{callStatus.startedBy?.name ? `Started by ${callStatus.startedBy.name}` : 'Ongoing session'}</span>
              </div>
              {callStatus.startedAt && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{getTimeAgo(callStatus.startedAt)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}