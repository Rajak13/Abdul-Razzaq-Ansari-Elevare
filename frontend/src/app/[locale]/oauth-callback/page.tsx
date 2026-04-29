'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { toast } from 'sonner';
import socketService from '@/services/socket-service';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const processOAuthCallback = async () => {
      const token = searchParams.get('token');
      const isNewUser = searchParams.get('isNewUser') === 'true';
      const locale = searchParams.get('locale') || 'en';
      const error = searchParams.get('error');

      if (error) {
        toast.error('Authentication failed. Please try again.');
        router.push('/login');
        return;
      }

      if (token) {
        try {
          // Store token
          localStorage.setItem('auth_token', token);
          
          // Initialize socket connection
          socketService.connect(token);
          
          // Show success message
          if (isNewUser) {
            toast.success('Welcome! Your account has been created.');
          } else {
            toast.success('Welcome back!');
          }
          
          // Use window.location for full page reload to ensure auth context initializes
          // Include locale prefix in the URL
          window.location.href = `/${locale}/dashboard`;
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error('Authentication failed. Please try again.');
          localStorage.removeItem('auth_token');
          router.push('/login');
        }
      } else {
        toast.error('Authentication failed. Please try again.');
        router.push('/login');
      }
    };

    processOAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-gray-600 dark:text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
