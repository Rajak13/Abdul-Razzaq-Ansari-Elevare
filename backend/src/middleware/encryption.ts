import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from './errorHandler';

/**
 * Encryption and data protection middleware
 * Implements secure encryption for sensitive data
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

// Get encryption key from environment or generate one
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    logger.warn('ENCRYPTION_KEY not set in environment, using generated key (not recommended for production)');
    return crypto.randomBytes(KEY_LENGTH);
  }
  
  // Derive key from environment variable
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
};

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    logger.error('Encryption error', { error });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error', { error });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string, salt?: string): {
  hash: string;
  salt: string;
} {
  try {
    const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto
      .pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512')
      .toString('hex');
    
    return { hash, salt: actualSalt };
  } catch (error) {
    logger.error('Hashing error', { error });
    throw new Error('Failed to hash data');
  }
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  try {
    const { hash: computedHash } = hashData(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch (error) {
    logger.error('Hash verification error', { error });
    return false;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate cryptographic hash for integrity verification
 */
export function generateIntegrityHash(data: any): string {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Verify data integrity
 */
export function verifyIntegrity(data: any, hash: string): boolean {
  const computedHash = generateIntegrityHash(data);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(computedHash, 'hex')
  );
}

/**
 * Encrypt session token
 */
export function encryptSessionToken(token: string): string {
  const { encrypted, iv, authTag } = encryptData(token);
  return `${encrypted}.${iv}.${authTag}`;
}

/**
 * Decrypt session token
 */
export function decryptSessionToken(encryptedToken: string): string {
  const [encrypted, iv, authTag] = encryptedToken.split('.');
  if (!encrypted || !iv || !authTag) {
    throw new Error('Invalid encrypted token format');
  }
  return decryptData(encrypted, iv, authTag);
}

/**
 * Middleware to enforce HTTPS/TLS
 */
export const enforceHttps = (_req: Request, _res: Response, next: NextFunction) => {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // Check if request is secure
  const isSecure = _req.secure || _req.headers['x-forwarded-proto'] === 'https';
  
  if (!isSecure) {
    logger.warn('Insecure HTTP request blocked', {
      path: _req.path,
      ip: _req.ip,
    });
    
    throw new AppError(
      'HTTPS required',
      403,
      'HTTPS_REQUIRED'
    );
  }
  
  next();
};

/**
 * Middleware to add security headers for TLS
 */
export const tlsSecurityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Strict Transport Security
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Upgrade insecure requests
  res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  
  next();
};

/**
 * Encrypt sensitive fields in request body
 */
export const encryptSensitiveFields = (fields: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    if (_req.body && typeof _req.body === 'object') {
      for (const field of fields) {
        if (_req.body[field]) {
          const encrypted = encryptData(_req.body[field]);
          _req.body[`${field}_encrypted`] = encrypted.encrypted;
          _req.body[`${field}_iv`] = encrypted.iv;
          _req.body[`${field}_authTag`] = encrypted.authTag;
          delete _req.body[field]; // Remove plaintext
        }
      }
    }
    next();
  };
};

/**
 * Decrypt sensitive fields in response
 */
export const decryptSensitiveFields = (fields: string[]) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function (data: any) {
      if (data && typeof data === 'object') {
        for (const field of fields) {
          const encryptedField = `${field}_encrypted`;
          const ivField = `${field}_iv`;
          const authTagField = `${field}_authTag`;
          
          if (data[encryptedField] && data[ivField] && data[authTagField]) {
            try {
              data[field] = decryptData(
                data[encryptedField],
                data[ivField],
                data[authTagField]
              );
              delete data[encryptedField];
              delete data[ivField];
              delete data[authTagField];
            } catch (error) {
              logger.error('Failed to decrypt field', { field, error });
            }
          }
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Secure password hashing (bcrypt is used in auth service, this is for additional security)
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, crypto.randomBytes(16), 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '***';
  }
  
  const visible = data.slice(-visibleChars);
  const masked = '*'.repeat(Math.min(data.length - visibleChars, 8));
  return `${masked}${visible}`;
}

/**
 * Sanitize data for secure storage
 */
export function sanitizeForStorage(data: any): any {
  if (typeof data === 'string') {
    return data.trim().substring(0, 10000);
  }
  
  if (Array.isArray(data)) {
    return data.slice(0, 1000).map(sanitizeForStorage);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    const keys = Object.keys(data).slice(0, 100);
    
    for (const key of keys) {
      sanitized[key] = sanitizeForStorage(data[key]);
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  } catch {
    return false;
  }
}
