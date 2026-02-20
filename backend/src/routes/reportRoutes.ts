import { Router } from 'express';
import { authenticate, checkSuspension } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';
import * as reportController from '../controllers/reportController';

const router = Router();

// All routes require authentication and non-suspended account
router.use(authenticate);
router.use(checkSuspension);

// Validation middleware
const reportValidation = [
  body('reason')
    .isIn(['spam', 'harassment', 'inappropriate_content', 'copyright_violation', 'hate_speech', 'violence', 'other'])
    .withMessage('Invalid report reason'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
];

// Report endpoints
router.post(
  '/resource/:resourceId',
  param('resourceId').isUUID().withMessage('Invalid resource ID'),
  reportValidation,
  validate,
  reportController.reportResource
);

router.post(
  '/group/:groupId',
  param('groupId').isUUID().withMessage('Invalid group ID'),
  reportValidation,
  validate,
  reportController.reportStudyGroup
);

router.post(
  '/message/:messageId',
  param('messageId').isUUID().withMessage('Invalid message ID'),
  reportValidation,
  validate,
  reportController.reportGroupMessage
);

router.post(
  '/comment/:commentId',
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  reportValidation,
  validate,
  reportController.reportResourceComment
);

export default router;
