import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/taskService';
import { CreateTaskInput, UpdateTaskInput, TaskQueryParams, CreateCategoryInput } from '../types/task';

/**
 * Create a new task
 * POST /api/tasks
 */
export async function createTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const taskData: CreateTaskInput = req.body;

    const task = await taskService.createTask(userId, taskData);

    res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all tasks with filtering and pagination
 * GET /api/tasks
 */
export async function getTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const params: TaskQueryParams = {
      status: req.query.status as any,
      priority: req.query.priority as any,
      category_id: req.query.category_id as string,
      search: req.query.search as string,
      sort_by: req.query.sort_by as any,
      order: req.query.order as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await taskService.getTasks(userId, params);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single task by ID
 * GET /api/tasks/:id
 */
export async function getTaskById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const taskId = req.params.id;

    const task = await taskService.getTaskById(userId, taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a task
 * PUT /api/tasks/:id
 */
export async function updateTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const taskId = req.params.id;
    const updates: UpdateTaskInput = req.body;

    const task = await taskService.updateTask(userId, taskId, updates);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
export async function deleteTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const taskId = req.params.id;

    const deleted = await taskService.deleteTask(userId, taskId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search tasks by keyword
 * GET /api/tasks/search
 */
export async function searchTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const keyword = req.query.q as string;

    if (!keyword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_KEYWORD',
          message: 'Search keyword is required',
        },
      });
      return;
    }

    const tasks = await taskService.searchTasks(userId, keyword);

    res.status(200).json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get tasks for calendar view
 * GET /api/tasks/calendar
 */
export async function getTasksForCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATE_RANGE',
          message: 'Start date and end date are required',
        },
      });
      return;
    }

    const tasks = await taskService.getTasksForCalendar(userId, startDate, endDate);

    res.status(200).json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a task category
 * POST /api/task-categories
 */
export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const categoryData: CreateCategoryInput = req.body;

    const category = await taskService.createCategory(userId, categoryData);

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all categories for a user
 * GET /api/task-categories
 */
export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const categories = await taskService.getCategories(userId);

    res.status(200).json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get tasks by category
 * GET /api/task-categories/:id/tasks
 */
export async function getTasksByCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const categoryId = req.params.id;

    const tasks = await taskService.getTasksByCategory(userId, categoryId);

    res.status(200).json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk update tasks
 * PUT /api/tasks/bulk
 */
export async function bulkUpdateTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { ids, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Task IDs array is required',
        },
      });
      return;
    }

    const tasks = await taskService.bulkUpdateTasks(userId, ids, data);

    res.status(200).json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk delete tasks
 * DELETE /api/tasks/bulk
 */
export async function bulkDeleteTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Task IDs array is required',
        },
      });
      return;
    }

    const deletedCount = await taskService.bulkDeleteTasks(userId, ids);

    res.status(200).json({
      success: true,
      message: `${deletedCount} tasks deleted successfully`,
      deletedCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reorder tasks
 * PUT /api/tasks/reorder
 */
export async function reorderTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { taskIds } = req.body;

    console.log('🔄 Backend - reorderTasks controller called:', {
      userId,
      taskIds,
      taskIdsCount: taskIds?.length,
      requestBody: req.body
    });

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      console.log('❌ Backend - Invalid taskIds array:', { taskIds });
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Task IDs array is required',
        },
      });
      return;
    }

    console.log('📡 Backend - Calling taskService.reorderTasks');
    await taskService.reorderTasks(userId, taskIds);

    console.log('✅ Backend - Tasks reordered successfully');
    res.status(200).json({
      success: true,
      message: 'Tasks reordered successfully',
    });
  } catch (error) {
    console.error('❌ Backend - Error in reorderTasks controller:', error);
    next(error);
  }
}
