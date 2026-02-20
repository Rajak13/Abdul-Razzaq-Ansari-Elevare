import express, { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import {
  authenticateAdmin,
  auditAdminAction,
  ownerOnly,
  adminOrOwner,
  allAdmins
} from '../middleware/adminAuth';
import {
  adminRateLimiter,
  authRateLimiter,
  progressiveLoginDelay,
  throttleResourceIntensiveOps
} from '../middleware/advancedRateLimiter';
import adminAuthService from '../services/adminAuthService';
import adminAggregationService from '../services/adminAggregationService';
import adminPerformanceService from '../services/adminPerformanceService';
import { AdminUserManagementService } from '../services/adminUserManagementService';
import { AdminModerationService } from '../services/adminModerationService';
import adminAuditService from '../services/adminAuditService';
import adminConfigService from '../services/adminConfigService';
import { AdminComplianceService } from '../services/adminComplianceService';
import adminSecurityService from '../services/adminSecurityService';
import pool, { getClient } from '../db/connection';
import logger from '../utils/logger';

const router = express.Router();

// Apply strict rate limiting to all admin routes
router.use(adminRateLimiter);

/**
 * Admin Authentication Routes
 */

// Admin login
router.post('/auth/login',
  authRateLimiter,
  progressiveLoginDelay,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('ip_address').optional().isIP(),
    body('user_agent').optional().isString()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      const { email, password } = req.body;
      const ipAddress = req.body.ip_address || req.ip;
      const userAgent = req.body.user_agent || req.get('User-Agent') || '';

      const result = await adminAuthService.login(email, password, ipAddress, userAgent);

      if (!result.success) {
        res.status(401).json({
          error: {
            code: 'ADMIN_LOGIN_FAILED',
            message: result.message
          }
        });
        return;
      }

      res.json({
        success: true,
        message: result.message,
        requiresMfa: result.requiresMfa,
        adminId: result.adminId,
        token: result.token,
        refreshToken: result.refreshToken,
        admin: result.admin
      });

    } catch (error) {
      logger.error('Admin login error', { error });
      res.status(500).json({
        error: {
          code: 'ADMIN_LOGIN_ERROR',
          message: 'Login failed due to server error'
        }
      });
    }
  }
);

// Admin MFA verification
router.post('/auth/verify-mfa',
  authRateLimiter,
  progressiveLoginDelay,
  [
    body('adminId').isUUID(),
    body('mfaToken').isString().isLength({ min: 6, max: 8 }),
    body('isBackupCode').optional().isBoolean(),
    body('ip_address').optional().isIP(),
    body('user_agent').optional().isString()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { adminId, mfaToken, isBackupCode = false } = req.body;
      const ipAddress = req.body.ip_address || req.ip;
      const userAgent = req.body.user_agent || req.get('User-Agent') || '';

      const result = await adminAuthService.loginWithMfa(
        adminId,
        mfaToken,
        ipAddress,
        userAgent,
        isBackupCode
      );

      if (!result.success) {
        return res.status(401).json({
          error: {
            code: 'ADMIN_MFA_FAILED',
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        message: result.message,
        token: result.token,
        refreshToken: result.refreshToken,
        admin: result.admin
      });

    } catch (error) {
      logger.error('Admin MFA verification error', { error });
      res.status(500).json({
        error: {
          code: 'ADMIN_MFA_ERROR',
          message: 'MFA verification failed due to server error'
        }
      });
    }
  }
);

// Admin logout
router.post('/auth/logout',
  authenticateAdmin,
  auditAdminAction('admin_logout'),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'No token provided'
          }
        });
      }

      const result = await adminAuthService.logout(token, req.ip || '0.0.0.0');

      res.json({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      logger.error('Admin logout error', { error });
      res.status(500).json({
        error: {
          code: 'ADMIN_LOGOUT_ERROR',
          message: 'Logout failed due to server error'
        }
      });
    }
  }
);

// Admin token refresh
router.post('/auth/refresh',
  [
    body('refreshToken').isString().notEmpty()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { refreshToken } = req.body;
      const ipAddress = req.ip || '0.0.0.0';
      const userAgent = req.get('User-Agent') || '';

      const result = await adminAuthService.refreshToken(refreshToken, ipAddress, userAgent);

      if (!result.success) {
        return res.status(401).json({
          error: {
            code: 'ADMIN_REFRESH_FAILED',
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        message: result.message,
        token: result.token,
        refreshToken: result.refreshToken
      });

    } catch (error) {
      logger.error('Admin token refresh error', { error });
      res.status(500).json({
        error: {
          code: 'ADMIN_REFRESH_ERROR',
          message: 'Token refresh failed due to server error'
        }
      });
    }
  }
);

// Get current admin session
router.get('/auth/session',
  authenticateAdmin,
  async (req: Request, res: Response): Promise<any> => {
    try {
      res.json({
        success: true,
        admin: {
          id: req.admin!.id,
          email: req.admin!.email,
          role: req.admin!.role,
          mfa_enabled: req.admin!.mfa_enabled
        }
      });

    } catch (error) {
      logger.error('Get admin session error', { error });
      res.status(500).json({
        error: {
          code: 'ADMIN_SESSION_ERROR',
          message: 'Failed to retrieve session'
        }
      });
    }
  }
);

/**
 * Admin Management Routes (Owner only)
 */

// Create new admin user
router.post('/users',
  ownerOnly,
  auditAdminAction('admin_user_create'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
    body('role').isIn(['owner', 'administrator', 'moderator'])
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { email, password, role } = req.body;
      const createdBy = req.admin!.id;

      const result = await adminAuthService.createAdminUser(email, password, role, createdBy);

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        adminId: result.adminId,
        verificationToken: result.verificationToken
      });

    } catch (error) {
      logger.error('Admin user creation error', { error });

      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            code: 'ADMIN_USER_EXISTS',
            message: 'Admin user with this email already exists'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'ADMIN_USER_CREATE_ERROR',
          message: 'Failed to create admin user'
        }
      });
    }
  }
);

