'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/admin-api-client';
import type { AdminSession } from '@/types/admin';

export function useAdminAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Get current admin session - only fetch if token exists
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('admin_token');
  
  const {
    data: session,
    isLoading,
    error,
  } = useQuery<AdminSession>({
    queryKey: ['admin-session'],
    queryFn: () => adminApiClient.getSession(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!hasToken, // Only fetch if token exists
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      adminApiClient.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session'] });
    },
  });

  // OTP verification mutation
  const verifyOtpMutation = useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      adminApiClient.verifyOtp(email, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session'] });
      router.push('/admin/dashboard');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => adminApiClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/admin/login');
    },
  });

  // Refresh token mutation
  const refreshTokenMutation = useMutation({
    mutationFn: () => adminApiClient.refreshToken(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session'] });
    },
  });

  return {
    session,
    isLoading,
    error,
    isAuthenticated: !!session,
    admin: session?.admin,
    login: loginMutation.mutate,
    verifyOtp: verifyOtpMutation.mutate,
    logout: logoutMutation.mutate,
    refreshToken: refreshTokenMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
