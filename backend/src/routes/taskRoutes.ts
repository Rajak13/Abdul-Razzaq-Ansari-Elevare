import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createTaskValidation,
  updateTaskValidation,
  taskIdValidation,
  searchTasksValidation,
  calendarValidation,
} from '../middleware/taskValidation';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// Task routes
router.post('/', createTaskValidation, validate, taskController.createTask);
router.get('/search', searchTasksValidation, validate, taskController.searchTasks);
router.get('/calendar', calendarValidation, validate, taskController.getTasksForCalendar);
router.get('/', taskController.getTasks);
router.get('/:id', taskIdValidation, validate, taskController.getTaskById);
router.put('/bulk', taskController.bulkUpdateTasks);
router.delete('/bulk', taskController.bulkDeleteTasks);
router.put('/reorder', taskController.reorderTasks);
router.put('/:id', updateTaskValidation, validate, taskController.updateTask);
router.delete('/:id', taskIdValidation, validate, taskController.deleteTask);

export default router;