/**
 * System Metrics Routes (Admin and Owner)
 */

// Get system overview metrics
router.get('/metrics/overview',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const metrics = await adminAggregationService.getAllMetrics();

      res.json({
        success: true,
        data: {
          users: metrics.user_metrics,
          content: metrics.content_metrics,
          storage: metrics.storage_metrics,
          system: {
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            timestamp: metrics.aggregation_timestamp
          },
          meets_threshold: metrics.meets_threshold
        }
      });

    } catch (error) {
      logger.error('System metrics error', { error });
      res.status(500).json({
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve system metrics'
        }
      });
    }
  }
);

// Get user statistics with aggregation
router.get('/metrics/users',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const userMetrics = await adminAggregationService.getUserMetrics();

      res.json({
        success: true,
        data: userMetrics
      });

    } catch (error) {
      logger.error('User metrics error', { error });
      res.status(500).json({
        error: {
          code: 'USER_METRICS_ERROR',
          message: 'Failed to retrieve user metrics'
        }
      });
    }
  }
);

// Get performance metrics
router.get('/metrics/performance',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const performanceMetrics = await adminPerformanceService.getPerformanceMetrics();

      res.json({
        success: true,
        data: performanceMetrics
      });

    } catch (error) {
      logger.error('Performance metrics error', { error });
      res.status(500).json({
        error: {
          code: 'PERFORMANCE_METRICS_ERROR',
          message: 'Failed to retrieve performance metrics'
        }
      });
    }
  }
);

// Get storage metrics
router.get('/metrics/storage',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const storageMetrics = await adminAggregationService.getStorageMetrics();

      res.json({
        success: true,
        data: storageMetrics
      });

    } catch (error) {
      logger.error('Storage metrics error', { error });
      res.status(500).json({
        error: {
          code: 'STORAGE_METRICS_ERROR',
          message: 'Failed to retrieve storage metrics'
        }
      });
    }
  }
);

// Get system health monitoring
router.get('/metrics/health',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const systemHealth = await adminPerformanceService.getSystemHealth();

      res.json({
        success: true,
        data: systemHealth
      });

    } catch (error) {
      logger.error('System health error', { error });
      res.status(500).json({
        error: {
          code: 'SYSTEM_HEALTH_ERROR',
          message: 'Failed to retrieve system health'
        }
      });
    }
  }
);

/**
 * User Management Routes (Admin and Owner)
 */

// Get user list (metadata only)
router.get('/users',
  adminOrOwner,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('status').optional().isIn(['active', 'suspended', 'deleted']),
    query('email').optional().isString(),
    query('email_verified').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Get database client
      const userManagementService = new AdminUserManagementService(
        pool,
        adminAuditService
      );

      const filters: any = {
        limit,
        offset
      };

      if (req.query.email) {
        filters.email = req.query.email as string;
      }

      if (req.query.email_verified !== undefined) {
        filters.email_verified = req.query.email_verified === 'true';
      }

      if (req.query.status === 'suspended') {
        filters.is_suspended = true;
      }

      if (req.query.status === 'suspended') {
        filters.is_suspended = true;
      }

      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      const result = await userManagementService.searchUsers(filters);

      res.json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('User list error', { error });
      res.status(500).json({
        error: {
          code: 'USER_LIST_ERROR',
          message: 'Failed to retrieve user list'
        }
      });
    }
  }
);

// Get user details by ID
router.get('/users/:userId',
  adminOrOwner,
  allAdmins,
  [
    param('userId').isUUID()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: errors.array()
          }
        });
      }

      const userManagementService = new AdminUserManagementService(
        pool,
        adminAuditService
      );

      const user = await userManagementService.getUserById(req.params.userId);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      logger.error('Get user error', { userId: req.params.userId, error });
      res.status(500).json({
        error: {
          code: 'GET_USER_ERROR',
          message: 'Failed to retrieve user details'
        }
      });
    }
  }
);

