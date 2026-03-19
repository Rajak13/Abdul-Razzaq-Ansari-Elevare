import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import adminAuthService from '../services/adminAuthService';


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
 * Logs all admin actions for compliance and security with cryptographic integrity
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
        // Import audit service to use proper hash generation
        import('../services/adminAuditService').then(({ default: adminAuditService }) => {
          const ipAddress = req.ip || '0.0.0.0';
          const userAgent = req.get('User-Agent') || '';
          
          // Determine target entity and ID from request
          let targetEntity = 'unknown';
          let targetId = null;
          
          // Extract from path - check the actual path for entity type
          const path = req.path;
          
          console.log('🔍 Audit Middleware - Parsing request:', {
            path,
            method: req.method,
            params: req.params,
            actionType
          });
          
          // Extract from params first
          if (req.params.userId) {
            targetEntity = 'user';
            targetId = req.params.userId;
            console.log('✅ Found userId in params:', targetId);
          } else if (req.params.reportId) {
            targetEntity = 'abuse_report';
            targetId = req.params.reportId;
            console.log('✅ Found reportId in params:', targetId);
          } else if (req.params.name) {
            targetEntity = 'feature_flag';
            targetId = req.params.name;
            console.log('✅ Found name in params:', targetId);
          } else if (req.params.key) {
            targetEntity = 'system_config';
            targetId = req.params.key;
            console.log('✅ Found key in params:', targetId);
          } else if (req.params.ipAddress) {
            targetEntity = 'ip_address';
            targetId = req.params.ipAddress;
            console.log('✅ Found ipAddress in params:', targetId);
          } else if (req.params.appealId) {
            targetEntity = 'appeal';
            targetId = req.params.appealId;
            console.log('✅ Found appealId in params:', targetId);
          } else {
            console.log('⚠️ No params found, will parse from path');
          }
          
          // If params didn't work, parse from path
          if (targetEntity === 'unknown') {
            console.log('🔎 Parsing path for entity and ID...');
            
            // Match /users/:id patterns
            if (path.includes('/users/') && path.includes('/suspend')) {
              const userIdMatch = path.match(/\/users\/([a-f0-9-]+)\//);
              if (userIdMatch) {
                targetEntity = 'user';
                targetId = userIdMatch[1];
                console.log('✅ Parsed user suspend:', targetId);
              }
            } else if (path.includes('/users/') && path.includes('/unsuspend')) {
              const userIdMatch = path.match(/\/users\/([a-f0-9-]+)\//);
              if (userIdMatch) {
                targetEntity = 'user';
                targetId = userIdMatch[1];
                console.log('✅ Parsed user unsuspend:', targetId);
              }
            } else if (path.includes('/users/') && path.includes('/reset-password')) {
              const userIdMatch = path.match(/\/users\/([a-f0-9-]+)\//);
              if (userIdMatch) {
                targetEntity = 'user';
                targetId = userIdMatch[1];
                console.log('✅ Parsed user password reset:', targetId);
              }
            } else if (path.includes('/users/') && req.method === 'DELETE') {
              const userIdMatch = path.match(/\/users\/([a-f0-9-]+)/);
              if (userIdMatch) {
                targetEntity = 'user';
                targetId = userIdMatch[1];
                console.log('✅ Parsed user delete:', targetId);
              }
            } else if (path.includes('/moderation/reports/')) {
              // Match /moderation/reports/:reportId
              const reportIdMatch = path.match(/\/moderation\/reports\/([a-f0-9-]+)/);
              if (reportIdMatch) {
                targetEntity = 'abuse_report';
                targetId = reportIdMatch[1];
                console.log('✅ Parsed moderation report:', targetId);
              } else {
                console.log('❌ Failed to parse moderation report from path:', path);
              }
            } else if (path.includes('/appeals/')) {
              // Match /appeals/:appealId
              const appealIdMatch = path.match(/\/appeals\/([a-f0-9-]+)/);
              if (appealIdMatch) {
                targetEntity = 'appeal';
                targetId = appealIdMatch[1];
                console.log('✅ Parsed appeal:', targetId);
              }
            } else if (path.includes('/config/features/')) {
              // Match /config/features/:name
              const nameMatch = path.match(/\/config\/features\/([^/]+)/);
              if (nameMatch) {
                targetEntity = 'feature_flag';
                targetId = nameMatch[1];
                console.log('✅ Parsed feature flag:', targetId);
              }
            } else if (path.includes('/config/system/')) {
              // Match /config/system/:key
              const keyMatch = path.match(/\/config\/system\/([^/]+)/);
              if (keyMatch) {
                targetEntity = 'system_config';
                targetId = keyMatch[1];
                console.log('✅ Parsed system config:', targetId);
              }
            } else if (path.includes('/security/block-ip/')) {
              // Match /security/block-ip/:ipAddress
              const ipMatch = path.match(/\/security\/block-ip\/([^/]+)/);
              if (ipMatch) {
                targetEntity = 'ip_address';
                targetId = ipMatch[1];
                console.log('✅ Parsed IP address:', targetId);
              }
            } else {
              console.log('❌ No pattern matched for path:', path);
            }
          }
          
          console.log('📝 Final audit log data:', {
            targetEntity,
            targetId,
            actionType,
            adminId: req.admin!.id,
            adminEmail: req.admin!.email
          });
          
          // Sanitize sensitive data from body
          const sanitizedBody = { ...req.body };
          if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
          if (sanitizedBody.mfaToken) sanitizedBody.mfaToken = '[REDACTED]';
          if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = '[REDACTED]';
          
          const details = {
            method: req.method,
            path: req.path,
            query: req.query,
            body: sanitizedBody,
            response_status: res.statusCode,
            admin_email: req.admin!.email,
            admin_role: req.admin!.role
          };
          
          adminAuditService.createAuditLog(
            req.admin!.id,
            actionType,
            ipAddress,
            userAgent,
            targetEntity,
            targetId || undefined,
            details
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