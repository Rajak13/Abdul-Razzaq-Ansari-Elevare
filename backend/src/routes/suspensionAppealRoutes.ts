import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import * as suspensionAppealService from '../services/suspensionAppealService';
import logger from '../utils/logger';

const router = Router();

/**
 * Create a suspension appeal (public - for suspended users)
 * POST /api/suspension-appeals
 */
router.post(
  '/',
  [
    body('user_id').isUUID().withMessage('Valid user ID required'),
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

      const appeal = await suspensionAppealService.createAppeal(req.body);

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
 * Get user's appeals
 * GET /api/suspension-appeals/user/:userId
 */
router.get(
  '/user/:userId',
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

      const appeals = await suspensionAppealService.getAppealsByUserId(req.params.userId);

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

export default router;
