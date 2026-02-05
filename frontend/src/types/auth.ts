export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  university?: string;
  major?: string;
  graduation_date?: string;
  preferred_language?: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  // Additional profile fields
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  age?: number;
  account_type?: 'student' | 'educator' | 'professional' | 'researcher' | 'other';
  institution?: string;
  timezone?: string;
  account_status?: 'active' | 'suspended' | 'deleted' | 'pending';
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProfileUpdateData {
  name?: string;
  bio?: string;
  avatar_url?: string;
  university?: string;
  major?: string;
  graduation_date?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  age?: number | null;
  account_type?: 'student' | 'educator' | 'professional' | 'researcher' | 'other';
  institution?: string;
  timezone?: string;
}