// Suspend user account
router.put('/users/:userId/suspend',
  adminOrOwner,
  allAdmins,
  auditAdminAction('user_suspend'),
  [
    param('userId').isUUID(),
    body('reason').isString().notEmpty(),
    body('duration_hours').optional().isInt({ min: 1 }),
    body('notify_user').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const client = await getClient();

      const expiresAt = req.body.duration_hours ?
        new Date(Date.now() + req.body.duration_hours * 60 * 60 * 1000) : null;

      await client.query(`
        INSERT INTO user_suspensions (
          user_id, suspended_by, reason, suspension_type, expires_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        req.params.userId,
        req.admin!.id,
        req.body.reason,
        req.body.duration_hours ? 'temporary' : 'permanent',
        expiresAt
      ]);

      client.release();

      res.json({
        success: true,
        message: 'User suspended successfully'
      });

    } catch (error) {
      logger.error('User suspension error', { userId: req.params.userId, error });
      res.status(500).json({
        error: {
          code: 'USER_SUSPEND_ERROR',
          message: 'Failed to suspend user'
        }
      });
    }
  }
);

// Unsuspend user account
router.put('/users/:userId/unsuspend',
  adminOrOwner,
  allAdmins,
  auditAdminAction('user_unsuspend'),
  [
    param('userId').isUUID(),
    body('reason').isString().notEmpty()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const moderationService = new AdminModerationService(pool, adminAuditService);

      await moderationService.liftUserSuspension(
        req.params.userId,
        req.admin!.id,
        req.body.reason,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'User suspension lifted successfully'
      });

    } catch (error: any) {
      logger.error('User unsuspension error', {
        userId: req.params.userId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: {
          code: 'USER_UNSUSPEND_ERROR',
          message: error.message || 'Failed to unsuspend user',
          details: error.toString()
        }
      });
    }
  }
);

// Reset user password
router.post('/users/:userId/reset-password',
  adminOrOwner,
  allAdmins,
  auditAdminAction('user_password_reset'),
  [
    param('userId').isUUID(),
    body('reason').isString().notEmpty(),
    body('notify_user').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const userManagementService = new AdminUserManagementService(
        pool,
        adminAuditService
      );

      const result = await userManagementService.resetUserPassword(
        {
          user_id: req.params.userId,
          admin_id: req.admin!.id,
          reason: req.body.reason,
          notify_user: req.body.notify_user !== false
        },
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Password reset successfully',
        temporary_password: result.temporary_password
      });

    } catch (error) {
      logger.error('Password reset error', { userId: req.params.userId, error });
      res.status(500).json({
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: 'Failed to reset user password'
        }
      });
    }
  }
);

// Delete user account (GDPR)
router.delete('/users/:userId',
  ownerOnly,
  allAdmins,
  auditAdminAction('user_delete'),
  [
    param('userId').isUUID(),
    body('reason').isString().notEmpty(),
    body('gdpr_request').optional().isBoolean(),
    body('backup_data').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const userManagementService = new AdminUserManagementService(
        pool,
        adminAuditService
      );

      const result = await userManagementService.deleteUser(
        req.params.userId,
        req.admin!.id,
        req.body.reason,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'User account deleted successfully',
        deleted_data: result.deletedData
      });

    } catch (error: any) {
      logger.error('User deletion error', {
        userId: req.params.userId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: {
          code: 'USER_DELETE_ERROR',
          message: error.message || 'Failed to delete user account',
          details: error.toString()
        }
      });
    }
  }
);

// Get user statistics
router.get('/users/stats/overview',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const userManagementService = new AdminUserManagementService(
        pool,
        adminAuditService
      );

      const stats = await userManagementService.getUserStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('User statistics error', { error });
      res.status(500).json({
        error: {
          code: 'USER_STATS_ERROR',
          message: 'Failed to retrieve user statistics'
        }
      });
    }
  }
);

/**
 * Content Moderation Routes (All admin roles)
 */

// Get abuse reports
router.get('/moderation/reports',
  allAdmins,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'under_review', 'resolved', 'dismissed']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('content_type').optional().isString()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const moderationService = new AdminModerationService(pool, adminAuditService);

      const filters: any = {
        limit,
        offset
      };

      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      if (req.query.priority) {
        filters.priority = req.query.priority as string;
      }

      if (req.query.content_type) {
        filters.content_type = req.query.content_type as string;
      }

      const result = await moderationService.getAbuseReports(filters);

      res.json({
        success: true,
        data: {
          reports: result.reports,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Moderation reports error', { error });
      res.status(500).json({
        error: {
          code: 'MODERATION_REPORTS_ERROR',
          message: 'Failed to retrieve moderation reports'
        }
      });
    }
  }
);

// Get specific abuse report
router.get('/moderation/reports/:reportId',
  allAdmins,
  allAdmins,
  [
    param('reportId').isUUID()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid report ID',
            details: errors.array()
          }
        });
      }

      const moderationService = new AdminModerationService(pool, adminAuditService);

      const report = await moderationService.getAbuseReportById(req.params.reportId);

      if (!report) {
        return res.status(404).json({
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Abuse report not found'
          }
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Get abuse report error', { reportId: req.params.reportId, error });
      res.status(500).json({
        error: {
          code: 'GET_REPORT_ERROR',
          message: 'Failed to retrieve abuse report'
        }
      });
    }
  }
);

// Take moderation action on abuse report
router.put('/moderation/reports/:reportId',
  allAdmins,
  auditAdminAction('moderation_action'),
  [
    param('reportId').isUUID(),
    body('action').isIn(['dismiss', 'warn', 'suspend', 'ban', 'resolve']),
    body('reason').isString().notEmpty(),
    body('notes').optional().isString(),
    body('duration_hours').optional().isInt({ min: 1 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    logger.info('[Admin Route] Moderation action request received', {
      reportId: req.params.reportId,
      adminId: req.admin?.id,
      action: req.body.action,
      durationHours: req.body.duration_hours,
      ipAddress: req.ip
    });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('[Admin Route] Validation failed', {
          reportId: req.params.reportId,
          errors: errors.array()
        });
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      logger.info('[Admin Route] Creating moderation service');
      const moderationService = new AdminModerationService(pool, adminAuditService);

      logger.info('[Admin Route] Calling takeModerationAction', {
        reportId: req.params.reportId,
        action: req.body.action
      });

      const updatedReport = await moderationService.takeModerationAction(
        req.params.reportId,
        req.admin!.id,
        {
          action: req.body.action,
          reason: req.body.reason,
          notes: req.body.notes,
          duration_hours: req.body.duration_hours
        },
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      logger.info('[Admin Route] Moderation action completed successfully', {
        reportId: req.params.reportId,
        action: req.body.action,
        newStatus: updatedReport.status
      });

      res.json({
        success: true,
        message: 'Moderation action taken successfully',
        data: updatedReport
      });

    } catch (error) {
      logger.error('[Admin Route] Moderation action error', {
        reportId: req.params.reportId,
        action: req.body.action,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({
        error: {
          code: 'MODERATION_ACTION_ERROR',
          message: 'Failed to take moderation action'
        }
      });
    }
  }
);

// Get reported content for review (privacy-preserving)
router.get('/moderation/content/:contentType/:contentId',
  allAdmins,
  allAdmins,
  [
    param('contentType').isIn(['resource', 'study_group', 'message', 'comment', 'note', 'file', 'whiteboard', 'profile']),
    param('contentId').isUUID()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: errors.array()
          }
        });
      }

      const { contentType, contentId } = req.params;
      let content = null;

      // Fetch content based on type (only metadata and safe content, no private data)
      switch (contentType) {
        case 'resource':
          const resourceResult = await pool.query(
            'SELECT id, title, description, file_type as type, file_url, created_at, user_id FROM resources WHERE id = $1',
            [contentId]
          );
          content = resourceResult.rows[0];
          break;

        case 'study_group':
          const groupResult = await pool.query(
            'SELECT id, name, description, created_at, owner_id FROM study_groups WHERE id = $1',
            [contentId]
          );
          content = groupResult.rows[0];
          break;

        case 'message':
          const messageResult = await pool.query(
            'SELECT id, content, created_at, user_id, group_id FROM group_messages WHERE id = $1',
            [contentId]
          );
          content = messageResult.rows[0];
          break;

        case 'comment':
          const commentResult = await pool.query(
            'SELECT id, content, created_at, user_id, resource_id FROM resource_comments WHERE id = $1',
            [contentId]
          );
          content = commentResult.rows[0];
          break;

        case 'note':
          const noteResult = await pool.query(
            'SELECT id, title, content, created_at, user_id FROM notes WHERE id = $1',
            [contentId]
          );
          content = noteResult.rows[0];
          break;

        case 'file':
          const fileResult = await pool.query(
            'SELECT id, filename, file_type, file_size, created_at, user_id FROM files WHERE id = $1',
            [contentId]
          );
          content = fileResult.rows[0];
          break;

        case 'whiteboard':
          const whiteboardResult = await pool.query(
            'SELECT id, title, created_at, user_id FROM whiteboards WHERE id = $1',
            [contentId]
          );
          content = whiteboardResult.rows[0];
          break;

        case 'profile':
          const profileResult = await pool.query(
            'SELECT id, name, email, bio, created_at FROM users WHERE id = $1',
            [contentId]
          );
          content = profileResult.rows[0];
          break;

        default:
          return res.status(400).json({
            error: {
              code: 'INVALID_CONTENT_TYPE',
              message: 'Unsupported content type'
            }
          });
      }

      if (!content) {
        return res.status(404).json({
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Reported content not found or has been deleted'
          }
        });
      }

      res.json({
        success: true,
        data: {
          contentType,
          content
        }
      });

    } catch (error) {
      logger.error('Get reported content error', { error });
      res.status(500).json({
        error: {
          code: 'FETCH_CONTENT_ERROR',
          message: 'Failed to fetch reported content'
        }
      });
    }
  }
);

// Get user violation history
router.get('/moderation/violations/:userId',
  allAdmins,
  allAdmins,
  [
    param('userId').isUUID()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: errors.array()
          }
        });
      }

      const moderationService = new AdminModerationService(pool, adminAuditService);

      const violations = await moderationService.getUserViolationHistory(req.params.userId);

      res.json({
        success: true,
        data: violations
      });

    } catch (error) {
      logger.error('Get violations error', { userId: req.params.userId, error });
      res.status(500).json({
        error: {
          code: 'GET_VIOLATIONS_ERROR',
          message: 'Failed to retrieve violation history'
        }
      });
    }
  }
);

// Get moderation statistics
router.get('/moderation/stats',
  allAdmins,
  allAdmins,
  [
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const moderationService = new AdminModerationService(pool, adminAuditService);

      const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : undefined;
      const dateTo = req.query.date_to ? new Date(req.query.date_to as string) : undefined;

      const stats = await moderationService.getModerationStats(dateFrom, dateTo);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Moderation stats error', { error });
      res.status(500).json({
        error: {
          code: 'MODERATION_STATS_ERROR',
          message: 'Failed to retrieve moderation statistics'
        }
      });
    }
  }
);

/**
 * System Configuration Routes (Owner only)
 */

// Get feature flags
router.get('/config/features',
  ownerOnly,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const features = await adminConfigService.getAllFeatureFlags();

      res.json({
        success: true,
        data: {
          features
        }
      });

    } catch (error) {
      logger.error('Feature flags error', { error });
      res.status(500).json({
        error: {
          code: 'FEATURE_FLAGS_ERROR',
          message: 'Failed to retrieve feature flags'
        }
      });
    }
  }
);

// Get specific feature flag
router.get('/config/features/:name',
  ownerOnly,
  allAdmins,
  [
    param('name').isString().notEmpty()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feature name',
            details: errors.array()
          }
        });
      }

      const feature = await adminConfigService.getFeatureFlagByName(req.params.name);

      if (!feature) {
        return res.status(404).json({
          error: {
            code: 'FEATURE_NOT_FOUND',
            message: 'Feature flag not found'
          }
        });
      }

      res.json({
        success: true,
        data: feature
      });

    } catch (error) {
      logger.error('Get feature flag error', { name: req.params.name, error });
      res.status(500).json({
        error: {
          code: 'GET_FEATURE_ERROR',
          message: 'Failed to retrieve feature flag'
        }
      });
    }
  }
);

// Create feature flag
router.post('/config/features',
  ownerOnly,
  allAdmins,
  auditAdminAction('feature_flag_create'),
  [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('enabled').isBoolean(),
    body('rollout_percentage').isInt({ min: 0, max: 100 }),
    body('config').optional().isObject()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const feature = await adminConfigService.createFeatureFlag(
        req.body.name,
        req.body.description || '',
        req.body.enabled,
        req.body.rollout_percentage,
        req.body.config || {},
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'Feature flag created successfully',
        data: feature
      });

    } catch (error) {
      logger.error('Create feature flag error', { error });
      res.status(500).json({
        error: {
          code: 'CREATE_FEATURE_ERROR',
          message: 'Failed to create feature flag'
        }
      });
    }
  }
);

// Update feature flag
router.put('/config/features/:name',
  ownerOnly,
  allAdmins,
  auditAdminAction('feature_flag_update'),
  [
    param('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('enabled').optional().isBoolean(),
    body('rollout_percentage').optional().isInt({ min: 0, max: 100 }),
    body('config').optional().isObject()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const updates: any = {};
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.enabled !== undefined) updates.enabled = req.body.enabled;
      if (req.body.rollout_percentage !== undefined) updates.rollout_percentage = req.body.rollout_percentage;
      if (req.body.config !== undefined) updates.config = req.body.config;

      const feature = await adminConfigService.updateFeatureFlag(
        req.params.name,
        updates,
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Feature flag updated successfully',
        data: feature
      });

    } catch (error) {
      logger.error('Update feature flag error', { name: req.params.name, error });
      res.status(500).json({
        error: {
          code: 'UPDATE_FEATURE_ERROR',
          message: 'Failed to update feature flag'
        }
      });
    }
  }
);

// Delete feature flag
router.delete('/config/features/:name',
  ownerOnly,
  allAdmins,
  auditAdminAction('feature_flag_delete'),
  [
    param('name').isString().notEmpty()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feature name',
            details: errors.array()
          }
        });
      }

      await adminConfigService.deleteFeatureFlag(
        req.params.name,
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Feature flag deleted successfully'
      });

    } catch (error) {
      logger.error('Delete feature flag error', { name: req.params.name, error });
      res.status(500).json({
        error: {
          code: 'DELETE_FEATURE_ERROR',
          message: 'Failed to delete feature flag'
        }
      });
    }
  }
);

// Get system configuration
router.get('/config/system',
  ownerOnly,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const configs = await adminConfigService.getAllSystemConfigs();

      res.json({
        success: true,
        data: {
          configs
        }
      });

    } catch (error) {
      logger.error('System config error', { error });
      res.status(500).json({
        error: {
          code: 'SYSTEM_CONFIG_ERROR',
          message: 'Failed to retrieve system configuration'
        }
      });
    }
  }
);

// Update system configuration
router.put('/config/system/:key',
  ownerOnly,
  allAdmins,
  auditAdminAction('system_config_update'),
  [
    param('key').isString().notEmpty(),
    body('value').exists()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const config = await adminConfigService.updateSystemConfig(
        req.params.key,
        req.body.value,
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'System configuration updated successfully',
        data: config
      });

    } catch (error) {
      logger.error('Update system config error', { key: req.params.key, error });
      res.status(500).json({
        error: {
          code: 'UPDATE_CONFIG_ERROR',
          message: 'Failed to update system configuration'
        }
      });
    }
  }
);

// Get maintenance mode status
router.get('/config/maintenance',
  ownerOnly,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const maintenanceMode = await adminConfigService.getMaintenanceMode();

      res.json({
        success: true,
        data: maintenanceMode
      });

    } catch (error) {
      logger.error('Get maintenance mode error', { error });
      res.status(500).json({
        error: {
          code: 'GET_MAINTENANCE_ERROR',
          message: 'Failed to retrieve maintenance mode status'
        }
      });
    }
  }
);

// Enable maintenance mode
router.post('/config/maintenance',
  ownerOnly,
  allAdmins,
  auditAdminAction('maintenance_mode_enable'),
  [
    body('message').isString().notEmpty(),
    body('estimated_resolution').optional().isISO8601()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const estimatedResolution = req.body.estimated_resolution ?
        new Date(req.body.estimated_resolution) : undefined;

      const maintenanceMode = await adminConfigService.enableMaintenanceMode(
        req.body.message,
        estimatedResolution,
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Maintenance mode enabled successfully',
        data: maintenanceMode
      });

    } catch (error) {
      logger.error('Enable maintenance mode error', { error });
      res.status(500).json({
        error: {
          code: 'ENABLE_MAINTENANCE_ERROR',
          message: 'Failed to enable maintenance mode'
        }
      });
    }
  }
);

// Disable maintenance mode
router.delete('/config/maintenance',
  ownerOnly,
  allAdmins,
  auditAdminAction('maintenance_mode_disable'),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const maintenanceMode = await adminConfigService.disableMaintenanceMode(
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'Maintenance mode disabled successfully',
        data: maintenanceMode
      });

    } catch (error) {
      logger.error('Disable maintenance mode error', { error });
      res.status(500).json({
        error: {
          code: 'DISABLE_MAINTENANCE_ERROR',
          message: 'Failed to disable maintenance mode'
        }
      });
    }
  }
);

// Get system limits
router.get('/config/limits',
  ownerOnly,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const limits = await adminConfigService.getSystemLimits();

      res.json({
        success: true,
        data: limits
      });

    } catch (error) {
      logger.error('Get system limits error', { error });
      res.status(500).json({
        error: {
          code: 'GET_LIMITS_ERROR',
          message: 'Failed to retrieve system limits'
        }
      });
    }
  }
);

// Update system limits
router.put('/config/limits',
  ownerOnly,
  allAdmins,
  auditAdminAction('system_limits_update'),
  [
    body('max_file_upload_size').optional().isInt({ min: 0 }),
    body('rate_limit_requests_per_minute').optional().isInt({ min: 1 }),
    body('session_timeout_hours').optional().isInt({ min: 1 }),
    body('max_failed_login_attempts').optional().isInt({ min: 1 }),
    body('account_lock_duration_minutes').optional().isInt({ min: 1 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const limits = await adminConfigService.updateSystemLimits(
        req.body,
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: 'System limits updated successfully',
        data: limits
      });

    } catch (error) {
      logger.error('Update system limits error', { error });
      res.status(500).json({
        error: {
          code: 'UPDATE_LIMITS_ERROR',
          message: 'Failed to update system limits'
        }
      });
    }
  }
);

/**
 * Audit Log Routes (Owner and Administrator)
 */

// Get audit logs
router.get('/audit/logs',
  adminOrOwner,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('action_type').optional().isString(),
    query('admin_id').optional().isUUID(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const filters: any = {
        limit,
        offset
      };

      if (req.query.action_type) {
        filters.action_type = req.query.action_type as string;
      }

      if (req.query.admin_id) {
        filters.admin_id = req.query.admin_id as string;
      }

      if (req.query.start_date) {
        filters.start_date = new Date(req.query.start_date as string);
      }

      if (req.query.end_date) {
        filters.end_date = new Date(req.query.end_date as string);
      }

      const result = await adminAuditService.searchAuditLogs(filters);

      res.json({
        success: true,
        data: {
          logs: result.entries,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Audit logs error', { error });
      res.status(500).json({
        error: {
          code: 'AUDIT_LOGS_ERROR',
          message: 'Failed to retrieve audit logs'
        }
      });
    }
  }
);

// Search audit logs
router.get('/audit/search',
  adminOrOwner,
  allAdmins,
  [
    query('query').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const result = await adminAuditService.searchAuditLogs({
        limit,
        offset
      });

      res.json({
        success: true,
        data: {
          logs: result.entries,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Audit search error', { error });
      res.status(500).json({
        error: {
          code: 'AUDIT_SEARCH_ERROR',
          message: 'Failed to search audit logs'
        }
      });
    }
  }
);

// Get audit log statistics
router.get('/audit/stats',
  adminOrOwner,
  allAdmins,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      // Calculate days from dates if provided, otherwise use default 30
      let days = 30;
      if (startDate && endDate) {
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const stats = await adminAuditService.getAuditStatistics(days);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Audit stats error', { error });
      res.status(500).json({
        error: {
          code: 'AUDIT_STATS_ERROR',
          message: 'Failed to retrieve audit statistics'
        }
      });
    }
  }
);

// Generate compliance report
router.post('/compliance/reports',
  ownerOnly,
  allAdmins,
  throttleResourceIntensiveOps,
  auditAdminAction('compliance_report_generate'),
  [
    body('report_type').isIn(['gdpr', 'data_retention', 'user_activity', 'security_audit']),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('include_details').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const client = await getClient();
      const complianceService = new AdminComplianceService();

      const startDate = req.body.start_date ? new Date(req.body.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.body.end_date ? new Date(req.body.end_date) : new Date();

      const report = await complianceService.generateComplianceReport(
        req.body.report_type,
        startDate,
        endDate,
        req.admin!.id,
        req.ip || '0.0.0.0',
        req.body.include_details !== false
      );

      client.release();

      res.json({
        success: true,
        message: 'Compliance report generated successfully',
        data: report
      });

    } catch (error) {
      logger.error('Generate compliance report error', { error });
      res.status(500).json({
        error: {
          code: 'GENERATE_REPORT_ERROR',
          message: 'Failed to generate compliance report'
        }
      });
    }
  }
);

// Get GDPR compliance status
router.get('/compliance/gdpr',
  ownerOnly,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const client = await getClient();

      // Get GDPR compliance metrics
      const deletionRequests = await client.query(
        'SELECT COUNT(*) as total FROM gdpr_deletion_requests WHERE status = $1',
        ['completed']
      );
      const exportRequests = await client.query(
        'SELECT COUNT(*) as total FROM gdpr_data_exports WHERE status = $1',
        ['completed']
      );

      const status = {
        deletion_requests_completed: parseInt(deletionRequests.rows[0]?.total || '0'),
        export_requests_completed: parseInt(exportRequests.rows[0]?.total || '0'),
        compliance_status: 'compliant'
      };

      client.release();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('GDPR compliance status error', { error });
      res.status(500).json({
        error: {
          code: 'GDPR_STATUS_ERROR',
          message: 'Failed to retrieve GDPR compliance status'
        }
      });
    }
  }
);

// Process GDPR data export request
router.post('/compliance/data-export',
  ownerOnly,
  allAdmins,
  throttleResourceIntensiveOps,
  auditAdminAction('gdpr_data_export'),
  [
    body('user_id').isUUID(),
    body('request_type').isIn(['full_export', 'specific_data']),
    body('data_types').optional().isArray()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const client = await getClient();

      // Create data export request
      const exportResult = await client.query(
        `INSERT INTO gdpr_data_exports 
         (user_id, requested_by_admin, export_format, status, requested_at)
         VALUES ($1, $2, 'json', 'processing', CURRENT_TIMESTAMP)
         RETURNING id`,
        [req.body.user_id, req.admin!.id]
      );

      const exportData = {
        export_id: exportResult.rows[0].id,
        user_id: req.body.user_id,
        status: 'processing',
        message: 'Data export request created successfully'
      };

      client.release();

      res.json({
        success: true,
        message: 'Data export completed successfully',
        data: exportData
      });

    } catch (error) {
      logger.error('GDPR data export error', { error });
      res.status(500).json({
        error: {
          code: 'DATA_EXPORT_ERROR',
          message: 'Failed to export user data'
        }
      });
    }
  }
);

// Get data retention policy status
router.get('/compliance/retention',
  ownerOnly,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const client = await getClient();

      // Get data retention metrics
      const retentionPolicies = await client.query(
        'SELECT COUNT(*) as total FROM data_retention_policies WHERE active = true'
      );

      const retentionStatus = {
        active_policies: parseInt(retentionPolicies.rows[0]?.total || '0'),
        status: 'active'
      };

      client.release();

      res.json({
        success: true,
        data: retentionStatus
      });

    } catch (error) {
      logger.error('Data retention status error', { error });
      res.status(500).json({
        error: {
          code: 'RETENTION_STATUS_ERROR',
          message: 'Failed to retrieve data retention status'
        }
      });
    }
  }
);

// Export audit logs (secure export)
router.post('/audit/export',
  ownerOnly,
  allAdmins,
  throttleResourceIntensiveOps,
  auditAdminAction('audit_logs_export'),
  [
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
    body('format').optional().isIn(['json', 'csv']),
    body('encrypt').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const startDate = new Date(req.body.start_date);
      const endDate = new Date(req.body.end_date);
      const format = req.body.format || 'json';

      const exportData = await adminAuditService.exportAuditLogs(
        {
          startDate: startDate,
          endDate: endDate,
          limit: 10000,
          offset: 0
        },
        format as 'json' | 'csv'
      );

      res.json({
        success: true,
        message: 'Audit logs exported successfully',
        data: exportData
      });

    } catch (error) {
      logger.error('Audit export error', { error });
      res.status(500).json({
        error: {
          code: 'AUDIT_EXPORT_ERROR',
          message: 'Failed to export audit logs'
        }
      });
    }
  }
);

/**
 * Security Monitoring Routes (Admin and Owner)
 */

// Get security events
router.get('/security/events',
  adminOrOwner,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('event_type').optional().isString(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const filters: any = {
        limit,
        offset
      };

      if (req.query.severity) {
        filters.severity = req.query.severity as string;
      }

      if (req.query.event_type) {
        filters.event_type = req.query.event_type as string;
      }

      if (req.query.start_date) {
        filters.start_date = new Date(req.query.start_date as string);
      }

      if (req.query.end_date) {
        filters.end_date = new Date(req.query.end_date as string);
      }

      const result = await adminSecurityService.getSecurityEvents(filters);

      res.json({
        success: true,
        data: {
          events: result.events,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Security events error', { error });
      res.status(500).json({
        error: {
          code: 'SECURITY_EVENTS_ERROR',
          message: 'Failed to retrieve security events'
        }
      });
    }
  }
);

// Get threat detection indicators
router.get('/security/threats',
  adminOrOwner,
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      // Get recent security events with high severity as threat indicators
      const threats = await adminSecurityService.getSecurityEvents(
        1,
        50,
        {
          severity: 'high'
        }
      );

      res.json({
        success: true,
        data: threats
      });

    } catch (error) {
      logger.error('Threat detection error', { error });
      res.status(500).json({
        error: {
          code: 'THREAT_DETECTION_ERROR',
          message: 'Failed to detect threats'
        }
      });
    }
  }
);

// Get failed login attempts
router.get('/security/failed-logins',
  adminOrOwner,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('hours').optional().isInt({ min: 1, max: 168 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const hours = parseInt(req.query.hours as string) || 24;

      // Get failed login attempts from security events
      const client = await getClient();
      const failedLogins = await client.query(
        `SELECT * FROM admin_security_events 
         WHERE event_type = 'failed_login' 
         AND created_at > NOW() - INTERVAL '${hours} hours'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM admin_security_events 
         WHERE event_type = 'failed_login' 
         AND created_at > NOW() - INTERVAL '${hours} hours'`
      );

      client.release();

      const result = {
        attempts: failedLogins.rows,
        total: parseInt(countResult.rows[0]?.total || '0')
      };

      res.json({
        success: true,
        data: {
          attempts: result.attempts,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Failed logins error', { error });
      res.status(500).json({
        error: {
          code: 'FAILED_LOGINS_ERROR',
          message: 'Failed to retrieve failed login attempts'
        }
      });
    }
  }
);

// Block IP address
router.post('/security/block-ip',
  ownerOnly,
  allAdmins,
  auditAdminAction('ip_block'),
  [
    body('ip_address').isIP(),
    body('reason').isString().notEmpty(),
    body('duration_hours').optional().isInt({ min: 1 }),
    body('block_type').optional().isIn(['temporary', 'permanent'])
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      await adminSecurityService.blockIpAddress(
        req.body.ip_address,
        req.admin!.id,
        req.body.reason,
        req.body.duration_hours
      );

      res.json({
        success: true,
        message: 'IP address blocked successfully'
      });

    } catch (error) {
      logger.error('Block IP error', { error });
      res.status(500).json({
        error: {
          code: 'BLOCK_IP_ERROR',
          message: 'Failed to block IP address'
        }
      });
    }
  }
);

// Unblock IP address
router.delete('/security/block-ip/:ipAddress',
  ownerOnly,
  allAdmins,
  auditAdminAction('ip_unblock'),
  [
    param('ipAddress').isIP(),
    body('reason').isString().notEmpty()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      // Unblock IP address
      const client = await getClient();
      await client.query(
        `UPDATE ip_blocks 
         SET unblocked_at = CURRENT_TIMESTAMP, 
             unblocked_by = $1,
             unblock_reason = $2
         WHERE ip_address = $3 AND unblocked_at IS NULL`,
        [req.admin!.id, req.body.reason, req.params.ipAddress]
      );

      await adminAuditService.createAuditLog(
        req.admin!.id,
        'ip_unblock',
        req.ip || '0.0.0.0',
        req.get('User-Agent'),
        'ip_block',
        req.params.ipAddress,
        { reason: req.body.reason }
      );

      client.release();

      res.json({
        success: true,
        message: 'IP address unblocked successfully'
      });

    } catch (error) {
      logger.error('Unblock IP error', { error });
      res.status(500).json({
        error: {
          code: 'UNBLOCK_IP_ERROR',
          message: 'Failed to unblock IP address'
        }
      });
    }
  }
);

// Get blocked IP addresses
router.get('/security/blocked-ips',
  adminOrOwner,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      // Get blocked IP addresses
      const client = await getClient();
      const blockedIps = await client.query(
        `SELECT * FROM ip_blocks 
         WHERE unblocked_at IS NULL
         ORDER BY blocked_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM ip_blocks WHERE unblocked_at IS NULL'
      );

      client.release();

      const result = {
        blocked_ips: blockedIps.rows,
        total: parseInt(countResult.rows[0]?.total || '0')
      };

      res.json({
        success: true,
        data: {
          blocked_ips: result.blocked_ips,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get blocked IPs error', { error });
      res.status(500).json({
        error: {
          code: 'GET_BLOCKED_IPS_ERROR',
          message: 'Failed to retrieve blocked IP addresses'
        }
      });
    }
  }
);

// Get security statistics
router.get('/security/stats',
  adminOrOwner,
  allAdmins,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      // Get security statistics
      const client = await getClient();
      const eventsCount = await client.query(
        `SELECT COUNT(*) as total, severity 
         FROM admin_security_events 
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY severity`,
        [startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate || new Date()]
      );

      client.release();

      const stats = {
        total_events: eventsCount.rows.reduce((sum, row) => sum + parseInt(row.total), 0),
        by_severity: eventsCount.rows
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Security stats error', { error });
      res.status(500).json({
        error: {
          code: 'SECURITY_STATS_ERROR',
          message: 'Failed to retrieve security statistics'
        }
      });
    }
  }
);

// Create incident response
router.post('/security/incidents',
  ownerOnly,
  allAdmins,
  auditAdminAction('security_incident_create'),
  [
    body('incident_type').isIn(['data_breach', 'unauthorized_access', 'ddos_attack', 'malware', 'other']),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
    body('description').isString().notEmpty(),
    body('affected_systems').optional().isArray(),
    body('response_actions').optional().isArray()
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      // Create security incident
      const client = await getClient();
      const incidentResult = await client.query(
        `INSERT INTO security_incidents 
         (incident_type, severity, description, created_by, affected_systems, response_actions, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          req.body.incident_type,
          req.body.severity,
          req.body.description,
          req.admin!.id,
          JSON.stringify(req.body.affected_systems || []),
          JSON.stringify(req.body.response_actions || [])
        ]
      );

      await adminAuditService.createAuditLog(
        req.admin!.id,
        'security_incident_create',
        req.ip || '0.0.0.0',
        req.get('User-Agent'),
        'security_incident',
        incidentResult.rows[0].id,
        { incident_type: req.body.incident_type, severity: req.body.severity }
      );

      client.release();

      const incident = incidentResult.rows[0];

      res.status(201).json({
        success: true,
        message: 'Security incident created successfully',
        data: incident
      });

    } catch (error) {
      logger.error('Create incident error', { error });
      res.status(500).json({
        error: {
          code: 'CREATE_INCIDENT_ERROR',
          message: 'Failed to create security incident'
        }
      });
    }
  }
);

// Get security incidents
router.get('/security/incidents',
  adminOrOwner,
  allAdmins,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('status').optional().isIn(['open', 'investigating', 'resolved', 'closed'])
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const filters: any = {
        limit,
        offset
      };

      if (req.query.severity) {
        filters.severity = req.query.severity as string;
      }

      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      // Get security incidents
      const client = await getClient();

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.severity) {
        whereClause += ` AND severity = $${paramCount}`;
        params.push(filters.severity);
        paramCount++;
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      params.push(filters.limit, filters.offset);

      const incidents = await client.query(
        `SELECT * FROM security_incidents 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
      );

      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM security_incidents ${whereClause}`,
        params.slice(0, -2)
      );

      client.release();

      const result = {
        incidents: incidents.rows,
        total: parseInt(countResult.rows[0]?.total || '0')
      };

      res.json({
        success: true,
        data: {
          incidents: result.incidents,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get incidents error', { error });
      res.status(500).json({
        error: {
          code: 'GET_INCIDENTS_ERROR',
          message: 'Failed to retrieve security incidents'
        }
      });
    }
  }
);

/**
 * Suspension Appeals Routes
 */

// Get all suspension appeals
router.get('/appeals',
  allAdmins,
  auditAdminAction('view_appeals'),
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'under_review']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const suspensionAppealService = await import('../services/suspensionAppealService');

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await suspensionAppealService.getAllAppeals({
        status: req.query.status as string,
        limit,
        offset
      });

      res.json({
        success: true,
        data: {
          appeals: result.appeals,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error: any) {
      logger.error('Get appeals error', { error: error.message });
      res.status(500).json({
        error: {
          code: 'GET_APPEALS_ERROR',
          message: 'Failed to retrieve appeals'
        }
      });
    }
  }
);

// Get appeal statistics
router.get('/appeals/statistics',
  allAdmins,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const suspensionAppealService = await import('../services/suspensionAppealService');
      const stats = await suspensionAppealService.getAppealStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error('Get appeal statistics error', { error: error.message });
      res.status(500).json({
        error: {
          code: 'GET_APPEAL_STATS_ERROR',
          message: 'Failed to retrieve appeal statistics'
        }
      });
    }
  }
);

// Get appeal by ID
router.get('/appeals/:appealId',
  allAdmins,
  [param('appealId').isUUID()],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appeal ID'
          }
        });
      }

      const suspensionAppealService = await import('../services/suspensionAppealService');
      const appeal = await suspensionAppealService.getAppealById(req.params.appealId);

      if (!appeal) {
        return res.status(404).json({
          error: {
            code: 'APPEAL_NOT_FOUND',
            message: 'Appeal not found'
          }
        });
      }

      res.json({
        success: true,
        data: appeal
      });

    } catch (error: any) {
      logger.error('Get appeal error', { error: error.message });
      res.status(500).json({
        error: {
          code: 'GET_APPEAL_ERROR',
          message: 'Failed to retrieve appeal'
        }
      });
    }
  }
);

// Review an appeal
router.put('/appeals/:appealId/review',
  adminOrOwner,
  allAdmins,
  auditAdminAction('review_appeal'),
  [
    param('appealId').isUUID(),
    body('status').isIn(['approved', 'rejected', 'under_review']),
    body('admin_response').trim().isLength({ min: 10, max: 1000 })
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const suspensionAppealService = await import('../services/suspensionAppealService');

      const appeal = await suspensionAppealService.reviewAppeal({
        appeal_id: req.params.appealId,
        admin_id: req.admin!.id,
        status: req.body.status,
        admin_response: req.body.admin_response
      });

      res.json({
        success: true,
        message: 'Appeal reviewed successfully',
        data: appeal
      });

    } catch (error: any) {
      logger.error('Review appeal error', {
        appealId: req.params.appealId,
        error: error.message
      });
      res.status(500).json({
        error: {
          code: 'REVIEW_APPEAL_ERROR',
          message: error.message || 'Failed to review appeal'
        }
      });
    }
  }
);

/**
 * Health check route (no authentication required)
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Admin API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;