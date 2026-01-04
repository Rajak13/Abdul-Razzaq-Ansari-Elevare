'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // Start with 1 second
const MAX_RECONNECT_DELAY = 30000; // Max 30 seconds
const CONNECTION_DEBOUNCE = 500; // Prevent rapid connections

export function useSocket() {
  const { user, token } = useAuth();
  const [state, setState] = useState<SocketState>({
    socket: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectionAttempt = useRef<number>(0);

  const connect = useCallback(() => {
    if (!user || !token || state.isConnecting || state.isConnected) {
      return;
    }

    // Debounce connections to prevent rapid reconnects
    const now = Date.now();
    if (now - lastConnectionAttempt.current < CONNECTION_DEBOUNCE) {
      return;
    }
    lastConnectionAttempt.current = now;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001', {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false, // Don't force new connections
      reconnection: true, // Let socket.io handle reconnection
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setState(prev => ({
        ...prev,
        socket,
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      }));
      
      // Reset reconnect delay on successful connection
      reconnectDelayRef.current = RECONNECT_DELAY;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setState(prev => ({
        ...prev,
        socket: null,
        isConnected: false,
        isConnecting: false,
        error: error.message,
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setState(prev => ({
        ...prev,
        isConnected: false,
        socket: null,
      }));

      // Only attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    // Set up error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    });

    setState(prev => ({ ...prev, socket }));
  }, [user, token, state.isConnecting, state.isConnected]);

  const scheduleReconnect = useCallback(() => {
    setState(prev => {
      if (prev.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        return {
          ...prev,
          error: 'Max reconnection attempts reached',
          isConnecting: false,
        };
      }

      const newAttempts = prev.reconnectAttempts + 1;
      const delay = Math.min(reconnectDelayRef.current * Math.pow(2, newAttempts - 1), MAX_RECONNECT_DELAY);

      console.log(`Scheduling reconnect attempt ${newAttempts} in ${delay}ms`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);

      return {
        ...prev,
        reconnectAttempts: newAttempts,
        isConnecting: true,
      };
    });
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (state.socket) {
      state.socket.disconnect();
    }

    setState({
      socket: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    });
  }, [state.socket]);

  // Connect when user is available
  useEffect(() => {
    if (user && token && !state.socket && !state.isConnecting) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, token, connect]); // Removed state dependencies to prevent loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // Socket event helpers
  const emit = useCallback((event: string, data?: any) => {
    if (state.socket && state.isConnected) {
      state.socket.emit(event, data);
    }
  }, [state.socket, state.isConnected]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (state.socket) {
      state.socket.on(event, handler);
    }
  }, [state.socket]);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (state.socket) {
      if (handler) {
        state.socket.off(event, handler);
      } else {
        state.socket.off(event);
      }
    }
  }, [state.socket]);

  // Group-specific helpers
  const joinGroup = useCallback((groupId: string) => {
    emit('join_group', groupId);
  }, [emit]);

  const leaveGroup = useCallback((groupId: string) => {
    emit('leave_group', groupId);
  }, [emit]);

  const joinDashboard = useCallback(() => {
    emit('join_dashboard');
  }, [emit]);

  const leaveDashboard = useCallback(() => {
    emit('leave_dashboard');
  }, [emit]);

  return {
    socket: state.socket,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    connect,
    disconnect,
    emit,
    on,
    off,
    joinGroup,
    leaveGroup,
    joinDashboard,
    leaveDashboard,
  };
}

// Hook for managing socket connection in a specific group context
export function useGroupSocket(groupId: string | null) {
  const { socket, isConnected, joinGroup, leaveGroup } = useSocket();

  useEffect(() => {
    if (socket && isConnected && groupId) {
      joinGroup(groupId);

      return () => {
        leaveGroup(groupId);
      };
    }
  }, [socket, isConnected, groupId, joinGroup, leaveGroup]);

  return { socket, isConnected };
}

// Hook for dashboard real-time updates
export function useDashboardSocket() {
  const { socket, isConnected, joinDashboard, leaveDashboard } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      joinDashboard();

      return () => {
        leaveDashboard();
      };
    }
  }, [socket, isConnected, joinDashboard, leaveDashboard]);

  return { socket, isConnected };
}