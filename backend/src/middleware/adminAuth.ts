import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import adminAuthService from '../services/adminAuthService';

// Extend Express Request interface to include admin user
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        role: 'owner' | 'administrator' | 'moderator';
        mfa_enabled: boolean;
      };
    }
  }
}

/**
 * Admin authentication middleware
 * Verifies JWT token and admin session
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'ADMIN_AUTH_REQUIRED',
          message: 'Admin authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify session
    const sessionResult = await adminAuthService.verifySession(token);
    
    if (!sessionResult.valid || !sessionResult.admin) {
      res.status(401).json({
        error: {
          code: 'ADMIN_SESSION_INVALID',
          message: 'Invalid or expired admin session',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Attach admin user to request
    req.admin = sessionResult.admin;

    // Log admin access for audit trail
    logger.info('Admin access authenticated', {
      adminId: req.admin.id,
      email: req.admin.email,
      role: req.admin.role,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    logger.error('Admin authentication error', { error, path: req.path });
    res.status(500).json({
      error: {
        code: 'ADMIN_AUTH_ERROR',
        message: 'Authentication verification failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if admin has required role permissions
 */
export const requireRole = (allowedRoles: Array<'owner' | 'administrator' | 'moderator'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        error: {
          code: 'ADMIN_AUTH_REQUIRED',
          message: 'Admin authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.admin.role)) {
      // Log unauthorized access attempt
      logger.warn('Admin role authorization failed', {
        adminId: req.admin.id,
        email: req.admin.email,
        currentRole: req.admin.role,
        requiredRoles: allowedRoles,
        endpoint: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(403).json({
        error: {
          code: 'ADMIN_INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware factory
 * Creates middleware that checks specific permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        error: {
          code: 'ADMIN_AUTH_REQUIRED',
          message: 'Admin authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const hasPermission = checkPermission(req.admin.role, permission);

    if (!hasPermission) {
      // Log unauthorized access attempt
      logger.warn('Admin permission authorization failed', {
        adminId: req.admin.id,
        email: req.admin.email,
        role: req.admin.role,
        requiredPermission: permission,
        endpoint: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(403).json({
        error: {
          code: 'ADMIN_INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Check if a role has a specific permission
 */
export const checkPermission = (
  role: 'owner' | 'administrator' | 'moderator',
  permission: string
): boolean => {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
};

/**
 * Get all permissions for a specific role
 */
export const getRolePermissions = (role: 'owner' | 'administrator' | 'moderator'): string[] => {
  const permissions: Record<string, string[]> = {
    owner: [
      // System Management
      'system:read',
      'system:write',
      'system:config',
      'system:maintenance',
      
      // User Management
      'users:read',
      'users:write',
      'users:delete',
      'users:suspend',
      'users:reset_password',
      
      // Admin Management
      'admins:read',
      'admins:write',
      'admins:delete',
      'admins:roles',
      
      // Content Moderation
      'moderation:read',
      'moderation:write',
      'moderation:resolve',
      
      // Audit and Compliance
      'audit:read',
      'audit:export',
      'compliance:read',
      'compliance:export',
      'compliance:gdpr',
      
      // Security
      'security:read',
      'security:write',
      'security:incidents',
      'security:monitoring',
      
      // Analytics and Metrics
      'metrics:read',
      'analytics:read',
      'performance:read',
      
      // Feature Flags
      'features:read',
      'features:write',
      
      // Emergency Response
      'emergency:lockdown',
      'emergency:recovery',
      'emergency:backup'
    ],
    
    administrator: [
      // System Monitoring (read-only)
      'system:read',
      'metrics:read',
      'analytics:read',
      'performance:read',
      
      // User Management
      'users:read',
      'users:write',
      'users:suspend',
      'users:reset_password',
      
      // Content Moderation
      'moderation:read',
      'moderation:write',
      'moderation:resolve',
      
      // Audit (read-only)
      'audit:read',
      
      // Security Monitoring
      'security:read',
      'security:monitoring',
      
      // Limited Feature Management
      'features:read'
    ],
    
    moderator: [
      // Basic System Info
      'system:read',
      'metrics:read',
      
      // Limited User Management
      'users:read',
      'users:suspend',
      
      // Content Moderation (primary role)
      'moderation:read',
      'moderation:write',
      'moderation:resolve',
      
      // Basic Security Monitoring
      'security:read'
    ]
  };

  return permissions[role] || [];
};

/**
 * Session timeout enforcement middleware
 * Checks if admin session is within timeout limits
 */
export const enforceSessionTimeout = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.admin) {
    next();
    return;
  }

  // Session timeout is handled by JWT expiration and database session tracking
  // This middleware can be extended for additional session management logic
  next();
};

/**
 * Audit logging middleware for admin actions
 * Logs all admin actions for compliance and security
 */
export const auditAdminAction = (actionType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.admin) {
      next();
      return;
    }

    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Log admin action after successful response
      if (res.statusCode < 400) {
        // Import here to avoid circular dependency
        import('../db/connection').then(({ query }) => {
          query(
            `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details, ip_address, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
              req.admin!.id,
              actionType,
              req.params.entity || 'unknown',
              req.params.id || null,
              JSON.stringify({
                method: req.method,
                path: req.path,
                query: req.query,
                body: req.body,
                response_status: res.statusCode
              }),
              req.ip
            ]
          ).catch(error => {
            logger.error('Failed to create audit log entry', { error, actionType });
          });
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Rate limiting for admin endpoints
 * Prevents abuse of admin API endpoints
 */
export const adminRateLimit = (maxRequests: number = 100, windowMinutes: number = 1) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      next();
      return;
    }

    const key = `${req.admin.id}:${req.ip}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const requestData = requests.get(key);

    if (!requestData || now > requestData.resetTime) {
      // Reset or initialize request count
      requests.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (requestData.count >= maxRequests) {
      logger.warn('Admin rate limit exceeded', {
        adminId: req.admin.id,
        ip: req.ip,
        endpoint: req.path,
        count: requestData.count,
        limit: maxRequests
      });

      res.status(429).json({
        error: {
          code: 'ADMIN_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
        }
      });
      return;
    }

    // Increment request count
    requestData.count++;
    requests.set(key, requestData);
    next();
  };
};

// Convenience middleware combinations
export const adminAuth = [authenticateAdmin, enforceSessionTimeout];
export const ownerOnly = [authenticateAdmin, requireRole(['owner'])];
export const adminOrOwner = [authenticateAdmin, requireRole(['owner', 'administrator'])];
export const allAdmins = [authenticateAdmin, requireRole(['owner', 'administrator', 'moderator'])];