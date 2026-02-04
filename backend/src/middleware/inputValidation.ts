import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from './errorHandler';

/**
 * Input validation and sanitization middleware
 * Prevents injection attacks and ensures data integrity
 */

// Middleware to handle validation results
export const handleValidationErrors = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: 'field' in error ? error.field : 'unknown',
      message: error.msg,
      value: 'value' in error ? error.value : undefined,
    }));

    throw new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      { errors: formattedErrors }
    );
  }
  
  next();
};

// Sanitize string input to prevent XSS
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
};

// Sanitize HTML input (more permissive for rich text)
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, 100000); // Limit length for rich text
};

// Sanitize SQL input to prevent SQL injection
export const sanitizeSqlInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .trim()
    .substring(0, 1000);
};

// Sanitize email input
export const sanitizeEmail = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .toLowerCase()
    .trim()
    .substring(0, 255);
};

// Sanitize numeric input
export const sanitizeNumber = (input: any): number | null => {
  const num = Number(input);
  return isNaN(num) ? null : num;
};

// Sanitize boolean input
export const sanitizeBoolean = (input: any): boolean => {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  return Boolean(input);
};

// Sanitize UUID input
export const sanitizeUuid = (input: string): string | null => {
  if (typeof input !== 'string') return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input) ? input.toLowerCase() : null;
};

// Sanitize array input
export const sanitizeArray = (input: any): any[] => {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 1000); // Limit array size
};

// Sanitize object input
export const sanitizeObject = (input: any): object => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {};
  }
  
  // Limit object keys
  const keys = Object.keys(input).slice(0, 100);
  const sanitized: any = {};
  
  for (const key of keys) {
    const sanitizedKey = sanitizeString(key);
    if (sanitizedKey) {
      sanitized[sanitizedKey] = input[key];
    }
  }
  
  return sanitized;
};

// Middleware to sanitize request body
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Middleware to sanitize query parameters
export const sanitizeQuery = (req: Request, _res: Response, next: NextFunction) => {
  if (req.query && typeof req.query === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(req.query)) {
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey) {
        if (typeof value === 'string') {
          sanitized[sanitizedKey] = sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[sanitizedKey] = value.map((v) =>
            typeof v === 'string' ? sanitizeString(v) : v
          );
        } else {
          sanitized[sanitizedKey] = value;
        }
      }
    }
    
    req.query = sanitized;
  }
  next();
};

// Middleware to sanitize URL parameters
export const sanitizeParams = (req: Request, _res: Response, next: NextFunction) => {
  if (req.params && typeof req.params === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(req.params)) {
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey && typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeString(value);
      }
    }
    
    req.params = sanitized;
  }
  next();
};

// Combined sanitization middleware
export const sanitizeInput = [sanitizeBody, sanitizeQuery, sanitizeParams];

// Validate and sanitize common fields
export const validateCommonFields = {
  email: (value: string) => {
    const sanitized = sanitizeEmail(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : null;
  },
  
  uuid: (value: string) => sanitizeUuid(value),
  
  string: (value: string, maxLength: number = 1000) => {
    const sanitized = sanitizeString(value);
    return sanitized.substring(0, maxLength);
  },
  
  number: (value: any, min?: number, max?: number) => {
    const num = sanitizeNumber(value);
    if (num === null) return null;
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    return num;
  },
  
  boolean: (value: any) => sanitizeBoolean(value),
  
  array: (value: any, maxLength: number = 100) => {
    const arr = sanitizeArray(value);
    return arr.slice(0, maxLength);
  },
};

// SQL injection prevention helper
export const preventSqlInjection = (query: string): boolean => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(;\s*DROP)/gi,
    /(--)/g,
    /(\/\*|\*\/)/g,
    /('|")\s*(OR|AND)\s*('|")/gi,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
  ];
  
  return !sqlInjectionPatterns.some((pattern) => pattern.test(query));
};

// Middleware to check for SQL injection attempts
export const checkSqlInjection = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return preventSqlInjection(value);
    }
    if (Array.isArray(value)) {
      return value.every(checkValue);
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every(checkValue);
    }
    return true;
  };

  const isSafe =
    checkValue(req.body) &&
    checkValue(req.query) &&
    checkValue(req.params);

  if (!isSafe) {
    throw new AppError(
      'Potential SQL injection detected',
      400,
      'SQL_INJECTION_DETECTED'
    );
  }

  next();
};
