'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from '@/navigation';
import {
  VideoCameraIcon,
  XMarkIcon,
  UserGroupIcon,
  PhoneIcon,
  PhoneXMarkIcon
} from '@heroicons/react/24/outline';
import { socketService } from '@/services/socket-service';
import { useAuth } from '@/contexts/auth-context';

interface IncomingCall {
  callId: string;
  groupId: string;
  groupName: string;
  startedBy: {
    id: string;
    name: string;
    email: string;
  };
  startedAt: string;
}

// Generate a ringtone using the bell sound, looping until stopped
function playRingtone(stopRef: React.MutableRefObject<(() => void) | null>) {
  try {
    const audio = new Audio('/sounds/mixkit-bell-notification-933.wav');
    audio.loop = true;
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Autoplay blocked — fall back to Web Audio API pattern
      try {
        let stopped = false;
        const ctx = new AudioContext();

        const playBeep = (time: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, time);
          osc.frequency.setValueAtTime(660, time + 0.15);
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
          osc.start(time);
          osc.stop(time + 0.4);
        };

        let beat = 0;
        const interval = setInterval(() => {
          if (stopped) return;
          const now = ctx.currentTime;
          playBeep(now);
          playBeep(now + 0.5);
          if (++beat > 20) clearInterval(interval);
        }, 1200);

        stopRef.current = () => {
          stopped = true;
          clearInterval(interval);
          ctx.close().catch(() => {});
        };
      } catch { /* silent */ }
    });

    stopRef.current = () => {
      audio.pause();
      audio.currentTime = 0;
    };
  } catch { /* silent */ }
}

export function VideoCallNotificationProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const stopRingtone = useCallback(() => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleCallStarted = (data: any) => {
      // Don't show notification to the person who started the call
      if (data.startedBy?.id === user?.id) return;

      setIncomingCall({
        callId: data.callId,
        groupId: data.groupId,
        groupName: data.groupName || 'Study Group',
        startedBy: data.startedBy,
        startedAt: data.startedAt,
      });

      playRingtone(stopRingtoneRef);
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      stopRingtone();
    };

    socket.on('group_call_started', handleCallStarted);
    socket.on('group_call_ended', handleCallEnded);

    return () => {
      socket.off('group_call_started', handleCallStarted);
      socket.off('group_call_ended', handleCallEnded);
      stopRingtone();
    };
  }, [isAuthenticated, user?.id, stopRingtone]);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      setIncomingCall(null);
      stopRingtone();
    }, 30000);
    return () => clearTimeout(timer);
  }, [incomingCall, stopRingtone]);

  const handleJoin = () => {
    if (!incomingCall) return;
    stopRingtone();
    setIncomingCall(null);
    router.push(`/groups/${incomingCall.groupId}/video-call`);
  };

  const handleDecline = () => {
    stopRingtone();
    setIncomingCall(null);
  };

  return (
    <>
      {children}
      {incomingCall && (
        <IncomingCallOverlay
          call={incomingCall}
          onJoin={handleJoin}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}

function IncomingCallOverlay({
  call,
  onJoin,
  onDecline,
}: {
  call: IncomingCall;
  onJoin: () => void;
  onDecline: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transform transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Pulsing avatar */}
        <div className="relative mx-auto mb-6 w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-green-400 opacity-40 animate-ping animation-delay-150" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
            <VideoCameraIcon className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Call info */}
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Incoming Video Call</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {call.startedBy.name}
        </h2>
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <UserGroupIcon className="w-4 h-4" />
          <span>{call.groupName}</span>
        </div>

        {/* Accept / Decline */}
        <div className="flex items-center justify-center gap-8">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center shadow-lg transition-all"
              aria-label="Decline call"
            >
              <PhoneXMarkIcon className="w-7 h-7 text-white" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onJoin}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 flex items-center justify-center shadow-lg transition-all animate-bounce"
              aria-label="Accept call"
            >
              <PhoneIcon className="w-7 h-7 text-white" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep these exports for backward compat
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
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const bgColor = { info: 'bg-blue-50 border-blue-200', success: 'bg-green-50 border-green-200', warning: 'bg-yellow-50 border-yellow-200' }[type];
  const textColor = { info: 'text-blue-800', success: 'text-green-800', warning: 'text-yellow-800' }[type];

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColor} border rounded-lg p-4 shadow-lg max-w-sm`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        {onAction && (
          <button onClick={onAction} className={`ml-3 text-sm font-medium ${textColor} hover:underline`}>
            {actionLabel}
          </button>
        )}
        <button onClick={() => setIsVisible(false)} className={`ml-2 ${textColor} hover:opacity-70`}>
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
