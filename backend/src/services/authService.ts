import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, getClient } from '../db/connection';
import config from '../config';
import logger from '../utils/logger';
import {
  RegisterRequest,
  LoginRequest,
  User,
  UserWithPassword,
  TokenPayload,
  ProfileUpdateRequest,
} from '../types/auth';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, email: string): string {
  const payload: TokenPayload = { userId, email };
  return jwt.sign(payload, config.jwtSecret, { 
    expiresIn: config.jwtExpiresIn 
  } as jwt.SignOptions);
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

/**
 * Generate a password reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Register a new user
 */
export async function register(
  data: RegisterRequest
): Promise<{ user: User; otp: string }> {
  const { email, password, name } = data;

  // Check if user already exists
  const existingUser = await query<User>(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Generate OTP
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Insert user with OTP
  const result = await query<User>(
    `INSERT INTO users (email, password_hash, name, email_verified, otp_code, otp_expires_at, otp_attempts)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, name, bio, avatar_url, email_verified, created_at, updated_at`,
    [email, password_hash, name, false, otp, otpExpiresAt, 0]
  );

  const user = result.rows[0];

  logger.info('User registered successfully, OTP generated', { userId: user.id, email: user.email });

  return { user, otp };
}

/**
 * Login a user
 */
export async function login(
  data: LoginRequest
): Promise<{ user: User; token: string }> {
  const { email, password } = data;

  // Find user with password hash
  const result = await query<UserWithPassword>(
    `SELECT id, email, password_hash, name, bio, avatar_url, email_verified, created_at, updated_at
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const userWithPassword = result.rows[0];

  // Verify password
  const isValidPassword = await comparePassword(
    password,
    userWithPassword.password_hash
  );

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Check if email is verified
  if (!userWithPassword.email_verified) {
    throw new Error('Email not verified. Please verify your email with the OTP sent to your email address.');
  }

  // Remove password hash from user object
  const { password_hash, ...user } = userWithPassword;

  // Generate token
  const token = generateToken(user.id, user.email);

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  return { user, token };
}

/**
 * Find user by ID
 */
export async function findById(userId: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, name, bio, avatar_url, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Find user by email
 */
export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, name, bio, avatar_url, email_verified, created_at, updated_at
     FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: ProfileUpdateRequest
): Promise<User> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }

  if (data.bio !== undefined) {
    updates.push(`bio = $${paramCount++}`);
    values.push(data.bio);
  }

  if (data.avatar_url !== undefined) {
    updates.push(`avatar_url = $${paramCount++}`);
    values.push(data.avatar_url);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query<User>(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, email, name, bio, avatar_url, email_verified, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  logger.info('User profile updated', { userId });

  return result.rows[0];
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const user = await findByEmail(email);

  if (!user) {
    throw new Error('User not found');
  }

  const resetToken = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Store reset token in database
  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
    [user.id, resetToken, expiresAt]
  );

  logger.info('Password reset token created', { userId: user.id });

  return resetToken;
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Find valid reset token
    const tokenResult = await client.query(
      `SELECT user_id, expires_at FROM password_reset_tokens
       WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const { user_id } = tokenResult.rows[0];

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update user password
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      password_hash,
      user_id,
    ]);

    // Delete used reset token
    await client.query('DELETE FROM password_reset_tokens WHERE token = $1', [
      token,
    ]);

    await client.query('COMMIT');

    logger.info('Password reset successfully', { userId: user_id });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  email: string,
  otpCode: string
): Promise<{ user: User; token: string }> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Find user with OTP
    const result = await client.query(
      `SELECT id, email, name, bio, avatar_url, email_verified, otp_code, otp_expires_at, otp_attempts, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      throw new Error('Email already verified');
    }

    // Check if OTP exists
    if (!user.otp_code || !user.otp_expires_at) {
      throw new Error('No OTP found. Please request a new one.');
    }

    // Check if OTP expired
    if (new Date() > new Date(user.otp_expires_at)) {
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Check attempts (max 5 attempts)
    if (user.otp_attempts >= 5) {
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (user.otp_code !== otpCode) {
      // Increment attempts
      await client.query(
        'UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1',
        [user.id]
      );
      await client.query('COMMIT');
      throw new Error('Invalid OTP code');
    }

    // Mark email as verified and clear OTP fields
    await client.query(
      `UPDATE users SET email_verified = true, otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    // Generate token
    const token = generateToken(user.id, user.email);

    // Remove OTP fields from user object
    const { otp_code, otp_expires_at, otp_attempts, ...verifiedUser } = user;
    verifiedUser.email_verified = true;

    logger.info('Email verified successfully', { userId: user.id, email: user.email });

    return { user: verifiedUser, token };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Resend OTP code
 */
export async function resendOTP(email: string): Promise<string> {
  const user = await findByEmail(email);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.email_verified) {
    throw new Error('Email already verified');
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Update user with new OTP and reset attempts
  await query(
    `UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0
     WHERE email = $3`,
    [otp, otpExpiresAt, email]
  );

  logger.info('OTP resent', { email });

  return otp;
}
