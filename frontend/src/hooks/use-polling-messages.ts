import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { studyGroupKeys } from '@/hooks/use-study-groups';

export function usePollingMessages(groupId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !groupId) return;

    // Poll for new messages every 2 seconds
    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: studyGroupKeys.messages(groupId) 
      });
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [groupId, enabled, queryClient]);

  return {
    stopPolling: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };
}