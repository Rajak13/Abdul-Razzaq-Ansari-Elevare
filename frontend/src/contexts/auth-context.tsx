'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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

      // Redirect to dashboard
      router.push('/dashboard');
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
    try {
      const response = await apiClient.put<{ user: User }>('/auth/profile', data);
      
      // Update user in state
      setState((prev) => ({
        ...prev,
        user: response.data.user,
      }));
    } catch (error) {
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
