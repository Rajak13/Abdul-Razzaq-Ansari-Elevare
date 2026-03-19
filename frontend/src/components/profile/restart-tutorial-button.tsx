'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWalkthroughStore } from '@/stores/walkthrough-store';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useRouter } from '@/navigation';
import apiClient from '@/lib/api-client';

export function RestartTutorialButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { resetTour } = useWalkthroughStore();
  const { refreshUser } = useAuth();

  const handleRestartTutorial = async () => {
    try {
      setIsLoading(true);

      // Call backend to reset walkthrough status
      await apiClient.post('/auth/walkthrough/reset');

      // Reset local state
      resetTour();

      // Refresh user data
      await refreshUser();

      toast.success('Tutorial reset successfully! Redirecting to dashboard...');

      // Redirect to dashboard immediately
      router.push('/dashboard');
    } catch (error) {
      console.error('Error resetting tutorial:', error);
      toast.error('Failed to reset tutorial. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Restart Tutorial
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restart the Tutorial?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset your tutorial progress and take you through the guided walkthrough again. 
            You'll be redirected to the dashboard to start the tutorial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestartTutorial} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              'Restart Tutorial'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
