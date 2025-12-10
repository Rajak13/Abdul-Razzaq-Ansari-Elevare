import { query } from '../db/connection';
import {
  Task,
  TaskCategory,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryParams,
  CreateCategoryInput,
} from '../types/task';
import logger from '../utils/logger';

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  taskData: CreateTaskInput
): Promise<Task> {
  try {
    const { title, description, due_date, priority, category_id, tags } = taskData;

    const result = await query<Task>(
      `INSERT INTO tasks (user_id, title, description, due_date, priority, category_id, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title, description || null, due_date || null, priority, category_id || null, tags || null]
    );

    logger.info('Task created', { taskId: result.rows[0].id, userId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating task', { error, userId, taskData });
    throw error;
  }
}

/**
 * Get all tasks for a user with filtering, sorting, and pagination
 */
export async function getTasks(
  userId: string,
  params: TaskQueryParams
): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
  try {
    const {
      status,
      priority,
      category_id,
      search,
      sort_by = 'created_at',
      order = 'desc',
      page = 1,
      limit = 50,
    } = params;

    // Build WHERE clause
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    if (category_id) {
      conditions.push(`category_id = $${paramIndex}`);
      values.push(category_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tasks WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Validate sort_by to prevent SQL injection
    const validSortFields = ['created_at', 'updated_at', 'due_date', 'priority', 'title', 'status', 'sort_order'];
    const safeSortBy = validSortFields.includes(sort_by) ? sort_by : 'sort_order';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Get tasks with pagination
    const offset = (page - 1) * limit;
    const tasksResult = await query<Task>(
      `SELECT * FROM tasks 
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      tasks: tasksResult.rows,
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Error getting tasks', { error, userId, params });
    throw error;
  }
}

/**
 * Get a single task by ID
 */
export async function getTaskById(
  userId: string,
  taskId: string
): Promise<Task | null> {
  try {
    const result = await query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting task by ID', { error, userId, taskId });
    throw error;
  }
}

/**
 * Update a task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  updates: UpdateTaskInput
): Promise<Task | null> {
  try {
    const task = await getTaskById(userId, taskId);
    if (!task) {
      return null;
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    if (updates.due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex}`);
      values.push(updates.due_date);
      paramIndex++;
    }

    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      values.push(updates.priority);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;

      // Set completed_at timestamp when status changes to completed
      if (updates.status === 'completed' && task.status !== 'completed') {
        updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
      } else if (updates.status === 'pending') {
        updateFields.push(`completed_at = NULL`);
      }
    }

    if (updates.category_id !== undefined) {
      updateFields.push(`category_id = $${paramIndex}`);
      values.push(updates.category_id);
      paramIndex++;
    }

    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      values.push(updates.tags);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return task;
    }

    values.push(taskId, userId);
    const result = await query<Task>(
      `UPDATE tasks 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    logger.info('Task updated', { taskId, userId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating task', { error, userId, taskId, updates });
    throw error;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  userId: string,
  taskId: string
): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info('Task deleted', { taskId, userId });
    }
    return deleted;
  } catch (error) {
    logger.error('Error deleting task', { error, userId, taskId });
    throw error;
  }
}

/**
 * Search tasks by keyword
 */
export async function searchTasks(
  userId: string,
  keyword: string
): Promise<Task[]> {
  try {
    const result = await query<Task>(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
       AND to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $2)
       ORDER BY created_at DESC`,
      [userId, keyword]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error searching tasks', { error, userId, keyword });
    throw error;
  }
}

/**
 * Get tasks for calendar view (by date range)
 */
export async function getTasksForCalendar(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Task[]> {
  try {
    const result = await query<Task>(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
       AND due_date IS NOT NULL
       AND due_date >= $2 
       AND due_date <= $3
       ORDER BY due_date ASC`,
      [userId, startDate, endDate]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting tasks for calendar', { error, userId, startDate, endDate });
    throw error;
  }
}

/**
 * Create a task category
 */
export async function createCategory(
  userId: string,
  categoryData: CreateCategoryInput
): Promise<TaskCategory> {
  try {
    const { name, color } = categoryData;

    const result = await query<TaskCategory>(
      `INSERT INTO task_categories (user_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, color || null]
    );

    logger.info('Task category created', { categoryId: result.rows[0].id, userId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating task category', { error, userId, categoryData });
    throw error;
  }
}

/**
 * Get all categories for a user
 */
export async function getCategories(userId: string): Promise<TaskCategory[]> {
  try {
    const result = await query<TaskCategory>(
      'SELECT * FROM task_categories WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting task categories', { error, userId });
    throw error;
  }
}

/**
 * Get tasks by category
 */
export async function getTasksByCategory(
  userId: string,
  categoryId: string
): Promise<Task[]> {
  try {
    const result = await query<Task>(
      `SELECT * FROM tasks 
       WHERE user_id = $1 AND category_id = $2
       ORDER BY created_at DESC`,
      [userId, categoryId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting tasks by category', { error, userId, categoryId });
    throw error;
  }
}

/**
 * Bulk update tasks
 */
export async function bulkUpdateTasks(
  userId: string,
  taskIds: string[],
  updates: UpdateTaskInput
): Promise<Task[]> {
  try {
    const updateFields: string[] = [];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    if (updates.due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex}`);
      values.push(updates.due_date);
      paramIndex++;
    }

    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      values.push(updates.priority);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;

      // Set completed_at timestamp when status changes to completed
      if (updates.status === 'completed') {
        updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
      } else if (updates.status === 'pending') {
        updateFields.push(`completed_at = NULL`);
      }
    }

    if (updates.category_id !== undefined) {
      updateFields.push(`category_id = $${paramIndex}`);
      values.push(updates.category_id);
      paramIndex++;
    }

    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      values.push(updates.tags);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // If no updates, just return the existing tasks
      const result = await query<Task>(
        `SELECT * FROM tasks WHERE user_id = $1 AND id = ANY($2)`,
        [userId, taskIds]
      );
      return result.rows;
    }

    // Create placeholders for task IDs
    const idPlaceholders = taskIds.map((_, index) => `$${paramIndex + index}`).join(',');
    values.push(...taskIds);

    const result = await query<Task>(
      `UPDATE tasks 
       SET ${updateFields.join(', ')}
       WHERE user_id = $1 AND id IN (${idPlaceholders})
       RETURNING *`,
      values
    );

    logger.info('Tasks bulk updated', { taskIds, userId, updateCount: result.rows.length });
    return result.rows;
  } catch (error) {
    logger.error('Error bulk updating tasks', { error, userId, taskIds, updates });
    throw error;
  }
}

