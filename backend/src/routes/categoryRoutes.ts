import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { authenticate, checkSuspension } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createCategoryValidation,
  categoryIdValidation,
} from '../middleware/taskValidation';

const router = Router();

// All category routes require authentication
router.use(authenticate);
router.use(checkSuspension);

// Category routes
router.post('/', createCategoryValidation, validate, taskController.createCategory);
router.get('/', taskController.getCategories);
router.get('/:id/tasks', categoryIdValidation, validate, taskController.getTasksByCategory);

export default router;
