'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import apiClient from '@/lib/api-client';
import socketService from '@/services/socket-service';
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ProfileUpdateData,
} from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const router = useRouter();
  const locale = useLocale();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        try {
          // Verify token and get user data
          const response = await apiClient.get<{ user: User }>('/auth/me');
          setState({
            user: response.data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Initialize socket connection
          socketService.connect(token);
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const { user, token } = response.data;

      // Store token
      localStorage.setItem('auth_token', token);

      // Update state
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Initialize socket connection
      socketService.connect(token);

      // Set language preference cookie if user has one
      if (user.preferred_language) {
        document.cookie = `NEXT_LOCALE=${user.preferred_language};path=/;max-age=31536000`;
        // Redirect to dashboard with user's preferred locale
        router.replace('/dashboard', { locale: user.preferred_language });
      } else {
        // Redirect to dashboard with current locale
        router.push('/dashboard');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await apiClient.post('/auth/register', data);
      // Registration successful - redirect to login
      router.push('/login?registered=true');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Disconnect socket
    socketService.disconnect();
    
    // Clear tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');

    // Clear state
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Redirect to home
    router.push('/');
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    console.log('[Auth] updateProfile function called')
    console.log('[Auth] Update data:', data)
    
    try {
      // Filter out empty strings and null values
      const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      console.log('[Auth] Cleaned data:', cleanedData)
      console.log('[Auth] Making API request to /auth/profile')
      console.log('[Auth] Token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing')
      
      const response = await apiClient.put<{ user: User }>('/auth/profile', cleanedData);
      console.log('[Auth] API response received:', response.data)
      
      // Update user in state
      setState((prev) => ({
        ...prev,
        user: response.data.user,
      }));
      console.log('[Auth] User state updated')
    } catch (error: any) {
      console.error('[Auth] updateProfile error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error headers:', error.response?.headers)
      throw error;
    }
  };

  const uploadAvatar = async (file: File) => {
    console.log('🔧 uploadAvatar function called')
    console.log('📁 File to upload:', {
      name: file.name,
      type: file.type,
      size: file.size
    })
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      console.log('📦 FormData created')
      console.log('📦 FormData contents:', Array.from(formData.entries()))

      console.log('🌐 Making API request to /auth/avatar')
      console.log('🔑 Token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing')
      
      const response = await apiClient.post<{ user: User; avatar_url: string }>('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ API response received:', response.data)
      
      // Update user in state
      setState((prev) => ({
        ...prev,
        user: response.data.user,
      }));
      console.log('✅ User state updated')

      return response.data.avatar_url;
    } catch (error: any) {
      console.error('❌ uploadAvatar error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error headers:', error.response?.headers)
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      setState((prev) => ({
        ...prev,
        user: response.data.user,
      }));
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    uploadAvatar,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
