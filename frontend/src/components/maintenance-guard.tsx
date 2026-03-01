'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkMaintenanceMode, isAdmin } from '@/lib/maintenance-checker';
import { toast } from 'sonner';

// Public routes that should be accessible during maintenance mode
const PUBLIC_ROUTES = [
  '/maintenance',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-otp',
  '/', // Landing page
];

const COUNTDOWN_SECONDS = 15;

/**
 * MaintenanceGuard component
 * Checks if the system is in maintenance mode and redirects non-admin users
 * Shows a notification with countdown before redirecting
 * Should be placed in the root layout to protect all pages
 */
export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    const checkMaintenance = async () => {
      // Extract the route without locale prefix
      const pathParts = pathname.split('/');
      const locale = pathParts[1]; // e.g., 'en', 'ko', 'ne'
      const routeWithoutLocale = '/' + pathParts.slice(2).join('/');
      
      // Check if current route is public
      const isPublicRoute = PUBLIC_ROUTES.some(route => {
        if (route === '/') {
          return routeWithoutLocale === '' || routeWithoutLocale === '/';
        }
        return routeWithoutLocale.startsWith(route);
      });

      // Skip check if on public route
      if (isPublicRoute) {
        setIsChecking(false);
        setShowCountdown(false); // Hide countdown on public routes
        return;
      }

      // Skip check if user is admin
      if (isAdmin()) {
        setIsChecking(false);
        setShowCountdown(false); // Hide countdown for admins
        return;
      }

      try {
        const status = await checkMaintenanceMode();
        
        if (status.enabled) {
          // Show notification and countdown
          setMaintenanceMessage(status.message || 'The platform is currently under maintenance.');
          setShowCountdown(true);
          
          // Show toast notification
          toast.warning('Maintenance Mode Active', {
            description: `You will be redirected to the maintenance page in ${COUNTDOWN_SECONDS} seconds.`,
            duration: COUNTDOWN_SECONDS * 1000,
          });
        } else {
          setShowCountdown(false); // Hide countdown if maintenance is not enabled
        }
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkMaintenance();
  }, [pathname]);

  // Countdown timer
  useEffect(() => {
    if (!showCountdown || countdown <= 0) {
      if (countdown === 0) {
        // Redirect to maintenance page
        const locale = pathname.split('/')[1] || 'en';
        router.push(`/${locale}/maintenance`);
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showCountdown, countdown, pathname, router]);

  // Show nothing while checking to prevent flash of content
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF7] dark:bg-[hsl(0,0%,7%)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show countdown notification banner
  if (showCountdown) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-lg">Maintenance Mode Active</p>
                  <p className="text-sm opacity-90">
                    {maintenanceMessage || 'The platform is currently under maintenance. Please check back later.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums">{countdown}</div>
                  <div className="text-xs opacity-90">seconds</div>
                </div>
                <button
                  onClick={() => {
                    const locale = pathname.split('/')[1] || 'en';
                    router.push(`/${locale}/maintenance`);
                  }}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  Go Now
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-20">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
