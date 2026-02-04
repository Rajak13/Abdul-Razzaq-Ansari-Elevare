import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import { query, getClient } from '../db/connection';
import adminMfaService, { MfaVerificationResult } from './adminMfaService';

export interface AdminUser {
  id: string;
  email: string;
  role: 'owner' | 'administrator' | 'moderator';
  mfa_enabled: boolean;
  last_login?: Date;
  failed_login_attempts: number;
  account_locked: boolean;
  locked_until?: Date;
  created_at: Date;
}

export interface LoginResult {
  success: boolean;
  message: string;
  requiresMfa?: boolean;
  adminId?: string;
  token?: string;
  refreshToken?: string;
  admin?: Partial<AdminUser>;
}

export interface AdminSession {
  id: string;
  admin_id: string;
  token_hash: string;
  ip_address: string;
  user_agent: string;
  expires_at: Date;
  created_at: Date;
}

export class AdminAuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;
  private readonly SESSION_TIMEOUT_HOURS = 2;

  /**
   * Create new admin user with email verification
   */
  async createAdminUser(
    email: string,
    password: string,
    role: 'owner' | 'administrator' | 'moderator',
    createdBy: string
  ): Promise<{ adminId: string; verificationToken: string }> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Check if admin user already exists
      const existingUser = await client.query(
        'SELECT id FROM admin_users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Admin user with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create admin user
      const adminResult = await client.query(
        `INSERT INTO admin_users (email, password_hash, role, mfa_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [email, passwordHash, role]
      );

      const adminId = adminResult.rows[0].id;

      // Generate email verification token
      const verificationToken = adminMfaService.generateEmailVerificationToken();

      // Create audit log entry
      await client.query(
        `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details, ip_address, timestamp)
         VALUES ($1, 'admin_user_created', 'admin_user', $2, $3, '127.0.0.1'::inet, CURRENT_TIMESTAMP)`,
        [
          createdBy,
          adminId,
          JSON.stringify({ email, role, created_by: createdBy })
        ]
      );

      await client.query('COMMIT');

      // Send email verification
      await adminMfaService.sendEmailVerification(email, verificationToken);

      logger.info('Admin user created successfully', { adminId, email, role, createdBy });

      return { adminId, verificationToken };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create admin user', { email, role, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate admin user with email and password
   */
  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    try {
      // Get admin user
      const userResult = await query(
        `SELECT id, email, password_hash, role, mfa_enabled, last_login, 
                failed_login_attempts, account_locked, locked_until
         FROM admin_users WHERE email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        await this.logSecurityEvent('failed_login', 'medium', ipAddress, userAgent, undefined, {
          reason: 'user_not_found',
          email
        });
        return { success: false, message: 'Invalid credentials' };
      }

      const admin = userResult.rows[0];

      // Check if account is locked
      if (admin.account_locked) {
        if (admin.locked_until && new Date() < new Date(admin.locked_until)) {
          await this.logSecurityEvent('failed_login', 'high', ipAddress, userAgent, admin.id, {
            reason: 'account_locked',
            locked_until: admin.locked_until
          });
          return { success: false, message: 'Account is temporarily locked due to security violations' };
        } else {
          // Unlock account if lock period has expired
          await query(
            'UPDATE admin_users SET account_locked = false, locked_until = NULL, failed_login_attempts = 0 WHERE id = $1',
            [admin.id]
          );
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);

      if (!isValidPassword) {
        await this.handleFailedLogin(admin.id, ipAddress, userAgent);
        return { success: false, message: 'Invalid credentials' };
      }

      // Reset failed login attempts on successful password verification
      await query(
        'UPDATE admin_users SET failed_login_attempts = 0 WHERE id = $1',
        [admin.id]
      );

      // Check if MFA is required
      if (admin.mfa_enabled) {
        logger.info('Login successful, MFA required', { adminId: admin.id, email });
        return {
          success: true,
          message: 'Password verified, MFA required',
          requiresMfa: true,
          adminId: admin.id
        };
      }

      // Complete login without MFA
      const loginResult = await this.completeLogin(admin, ipAddress, userAgent);
      return loginResult;

    } catch (error) {
      logger.error('Login error', { email, error });
      return { success: false, message: 'Login failed due to server error' };
    }
  }

  /**
   * Complete login with MFA verification
   */
  async loginWithMfa(
    adminId: string,
    mfaToken: string,
    ipAddress: string,
    userAgent: string,
    isBackupCode: boolean = false
  ): Promise<LoginResult> {
    try {
      // Verify MFA token
      let mfaResult: MfaVerificationResult;
      
      if (isBackupCode) {
        mfaResult = await adminMfaService.verifyBackupCode(adminId, mfaToken);
      } else {
        mfaResult = await adminMfaService.verifyTotp(adminId, mfaToken);
      }

      if (!mfaResult.success) {
        await this.handleFailedLogin(adminId, ipAddress, userAgent);
        return { success: false, message: mfaResult.message };
      }

      // Get admin user details
      const userResult = await query(
        'SELECT id, email, role, mfa_enabled, last_login FROM admin_users WHERE id = $1',
        [adminId]
      );

      if (userResult.rows.length === 0) {
        return { success: false, message: 'Admin user not found' };
      }

      const admin = userResult.rows[0];

      // Complete login
      const loginResult = await this.completeLogin(admin, ipAddress, userAgent);
      return loginResult;

    } catch (error) {
      logger.error('MFA login error', { adminId, error });
      return { success: false, message: 'MFA verification failed due to server error' };
    }
  }

  /**
   * Complete the login process and create session
   */
  private async completeLogin(
    admin: any,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Generate JWT tokens
      const tokenPayload = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'access'
      };

      const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: `${this.SESSION_TIMEOUT_HOURS}h`,
        issuer: 'elevare-admin',
        audience: 'elevare-admin-dashboard'
      });

      const refreshTokenPayload = {
        adminId: admin.id,
        type: 'refresh'
      };

      const refreshToken = jwt.sign(refreshTokenPayload, config.jwtSecret, {
        expiresIn: '7d',
        issuer: 'elevare-admin',
        audience: 'elevare-admin-dashboard'
      });

      // Hash tokens for storage
      const accessTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

      // Create admin session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_TIMEOUT_HOURS);

      await client.query(
        `INSERT INTO admin_sessions (admin_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3::inet, $4, $5)`,
        [admin.id, accessTokenHash, ipAddress, userAgent, expiresAt]
      );

      // Update last login
      await client.query(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [admin.id]
      );

      // Create audit log entry
      await client.query(
        `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details, ip_address, timestamp)
         VALUES ($1, 'admin_login', 'admin_session', $2, $3, $4::inet, CURRENT_TIMESTAMP)`,
        [
          admin.id,
          admin.id,
          JSON.stringify({ ip_address: ipAddress, user_agent: userAgent }),
          ipAddress
        ]
      );

      await client.query('COMMIT');

      logger.info('Admin login successful', { adminId: admin.id, email: admin.email, ipAddress });

      return {
        success: true,
        message: 'Login successful',
        token: accessToken,
        refreshToken: refreshToken,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          mfa_enabled: admin.mfa_enabled
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to complete login', { adminId: admin.id, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle failed login attempts and account locking
   */
  private async handleFailedLogin(
    adminId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      // Increment failed login attempts
      const result = await query(
        `UPDATE admin_users 
         SET failed_login_attempts = failed_login_attempts + 1
         WHERE id = $1
         RETURNING failed_login_attempts`,
        [adminId]
      );

      const failedAttempts = result.rows[0]?.failed_login_attempts || 0;

      // Lock account if max attempts reached
      if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCK_DURATION_MINUTES);

        await query(
          `UPDATE admin_users 
           SET account_locked = true, locked_until = $1
           WHERE id = $2`,
          [lockUntil, adminId]
        );

        await this.logSecurityEvent('account_locked', 'high', ipAddress, userAgent, adminId, {
          failed_attempts: failedAttempts,
          locked_until: lockUntil
        });

        logger.warn('Admin account locked due to failed login attempts', {
          adminId,
          failedAttempts,
          lockedUntil: lockUntil
        });
      } else {
        await this.logSecurityEvent('failed_login', 'medium', ipAddress, userAgent, adminId, {
          failed_attempts: failedAttempts,
          remaining_attempts: this.MAX_FAILED_ATTEMPTS - failedAttempts
        });
      }

    } catch (error) {
      logger.error('Failed to handle failed login', { adminId, error });
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    sourceIp: string,
    userAgent: string,
    adminId?: string,
    details?: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO security_events (event_type, severity, source_ip, user_agent, admin_id, details)
         VALUES ($1, $2, $3::inet, $4, $5, $6)`,
        [eventType, severity, sourceIp, userAgent, adminId, JSON.stringify(details)]
      );
    } catch (error) {
      logger.error('Failed to log security event', { eventType, severity, error });
    }
  }

  /**
   * Logout admin user and invalidate session
   */
  async logout(token: string, ipAddress: string): Promise<{ success: boolean; message: string }> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Get session details
      const sessionResult = await query(
        'SELECT admin_id FROM admin_sessions WHERE token_hash = $1',
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        return { success: false, message: 'Invalid session' };
      }

      const adminId = sessionResult.rows[0].admin_id;

      // Delete session
      await query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash]);

      // Create audit log entry
      await query(
        `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details, ip_address, timestamp)
         VALUES ($1, 'admin_logout', 'admin_session', $2, $3, $4::inet, CURRENT_TIMESTAMP)`,
        [
          adminId,
          adminId,
          JSON.stringify({ ip_address: ipAddress }),
          ipAddress
        ]
      );

      logger.info('Admin logout successful', { adminId, ipAddress });

      return { success: true, message: 'Logout successful' };

    } catch (error) {
      logger.error('Logout error', { error });
      return { success: false, message: 'Logout failed due to server error' };
    }
  }

  /**
   * Refresh admin access token using refresh token
   */
  async refreshToken(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwtSecret, {
        issuer: 'elevare-admin',
        audience: 'elevare-admin-dashboard'
      }) as any;

      if (decoded.type !== 'refresh') {
        return { success: false, message: 'Invalid token type' };
      }

      const adminId = decoded.adminId;

      // Get admin user details
      const userResult = await query(
        `SELECT id, email, role, mfa_enabled, account_locked, locked_until
         FROM admin_users WHERE id = $1`,
        [adminId]
      );

      if (userResult.rows.length === 0) {
        return { success: false, message: 'Admin user not found' };
      }

      const admin = userResult.rows[0];

      // Check if account is locked
      if (admin.account_locked) {
        if (admin.locked_until && new Date() < new Date(admin.locked_until)) {
          return { success: false, message: 'Account is temporarily locked' };
        } else {
          // Unlock account if lock period has expired
          await query(
            'UPDATE admin_users SET account_locked = false, locked_until = NULL WHERE id = $1',
            [adminId]
          );
        }
      }

      // Generate new access token
      const tokenPayload = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'access'
      };

      const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: `${this.SESSION_TIMEOUT_HOURS}h`,
        issuer: 'elevare-admin',
        audience: 'elevare-admin-dashboard'
      });

      // Generate new refresh token
      const newRefreshTokenPayload = {
        adminId: admin.id,
        type: 'refresh'
      };

      const newRefreshToken = jwt.sign(newRefreshTokenPayload, config.jwtSecret, {
        expiresIn: '7d',
        issuer: 'elevare-admin',
        audience: 'elevare-admin-dashboard'
      });

      // Hash access token for storage
      const accessTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

      // Create new admin session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_TIMEOUT_HOURS);

      await query(
        `INSERT INTO admin_sessions (admin_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3::inet, $4, $5)`,
        [admin.id, accessTokenHash, ipAddress, userAgent, expiresAt]
      );

      // Create audit log entry
      await query(
        `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details, ip_address, timestamp)
         VALUES ($1, 'admin_token_refresh', 'admin_session', $2, $3, $4::inet, CURRENT_TIMESTAMP)`,
        [
          admin.id,
          admin.id,
          JSON.stringify({ ip_address: ipAddress, user_agent: userAgent }),
          ipAddress
        ]
      );

      logger.info('Admin token refresh successful', { adminId: admin.id, ipAddress });

      return {
        success: true,
        message: 'Token refresh successful',
        token: accessToken,
        refreshToken: newRefreshToken,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          mfa_enabled: admin.mfa_enabled
        }
      };

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token', { error: error.message });
        return { success: false, message: 'Invalid or expired refresh token' };
      }

      logger.error('Token refresh error', { error });
      return { success: false, message: 'Token refresh failed due to server error' };
    }
  }

  /**
   * Verify admin session token
   */
  async verifySession(token: string): Promise<{ valid: boolean; admin?: AdminUser }> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: 'elevare-admin',
        audience: 'elevare-admin-dashboard'
      }) as any;

      if (decoded.type !== 'access') {
        return { valid: false };
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Check if session exists and is not expired
      const sessionResult = await query(
        `SELECT s.admin_id, s.expires_at, u.email, u.role, u.mfa_enabled, u.account_locked
         FROM admin_sessions s
         JOIN admin_users u ON s.admin_id = u.id
         WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        return { valid: false };
      }

      const session = sessionResult.rows[0];

      if (session.account_locked) {
        return { valid: false };
      }

      return {
        valid: true,
        admin: {
          id: session.admin_id,
          email: session.email,
          role: session.role,
          mfa_enabled: session.mfa_enabled,
          account_locked: session.account_locked
        } as AdminUser
      };

    } catch (error) {
      logger.error('Session verification error', { error });
      return { valid: false };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP'
      );

      if (result.rowCount && result.rowCount > 0) {
        logger.info('Cleaned up expired admin sessions', { count: result.rowCount });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
    }
  }
}

export default new AdminAuthService();