/**
 * Bulk delete tasks
 */
export async function bulkDeleteTasks(
  userId: string,
  taskIds: string[]
): Promise<number> {
  try {
    // Create placeholders for task IDs
    const idPlaceholders = taskIds.map((_, index) => `$${index + 2}`).join(',');
    const values = [userId, ...taskIds];

    const result = await query(
      `DELETE FROM tasks WHERE user_id = $1 AND id IN (${idPlaceholders})`,
      values
    );

    const deletedCount = result.rowCount ?? 0;
    logger.info('Tasks bulk deleted', { taskIds, userId, deletedCount });
    return deletedCount;
  } catch (error) {
    logger.error('Error bulk deleting tasks', { error, userId, taskIds });
    throw error;
  }
}

/**
 * Reorder tasks (update sort_order field)
 */
export async function reorderTasks(
  userId: string,
  taskIds: string[]
): Promise<void> {
  try {
    console.log('🔄 Backend Service - reorderTasks called:', {
      userId,
      taskIds,
      taskIdsCount: taskIds.length
    });

    // Update each task with its new sort order
    const updatePromises = taskIds.map((taskId, index) => {
      console.log(`📝 Backend Service - Updating task ${taskId} to sort_order ${index}`);
      return query(
        'UPDATE tasks SET sort_order = $1 WHERE user_id = $2 AND id = $3',
        [index, userId, taskId]
      );
    });

    const results = await Promise.all(updatePromises);
    
    console.log('✅ Backend Service - All updates completed:', {
      updatedCount: results.length,
      results: results.map((r, i) => ({ taskId: taskIds[i], rowCount: r.rowCount }))
    });

    logger.info('Tasks reordered', { taskIds, userId });
  } catch (error) {
    console.error('❌ Backend Service - Error reordering tasks:', error);
    logger.error('Error reordering tasks', { error, userId, taskIds });
    throw error;
  }
}
