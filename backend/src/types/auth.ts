export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

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
  created_at: Date;
  updated_at: Date;
  // Additional profile fields
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  age?: number;
  account_type?: 'student' | 'educator' | 'professional' | 'researcher' | 'other';
  institution?: string;
  timezone?: string;
  account_status?: 'active' | 'suspended' | 'deleted' | 'pending';
  last_login?: Date;
  walkthrough_completed?: boolean;
  // OAuth fields
  oauth_provider?: 'google' | 'facebook' | null;
  oauth_id?: string;
  oauth_profile?: any;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  bio?: string;
  avatar_url?: string;
  university?: string;
  major?: string;
  graduation_date?: string;
  preferred_language?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  age?: number;
  account_type?: 'student' | 'educator' | 'professional' | 'researcher' | 'other';
  institution?: string;
  timezone?: string;
}

export interface OAuthProfile {
  provider: 'google' | 'facebook';
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  raw?: any;
}
