import crypto from 'crypto';
import { TOTP, generateURI, verify } from 'otplib';
import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';
import { query } from '../db/connection';

const totp = new TOTP();

export interface MfaSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MfaVerificationResult {
  success: boolean;
  message: string;
}

export class AdminMfaService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter for MFA notifications
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  /**
   * Generate TOTP secret and backup codes for admin user
   */
  async setupMfa(adminId: string, email: string): Promise<MfaSetupResult> {
    try {
      // Generate TOTP secret
      const secret = totp.generateSecret();
      
      // Generate QR code URL for authenticator apps
      const qrCodeUrl = generateURI({
        issuer: 'Elevare Admin Dashboard',
        label: email,
        secret
      });

      // Generate backup codes (10 codes, 8 characters each)
      const backupCodes = this.generateBackupCodes(10);
      
      // Encrypt backup codes before storing
      const encryptedBackupCodes = backupCodes.map(code => this.encryptBackupCode(code));

      // Store MFA secret and backup codes in database
      await query(
        `UPDATE admin_users 
         SET mfa_secret = $1, backup_codes = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [secret, encryptedBackupCodes, adminId]
      );

      logger.info('MFA setup initiated for admin user', { adminId, email });

      return {
        secret,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      logger.error('Failed to setup MFA for admin user', { adminId, error });
      throw new Error('Failed to setup multi-factor authentication');
    }
  }

  /**
   * Verify TOTP code during login
   */
  async verifyTotp(adminId: string, token: string): Promise<MfaVerificationResult> {
    try {
      // Get admin user's MFA secret
      const userResult = await query(
        'SELECT mfa_secret, mfa_enabled FROM admin_users WHERE id = $1',
        [adminId]
      );

      if (userResult.rows.length === 0) {
        return { success: false, message: 'Admin user not found' };
      }

      const { mfa_secret, mfa_enabled } = userResult.rows[0];

      if (!mfa_enabled || !mfa_secret) {
        return { success: false, message: 'MFA not enabled for this account' };
      }

      // Verify TOTP token with time window tolerance
      const verifyResult = await verify({
        token,
        secret: mfa_secret
      });

      if (verifyResult.valid) {
        logger.info('TOTP verification successful', { adminId });
        return { success: true, message: 'TOTP verification successful' };
      } else {
        logger.warn('TOTP verification failed', { adminId });
        return { success: false, message: 'Invalid TOTP code' };
      }
    } catch (error) {
      logger.error('TOTP verification error', { adminId, error });
      return { success: false, message: 'TOTP verification failed' };
    }
  }

  /**
   * Verify backup code during login
   */
  async verifyBackupCode(adminId: string, backupCode: string): Promise<MfaVerificationResult> {
    try {
      // Get admin user's backup codes
      const result = await query(
        'SELECT backup_codes FROM admin_users WHERE id = $1',
        [adminId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Admin user not found' };
      }

      const { backup_codes } = result.rows[0];

      if (!backup_codes || backup_codes.length === 0) {
        return { success: false, message: 'No backup codes available' };
      }

      // Check if backup code matches any encrypted backup code
      const isValidBackupCode = backup_codes.some((encryptedCode: string) => {
        const decryptedCode = this.decryptBackupCode(encryptedCode);
        return decryptedCode === backupCode;
      });

      if (isValidBackupCode) {
        // Remove used backup code
        const updatedBackupCodes = backup_codes.filter((encryptedCode: string) => {
          const decryptedCode = this.decryptBackupCode(encryptedCode);
          return decryptedCode !== backupCode;
        });

        await query(
          'UPDATE admin_users SET backup_codes = $1 WHERE id = $2',
          [updatedBackupCodes, adminId]
        );

        logger.info('Backup code verification successful', { adminId });
        return { success: true, message: 'Backup code verification successful' };
      } else {
        logger.warn('Backup code verification failed', { adminId });
        return { success: false, message: 'Invalid backup code' };
      }
    } catch (error) {
      logger.error('Backup code verification error', { adminId, error });
      return { success: false, message: 'Backup code verification failed' };
    }
  }

  /**
   * Enable MFA for admin user after successful setup verification
   */
  async enableMfa(adminId: string, verificationToken: string): Promise<MfaVerificationResult> {
    try {
      // First verify the TOTP token
      const verification = await this.verifyTotp(adminId, verificationToken);
      
      if (!verification.success) {
        return verification;
      }

      // Enable MFA for the user
      await query(
        'UPDATE admin_users SET mfa_enabled = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [adminId]
      );

      logger.info('MFA enabled for admin user', { adminId });
      return { success: true, message: 'Multi-factor authentication enabled successfully' };
    } catch (error) {
      logger.error('Failed to enable MFA for admin user', { adminId, error });
      return { success: false, message: 'Failed to enable multi-factor authentication' };
    }
  }

  /**
   * Disable MFA for admin user (requires current TOTP verification)
   */
  async disableMfa(adminId: string, verificationToken: string): Promise<MfaVerificationResult> {
    try {
      // First verify the TOTP token
      const verification = await this.verifyTotp(adminId, verificationToken);
      
      if (!verification.success) {
        return verification;
      }

      // Disable MFA and clear secrets
      await query(
        `UPDATE admin_users 
         SET mfa_enabled = false, mfa_secret = NULL, backup_codes = NULL, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [adminId]
      );

      logger.info('MFA disabled for admin user', { adminId });
      return { success: true, message: 'Multi-factor authentication disabled successfully' };
    } catch (error) {
      logger.error('Failed to disable MFA for admin user', { adminId, error });
      return { success: false, message: 'Failed to disable multi-factor authentication' };
    }
  }

  /**
   * Send email verification for admin registration
   */
  async sendEmailVerification(email: string, verificationToken: string): Promise<void> {
    try {
      const verificationUrl = `${config.apiUrl}/admin/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Elevare Admin Account - Email Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification Required</h2>
            <p>Welcome to the Elevare Admin Dashboard. Please verify your email address to complete your account setup.</p>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              If you didn't request this verification, please ignore this email.
              <br>This link will expire in 24 hours.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Email verification sent', { email });
    } catch (error) {
      logger.error('Failed to send email verification', { email, error });
      throw new Error('Failed to send email verification');
    }
  }

  /**
   * Generate secure backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Encrypt backup code for secure storage
   */
  private encryptBackupCode(code: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(config.jwtSecret, 'backup-codes', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(code, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt backup code for verification
   */
  private decryptBackupCode(encryptedCode: string): string {
    try {
      const [_ivHex, authTagHex, encrypted] = encryptedCode.split(':');
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(config.jwtSecret, 'backup-codes', 32);
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt backup code', { error });
      return '';
    }
  }

  /**
   * Generate secure email verification token
   */
  generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if admin user has MFA enabled
   */
  async isMfaEnabled(adminId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT mfa_enabled FROM admin_users WHERE id = $1',
        [adminId]
      );

      return result.rows.length > 0 && result.rows[0].mfa_enabled;
    } catch (error) {
      logger.error('Failed to check MFA status', { adminId, error });
      return false;
    }
  }
}

export default new AdminMfaService();