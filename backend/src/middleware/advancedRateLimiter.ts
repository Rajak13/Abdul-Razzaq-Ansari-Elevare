import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

/**
 * Advanced rate limiting and DDoS protection middleware
 * Implements progressive delays, IP blocking, and request throttling
 */

// In-memory store for tracking violations (use Redis in production)
const violationStore = new Map<string, { count: number; firstViolation: Date }>();
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number; lastSeen: Date }>();

// Get client IP address
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Check if IP is blocked
export const checkBlockedIP = (req: Request, _res: Response, next: NextFunction) => {
  const ip = getClientIp(req);

  // Skip block check for localhost in development
  if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost')) {
    return next();
  }

  if (blockedIPs.has(ip)) {
    logger.warn('Blocked IP attempted access', { ip, path: req.path });
    throw new AppError('Access denied', 403, 'IP_BLOCKED');
  }

  next();
};

// Block an IP address
export const blockIP = (ip: string, duration: number = 3600000): void => {
  blockedIPs.add(ip);
  logger.warn('IP blocked', { ip, duration });

  // Auto-unblock after duration
  setTimeout(() => {
    blockedIPs.delete(ip);
    logger.info('IP unblocked', { ip });
  }, duration);
};

// Track suspicious activity
export const trackSuspiciousActivity = (ip: string): void => {
  const existing = suspiciousIPs.get(ip);

  if (existing) {
    existing.count++;
    existing.lastSeen = new Date();

    // Block if too many suspicious activities
    const limit = process.env.NODE_ENV === 'development' ? 50 : 10;
    if (existing.count > limit) {
      blockIP(ip, 3600000); // Block for 1 hour
      suspiciousIPs.delete(ip);
    }
  } else {
    suspiciousIPs.set(ip, { count: 1, lastSeen: new Date() });
  }
};

// Clean up old suspicious activity records
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of suspiciousIPs.entries()) {
    if (now - data.lastSeen.getTime() > 3600000) {
      suspiciousIPs.delete(ip);
    }
  }
}, 300000); // Clean up every 5 minutes

// Standard rate limiter for general API endpoints
export const standardRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    trackSuspiciousActivity(ip);
    logger.warn('Rate limit exceeded', { ip, path: req.path });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        timestamp: new Date().toISOString(),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Strict rate limiter for admin endpoints
export const adminRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 50, // Higher limit in development
  message: 'Too many admin requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    trackSuspiciousActivity(ip);
    logger.warn('Admin rate limit exceeded', { ip, path: req.path });

    res.status(429).json({
      error: {
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        message: 'Too many admin requests, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// Very strict rate limiter for authentication endpoints
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    const ip = getClientIp(req);
    trackSuspiciousActivity(ip);
    logger.warn('Auth rate limit exceeded', { ip, path: req.path });

    // Block IP after repeated violations
    const violations = violationStore.get(ip);
    if (violations && violations.count > 3) {
      blockIP(ip, 3600000); // Block for 1 hour
    }

    res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// Progressive delay for failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export const progressiveLoginDelay = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const ip = getClientIp(req);
  const attempts = loginAttempts.get(ip);

  if (attempts) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();

    // Progressive delay: 1s, 2s, 4s, 8s max (keep under Render's 30s timeout)
    const delay = Math.min(Math.pow(2, attempts.count - 1) * 1000, 8000);

    if (timeSinceLastAttempt < delay) {
      const waitTime = delay - timeSinceLastAttempt;
      logger.warn('Progressive delay applied', { ip, waitTime, attempts: attempts.count });

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  next();
};

// Track failed login attempts
export const trackFailedLogin = (ip: string): void => {
  const attempts = loginAttempts.get(ip);

  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = new Date();

    // Block after too many failures
    if (attempts.count > 10) {
      blockIP(ip, 3600000); // Block for 1 hour
      loginAttempts.delete(ip);
    }
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: new Date() });
  }

  // Track as suspicious activity
  trackSuspiciousActivity(ip);
};

// Reset login attempts on successful login
export const resetLoginAttempts = (ip: string): void => {
  loginAttempts.delete(ip);
};

// Clean up old login attempt records
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt.getTime() > 3600000) {
      loginAttempts.delete(ip);
    }
  }
}, 300000); // Clean up every 5 minutes

// Request throttling for resource-intensive operations
export const throttleResourceIntensiveOps: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many resource-intensive requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = getClientIp(req);
    logger.warn('Resource-intensive operation throttled', { ip, path: req.path });

    res.status(429).json({
      error: {
        code: 'THROTTLE_LIMIT_EXCEEDED',
        message: 'Too many resource-intensive requests, please slow down',
        retryAfter: res.getHeader('Retry-After'),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// DDoS protection - detect and block rapid requests
const requestCounts = new Map<string, number[]>();

export const ddosProtection = (req: Request, _res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const now = Date.now();

  // Get request timestamps for this IP
  let timestamps = requestCounts.get(ip) || [];

  // Remove timestamps older than 10 seconds
  timestamps = timestamps.filter((ts) => now - ts < 10000);

  // Add current timestamp
  timestamps.push(now);
  requestCounts.set(ip, timestamps);

  // Check if too many requests in short time (potential DDoS)
  // Increased limit for development/dashboard usage
  const threshold = process.env.NODE_ENV === 'development' ? 2000 : 500;
  
  if (timestamps.length > threshold) {
    // Skip blocking for localhost in development
    if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost')) {
      logger.warn('DDoS threshold reached but skipping block for localhost', { ip, count: timestamps.length });
      return next();
    }

    logger.error('Potential DDoS attack detected', { ip, requestCount: timestamps.length });
    blockIP(ip, 3600000); // Block for 1 hour
    throw new AppError('Too many requests', 429, 'DDOS_DETECTED');
  }

  next();
};

// Clean up old request count records
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestCounts.entries()) {
    const recent = timestamps.filter((ts) => now - ts < 10000);
    if (recent.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, recent);
    }
  }
}, 60000); // Clean up every minute

// Export utility functions for manual IP management
export const ipManagement = {
  blockIP,
  unblockIP: (ip: string) => {
    blockedIPs.delete(ip);
    logger.info('IP manually unblocked', { ip });
  },
  isBlocked: (ip: string) => blockedIPs.has(ip),
  getBlockedIPs: () => Array.from(blockedIPs),
  getSuspiciousIPs: () => Array.from(suspiciousIPs.entries()),
  clearBlockedIPs: () => {
    blockedIPs.clear();
    logger.info('All blocked IPs cleared');
  },
};
