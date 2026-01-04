import { query } from '../db/connection';
import logger from '../utils/logger';

export interface DashboardData {
  upcomingTasks: Array<{
    id: string;
    title: string;
    due_date: string;
    priority: string;
    status: string;
  }>;
  recentNotes: Array<{
    id: string;
    title: string;
    updated_at: string;
    folder_id?: string;
  }>;
  groupNotifications: Array<{
    id: string;
    group_id: string;
    group_name: string;
    type: string;
    message: string;
    created_at: string;
  }>;
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalNotes: number;
    totalGroups: number;
  };
}

export interface DashboardPreferences {
  id: string;
  user_id: string;
  widget_layout: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ProductivityAnalytics {
  taskCompletionRate: {
    period: string;
    completed: number;
    total: number;
    rate: number;
  }[];
  studyTimeStats: {
    totalHours: number;
    averagePerDay: number;
    trend: 'up' | 'down' | 'stable';
  };
  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Get dashboard data for a user
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  try {
    // Get upcoming tasks (due within next 7 days)
    const upcomingTasksResult = await query(
      `SELECT id, title, due_date, priority, status
       FROM tasks 
       WHERE user_id = $1 
         AND due_date IS NOT NULL 
         AND due_date >= CURRENT_DATE 
         AND due_date <= CURRENT_DATE + INTERVAL '7 days'
         AND status = 'pending'
       ORDER BY due_date ASC
       LIMIT 5`,
      [userId]
    );

    // Get recent notes (last 5 updated)
    const recentNotesResult = await query(
      `SELECT id, title, updated_at, folder_id
       FROM notes 
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 5`,
      [userId]
    );

    // Get group notifications (recent group activities)
    const groupNotificationsResult = await query(
      `SELECT 
         n.id,
         n.group_id,
         sg.name as group_name,
         n.type,
         n.message,
         n.created_at
       FROM notifications n
       JOIN study_groups sg ON sg.id = n.group_id
       WHERE n.user_id = $1 
         AND n.group_id IS NOT NULL
         AND n.created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY n.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get user statistics
    const statsResult = await query(
      `SELECT 
         (SELECT COUNT(*) FROM tasks WHERE user_id = $1) as total_tasks,
         (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'completed') as completed_tasks,
         (SELECT COUNT(*) FROM notes WHERE user_id = $1) as total_notes,
         (SELECT COUNT(*) FROM group_members gm 
          JOIN study_groups sg ON sg.id = gm.group_id 
          WHERE gm.user_id = $1) as total_groups`,
      [userId]
    );

    const stats = statsResult.rows[0] || {
      total_tasks: 0,
      completed_tasks: 0,
      total_notes: 0,
      total_groups: 0
    };

    return {
      upcomingTasks: upcomingTasksResult.rows,
      recentNotes: recentNotesResult.rows,
      groupNotifications: groupNotificationsResult.rows,
      stats: {
        totalTasks: parseInt(stats.total_tasks) || 0,
        completedTasks: parseInt(stats.completed_tasks) || 0,
        totalNotes: parseInt(stats.total_notes) || 0,
        totalGroups: parseInt(stats.total_groups) || 0,
      }
    };
  } catch (error) {
    logger.error('Error getting dashboard data', { error, userId });
    throw error;
  }
}

/**
 * Get or create dashboard preferences for a user
 */
export async function getDashboardPreferences(userId: string): Promise<DashboardPreferences | null> {
  try {
    const result = await query<DashboardPreferences>(
      'SELECT * FROM dashboard_preferences WHERE user_id = $1',
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting dashboard preferences', { error, userId });
    throw error;
  }
}

/**
 * Update dashboard preferences for a user
 */
export async function updateDashboardPreferences(
  userId: string,
  widgetLayout: Record<string, any>
): Promise<DashboardPreferences> {
  try {
    // Try to update existing preferences
    const updateResult = await query<DashboardPreferences>(
      `UPDATE dashboard_preferences 
       SET widget_layout = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(widgetLayout), userId]
    );

    if (updateResult.rows.length > 0) {
      return updateResult.rows[0];
    }

    // If no existing preferences, create new ones
    const createResult = await query<DashboardPreferences>(
      `INSERT INTO dashboard_preferences (user_id, widget_layout)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, JSON.stringify(widgetLayout)]
    );

    logger.info('Dashboard preferences updated', { userId });
    return createResult.rows[0];
  } catch (error) {
    logger.error('Error updating dashboard preferences', { error, userId });
    throw error;
  }
}

/**
 * Get productivity analytics for a user
 */
export async function getProductivityAnalytics(userId: string): Promise<ProductivityAnalytics> {
  try {
    // Get task completion rate for the last 30 days
    const completionRateResult = await query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM tasks 
       WHERE user_id = $1 
         AND created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    );

    const taskCompletionRate = completionRateResult.rows.map(row => ({
      period: row.date,
      completed: parseInt(row.completed) || 0,
      total: parseInt(row.total) || 0,
      rate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0
    }));

    // Calculate study time stats (based on task completion times)
    const studyTimeResult = await query(
      `SELECT 
         COUNT(CASE WHEN status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_completed,
         COUNT(CASE WHEN status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '60 days' AND completed_at < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as previous_completed
       FROM tasks 
       WHERE user_id = $1`,
      [userId]
    );

    const studyStats = studyTimeResult.rows[0] || { recent_completed: 0, previous_completed: 0 };
    const recentCompleted = parseInt(studyStats.recent_completed) || 0;
    const previousCompleted = parseInt(studyStats.previous_completed) || 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentCompleted > previousCompleted) {
      trend = 'up';
    } else if (recentCompleted < previousCompleted) {
      trend = 'down';
    }

    // Get category breakdown
    const categoryResult = await query(
      `SELECT 
         COALESCE(tc.name, 'Uncategorized') as category,
         COUNT(t.id) as count
       FROM tasks t
       LEFT JOIN task_categories tc ON tc.id = t.category_id
       WHERE t.user_id = $1
       GROUP BY tc.name
       ORDER BY count DESC`,
      [userId]
    );

    const totalTasks = categoryResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const categoryBreakdown = categoryResult.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count),
      percentage: totalTasks > 0 ? Math.round((parseInt(row.count) / totalTasks) * 100) : 0
    }));

    return {
      taskCompletionRate,
      studyTimeStats: {
        totalHours: recentCompleted * 2, // Estimate 2 hours per completed task
        averagePerDay: Math.round((recentCompleted * 2) / 30 * 10) / 10,
        trend
      },
      categoryBreakdown
    };
  } catch (error) {
    logger.error('Error getting productivity analytics', { error, userId });
    throw error;
  }
}