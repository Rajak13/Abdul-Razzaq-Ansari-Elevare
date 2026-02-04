'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'administrator' | 'moderator';
}

export function AdminRouteGuard({
  children,
  requiredRole,
}: AdminRouteGuardProps) {
  const router = useRouter();
  const { isAuthenticated, admin, isLoading } = useAdminAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  useEffect(() => {
    if (mounted && requiredRole && admin && !hasRequiredRole(admin.role, requiredRole)) {
      router.push('/admin/dashboard');
    }
  }, [admin, requiredRole, router, mounted]);

  // Prevent hydration mismatch by showing loading on first render
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FCFBF7]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && admin && !hasRequiredRole(admin.role, requiredRole)) {
    return null;
  }

  return <>{children}</>;
}

function hasRequiredRole(
  userRole: string,
  requiredRole: string
): boolean {
  const roleHierarchy = {
    owner: 3,
    administrator: 2,
    moderator: 1,
  };

  return (
    roleHierarchy[userRole as keyof typeof roleHierarchy] >=
    roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  );
}
