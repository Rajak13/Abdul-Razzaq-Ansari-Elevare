import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import * as suspensionAppealService from '../services/suspensionAppealService';
import { authenticate } from '../middleware/auth';
import { query } from '../db/connection';
import logger from '../utils/logger';

const router = Router();

/**
 * Create a suspension appeal (authenticated - for suspended users)
 * POST /api/suspension-appeals
 * ✅ SECURITY: Added authentication and ownership verification
 */
router.post(
  '/',
  authenticate, // ✅ SECURITY: Require authentication
  [
    // ✅ SECURITY: Removed user_id from body - use authenticated user instead
    body('suspension_id').isUUID().withMessage('Valid suspension ID required'),
    body('appeal_message')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Appeal message must be between 10 and 2000 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const authenticatedUserId = req.user?.userId;
      const { suspension_id, appeal_message } = req.body;

      if (!authenticatedUserId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // ✅ SECURITY: Verify the suspension belongs to the authenticated user
      const suspensionCheck = await query(
        `SELECT id, user_id FROM user_suspensions 
         WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [suspension_id, authenticatedUserId]
      );

      if (suspensionCheck.rows.length === 0) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Suspension not found or you do not have permission to appeal it',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // ✅ SECURITY: Use authenticated user ID, not client-supplied user_id
      const appeal = await suspensionAppealService.createAppeal({
        user_id: authenticatedUserId,
        suspension_id,
        appeal_message,
      });

      res.status(201).json({
        success: true,
        message: 'Appeal submitted successfully',
        appeal,
      });
    } catch (error: any) {
      logger.error('Create appeal error', { error: error.message });

      if (error.message.includes('already have a pending appeal')) {
        res.status(409).json({
          error: {
            code: 'APPEAL_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'CREATE_APPEAL_FAILED',
          message: 'Failed to create appeal',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * Get user's appeals (authenticated - user can only see their own appeals)
 * GET /api/suspension-appeals/user/:userId
 * ✅ SECURITY: Added authentication and ownership verification
 */
router.get(
  '/user/:userId',
  authenticate, // ✅ SECURITY: Require authentication
  [param('userId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const requestedUserId = req.params.userId;
      const authenticatedUserId = req.user?.userId;

      if (!authenticatedUserId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // ✅ SECURITY: Only allow users to view their own appeals
      if (requestedUserId !== authenticatedUserId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own appeals',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const appeals = await suspensionAppealService.getAppealsByUserId(requestedUserId);

      res.json({
        success: true,
        appeals,
      });
    } catch (error: any) {
      logger.error('Get user appeals error', { error: error.message });
      res.status(500).json({
        error: {
          code: 'GET_APPEALS_FAILED',
          message: 'Failed to get appeals',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * Get current user's appeals (simpler endpoint)
 * GET /api/suspension-appeals/my-appeals
 * ✅ SECURITY: Authenticated endpoint using user ID from token
 */
router.get(
  '/my-appeals',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authenticatedUserId = req.user?.userId;

      if (!authenticatedUserId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const appeals = await suspensionAppealService.getAppealsByUserId(authenticatedUserId);

      res.json({
        success: true,
        appeals,
      });
    } catch (error: any) {
      logger.error('Get my appeals error', { error: error.message });
      res.status(500).json({
        error: {
          code: 'GET_APPEALS_FAILED',
          message: 'Failed to get appeals',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

export default router;
