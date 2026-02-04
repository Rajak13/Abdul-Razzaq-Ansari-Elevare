import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from './logger';

/**
 * Secure password storage and handling utilities
 * Uses bcrypt for password hashing with additional security measures
 */

// Password policy configuration
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  preventCommonPasswords: true,
  preventUserInfo: true,
};

// Common weak passwords to block
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
]);

/**
 * Hash password using bcrypt with high cost factor
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Use cost factor of 12 for strong security
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    logger.error('Password hashing error', { error });
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password verification error', { error });
    return false;
  }
}

/**
 * Validate password against security policy
 */
export function validatePassword(
  password: string,
  userInfo?: { email?: string; name?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
  }

  // Check uppercase
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check lowercase
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check numbers
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check special characters
  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  if (PASSWORD_POLICY.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      errors.push('Password is too common, please choose a stronger password');
    }
  }

  // Check for user info in password
  if (PASSWORD_POLICY.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@')[0];
      if (lowerPassword.includes(emailParts)) {
        errors.push('Password should not contain your email address');
      }
    }
    
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(' ');
      for (const part of nameParts) {
        if (part.length > 2 && lowerPassword.includes(part)) {
          errors.push('Password should not contain your name');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each required type
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(-1, 2))
    .join('');
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string;
} {
  let score = 0;
  
  // Length score (max 30 points)
  score += Math.min(password.length * 2, 30);
  
  // Character variety (max 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
  
  // Complexity patterns (max 30 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars, 15);
  
  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|234|345|456|567|678|789|890/.test(password)) score -= 10; // Sequential numbers
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score -= 10; // Sequential letters
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  // Provide feedback
  let feedback = '';
  if (score < 30) {
    feedback = 'Very weak - Please use a stronger password';
  } else if (score < 50) {
    feedback = 'Weak - Consider adding more characters and variety';
  } else if (score < 70) {
    feedback = 'Moderate - Good, but could be stronger';
  } else if (score < 90) {
    feedback = 'Strong - This is a good password';
  } else {
    feedback = 'Very strong - Excellent password';
  }
  
  return { score, feedback };
}

/**
 * Check if password has been compromised (basic check)
 * In production, integrate with Have I Been Pwned API
 */
export function isPasswordCompromised(password: string): boolean {
  // Basic check against common passwords
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour
  
  return { token, hash, expiresAt };
}

/**
 * Verify password reset token
 */
export function verifyPasswordResetToken(token: string, hash: string): boolean {
  const computedHash = crypto.createHash('sha256').update(token).digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Securely wipe password from memory
 */
export function wipePassword(password: string): void {
  // Overwrite the string in memory (best effort)
  if (password) {
    for (let i = 0; i < password.length; i++) {
      password = password.substring(0, i) + '\0' + password.substring(i + 1);
    }
  }
}
