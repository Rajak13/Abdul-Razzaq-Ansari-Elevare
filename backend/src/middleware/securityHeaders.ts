import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Comprehensive security headers middleware for API & Admin dashboard
 * Implements OWASP security best practices while allowing cross-origin CORS requests
 */

// Content Security Policy configuration (Cross-origin compatible)
export const contentSecurityPolicy = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'", '*'],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", '*'],
    styleSrc: ["'self'", "'unsafe-inline'", '*'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:', '*'],
    connectSrc: ["'self'", 'https:', 'wss:', 'http:', 'ws:', '*'],
    fontSrc: ["'self'", 'data:', 'https:', '*'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'https:', 'blob:', '*'],
    frameSrc: ["'self'", 'https:', '*'],
    baseUri: ["'self'"],
    formAction: ["'self'", 'https:', '*'],
    upgradeInsecureRequests: [],
  },
});

// Strict Transport Security - Force HTTPS
export const strictTransportSecurity = helmet.hsts({
  maxAge: 31536000, // 1 year in seconds
  includeSubDomains: true,
  preload: true,
});

// Prevent MIME type sniffing
export const xContentTypeOptions = helmet.noSniff();

// XSS Protection
export const xssFilter = helmet.xssFilter();

// Referrer Policy
export const referrerPolicy = helmet.referrerPolicy({
  policy: 'strict-origin-when-cross-origin',
});

// Permissions Policy
export const permissionsPolicy = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(self), camera=(self), payment=()'
  );
  next();
};

// Remove X-Powered-By header
export const hidePoweredBy = helmet.hidePoweredBy();

// DNS Prefetch Control
export const dnsPrefetchControl = helmet.dnsPrefetchControl({
  allow: false,
});

// Cross-Origin-Resource-Policy - Allow cross-origin for API access
export const crossOriginResourcePolicy = helmet.crossOriginResourcePolicy({
  policy: 'cross-origin',
});

// Combined security headers middleware (CORS friendly)
export const securityHeaders = [
  contentSecurityPolicy,
  strictTransportSecurity,
  xContentTypeOptions,
  xssFilter,
  referrerPolicy,
  permissionsPolicy,
  hidePoweredBy,
  dnsPrefetchControl,
  crossOriginResourcePolicy,
];

// Admin-specific security headers
export const adminSecurityHeaders = [
  contentSecurityPolicy,
  strictTransportSecurity,
  xContentTypeOptions,
  xssFilter,
  referrerPolicy,
  permissionsPolicy,
  hidePoweredBy,
  dnsPrefetchControl,
  crossOriginResourcePolicy,
];
