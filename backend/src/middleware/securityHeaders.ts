import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Comprehensive security headers middleware for admin dashboard
 * Implements OWASP security best practices
 */

// Content Security Policy configuration
export const contentSecurityPolicy = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Note: Consider removing unsafe-inline in production
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  },
});

// Strict Transport Security - Force HTTPS
export const strictTransportSecurity = helmet.hsts({
  maxAge: 31536000, // 1 year in seconds
  includeSubDomains: true,
  preload: true,
});

// Prevent clickjacking attacks
export const xFrameOptions = helmet.frameguard({
  action: 'deny',
});

// Prevent MIME type sniffing
export const xContentTypeOptions = helmet.noSniff();

// XSS Protection (legacy but still useful)
export const xssFilter = helmet.xssFilter();

// Referrer Policy
export const referrerPolicy = helmet.referrerPolicy({
  policy: 'strict-origin-when-cross-origin',
});

// Permissions Policy (formerly Feature Policy)
export const permissionsPolicy = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  next();
};

// Remove X-Powered-By header
export const hidePoweredBy = helmet.hidePoweredBy();

// DNS Prefetch Control
export const dnsPrefetchControl = helmet.dnsPrefetchControl({
  allow: false,
});

// Cross-Origin-Embedder-Policy
export const crossOriginEmbedderPolicy = helmet.crossOriginEmbedderPolicy({
  policy: 'require-corp',
});

// Cross-Origin-Opener-Policy
export const crossOriginOpenerPolicy = helmet.crossOriginOpenerPolicy({
  policy: 'same-origin',
});

// Cross-Origin-Resource-Policy - Allow cross-origin for API access
export const crossOriginResourcePolicy = helmet.crossOriginResourcePolicy({
  policy: 'cross-origin',
});

// Combined security headers middleware
export const securityHeaders = [
  contentSecurityPolicy,
  strictTransportSecurity,
  xFrameOptions,
  xContentTypeOptions,
  xssFilter,
  referrerPolicy,
  permissionsPolicy,
  hidePoweredBy,
  dnsPrefetchControl,
  crossOriginEmbedderPolicy,
  crossOriginOpenerPolicy,
  crossOriginResourcePolicy,
];

// Admin-specific security headers with stricter policies
export const adminSecurityHeaders = [
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }),
  strictTransportSecurity,
  xFrameOptions,
  xContentTypeOptions,
  xssFilter,
  helmet.referrerPolicy({ policy: 'no-referrer' }),
  permissionsPolicy,
  hidePoweredBy,
  dnsPrefetchControl,
  helmet.crossOriginEmbedderPolicy({ policy: 'require-corp' }),
  helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }),
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
];
