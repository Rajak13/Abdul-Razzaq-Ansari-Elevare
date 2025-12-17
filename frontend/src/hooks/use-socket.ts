import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import socketService from '@/services/socket-service';

export function useSocket() {
  const { token, isAuthenticated } = useAuth();
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && token && !isConnectedRef.current) {
      socketService.connect(token);
      isConnectedRef.current = true;
    }

    return () => {
      if (isConnectedRef.current) {
        socketService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [isAuthenticated, token]);

  return socketService;
}

export default useSocket;