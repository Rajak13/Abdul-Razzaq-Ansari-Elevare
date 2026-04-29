import { query } from '../db/connection';
import logger from '../utils/logger';

/**
 * Privacy-preserving aggregation service for admin dashboard
 * Implements data minimization and aggregation rules per GDPR requirements
 */

// Aggregation rules and constants
export const AGGREGATION_RULES = {
  // Minimum threshold for displaying aggregated data to prevent individual identification
  // Set to 1 for development, should be 5+ in production
  MIN_AGGREGATION_THRESHOLD: 1,
  
  // User metrics that can be aggregated
  ALLOWED_USER_METRICS: [
    'total_users',
    'active_users_daily',
    'active_users_weekly', 
    'active_users_monthly',
    'new_registrations',
    'account_deletions'
  ],
  
  // Content metrics that can be aggregated
  ALLOWED_CONTENT_METRICS: [
    'total_tasks',
    'total_notes',
    'total_files',
    'total_resources',
    'storage_usage_by_type'
  ],
  
  // Prohibited data access - these should never be accessible to admins
  PROHIBITED_ACCESS: [
    'note_content',
    'message_content',
    'file_content',
    'whiteboard_data',
    'task_descriptions',
    'user_passwords',
    'private_user_data'
  ]
} as const;

// Types for aggregated metrics
export interface UserMetrics {
  total_users: number;
  active_users_daily: number;
  active_users_weekly: number;
  active_users_monthly: number;
  new_registrations_today: number;
  new_registrations_week: number;
  new_registrations_month: number;
}

export interface ContentMetrics {
  total_tasks: number;
  total_notes: number;
  total_files: number;
  total_resources: number;
  total_study_groups: number;
}

export interface StorageMetrics {
  tasks_storage: number;
  notes_storage: number;
  files_storage: number;
  resources_storage: number;
  total_storage: number;
}

export interface AggregatedMetrics {
  user_metrics: UserMetrics;
  content_metrics: ContentMetrics;
  storage_metrics: StorageMetrics;
  aggregation_timestamp: Date;
  meets_threshold: boolean;
}

/**
 * Anonymization utility functions
 */
export class AnonymizationService {
  /**
   * Hash user IDs for admin display (one-way hash for privacy)
   */
  static anonymizeUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId + 'admin_salt').digest('hex').substring(0, 16);
  }

  /**
   * Remove PII from error logs
   */
  static sanitizeErrorLog(error: any): any {
    if (typeof error === 'object' && error !== null) {
      const sanitized = { ...error };
      
      // Remove common PII fields
      delete sanitized.email;
      delete sanitized.password;
      delete sanitized.password_hash;
      delete sanitized.name;
      delete sanitized.bio;
      delete sanitized.content;
      delete sanitized.description;
      delete sanitized.title;
      
      return sanitized;
    }
    return error;
  }

  /**
   * Check if aggregated data meets minimum threshold
   */
  static meetsAggregationThreshold(count: number): boolean {
    return count >= AGGREGATION_RULES.MIN_AGGREGATION_THRESHOLD;
  }
}

/**
 * Admin Aggregation Service
 * Provides privacy-preserving aggregated metrics for admin dashboard
 */
export class AdminAggregationService {
  
  /**
   * Get aggregated user metrics with privacy protection
   */
  static async getUserMetrics(): Promise<UserMetrics> {
    try {
      logger.info('Fetching aggregated user metrics for admin dashboard');

      // Get total users count
      const totalUsersResult = await query(`
        SELECT COUNT(*) as total_users
        FROM users
        WHERE created_at IS NOT NULL
      `);

      const totalUsers = parseInt(totalUsersResult.rows[0].total_users);

      // Only proceed if we meet the minimum aggregation threshold
      if (!AnonymizationService.meetsAggregationThreshold(totalUsers)) {
        logger.warn('User count below aggregation threshold, returning zero metrics');
        return {
          total_users: 0,
          active_users_daily: 0,
          active_users_weekly: 0,
          active_users_monthly: 0,
          new_registrations_today: 0,
          new_registrations_week: 0,
          new_registrations_month: 0
        };
      }

      // Get active users (users who have logged in recently)
      // Note: We need to add last_login tracking to users table for this to work properly
      const activeUsersResult = await query(`
        SELECT 
          COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '1 day' THEN 1 END) as daily_active,
          COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active,
          COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active
        FROM users
      `);

      // Get new registrations
      const newRegistrationsResult = await query(`
        SELECT 
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month
        FROM users
      `);

      const activeUsers = activeUsersResult.rows[0];
      const newRegistrations = newRegistrationsResult.rows[0];

      const metrics: UserMetrics = {
        total_users: totalUsers,
        active_users_daily: parseInt(activeUsers.daily_active) || 0,
        active_users_weekly: parseInt(activeUsers.weekly_active) || 0,
        active_users_monthly: parseInt(activeUsers.monthly_active) || 0,
        new_registrations_today: parseInt(newRegistrations.today) || 0,
        new_registrations_week: parseInt(newRegistrations.week) || 0,
        new_registrations_month: parseInt(newRegistrations.month) || 0
      };

      logger.info('Successfully fetched user metrics', { 
        total_users: metrics.total_users,
        meets_threshold: true 
      });

      return metrics;

    } catch (error) {
      logger.error('Error fetching user metrics', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to fetch user metrics');
    }
  }

  /**
   * Get aggregated content metrics (tasks, notes, files, resources)
   */
  static async getContentMetrics(): Promise<ContentMetrics> {
    try {
      logger.info('Fetching aggregated content metrics for admin dashboard');

      // Get content counts from all tables
      const contentResult = await query(`
        SELECT 
          (SELECT COUNT(*) FROM tasks) as total_tasks,
          (SELECT COUNT(*) FROM notes) as total_notes,
          (SELECT COUNT(*) FROM files) as total_files,
          (SELECT COUNT(*) FROM resources) as total_resources,
          (SELECT COUNT(*) FROM study_groups) as total_study_groups
      `);

      const content = contentResult.rows[0];

      const metrics: ContentMetrics = {
        total_tasks: parseInt(content.total_tasks) || 0,
        total_notes: parseInt(content.total_notes) || 0,
        total_files: parseInt(content.total_files) || 0,
        total_resources: parseInt(content.total_resources) || 0,
        total_study_groups: parseInt(content.total_study_groups) || 0
      };

      logger.info('Successfully fetched content metrics', metrics);
      return metrics;

    } catch (error) {
      logger.error('Error fetching content metrics', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to fetch content metrics');
    }
  }

  /**
   * Get storage usage aggregated by feature type
   */
  static async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      logger.info('Fetching aggregated storage metrics for admin dashboard');

      // Get storage usage by feature type
      const storageResult = await query(`
        SELECT 
          COALESCE((SELECT SUM(
            CASE 
              WHEN description IS NOT NULL THEN LENGTH(description) 
              ELSE 0 
            END
          ) FROM tasks), 0) as tasks_storage,
          COALESCE((SELECT SUM(LENGTH(content)) FROM notes), 0) as notes_storage,
          COALESCE((SELECT SUM(size) FROM files), 0) as files_storage,
          COALESCE((SELECT SUM(file_size) FROM resources), 0) as resources_storage
      `);

      const storage = storageResult.rows[0];

      const tasksStorage = parseInt(storage.tasks_storage) || 0;
      const notesStorage = parseInt(storage.notes_storage) || 0;
      const filesStorage = parseInt(storage.files_storage) || 0;
      const resourcesStorage = parseInt(storage.resources_storage) || 0;

      const metrics: StorageMetrics = {
        tasks_storage: tasksStorage,
        notes_storage: notesStorage,
        files_storage: filesStorage,
        resources_storage: resourcesStorage,
        total_storage: tasksStorage + notesStorage + filesStorage + resourcesStorage
      };

      logger.info('Successfully fetched storage metrics', {
        total_storage: metrics.total_storage,
        breakdown: {
          tasks: metrics.tasks_storage,
          notes: metrics.notes_storage,
          files: metrics.files_storage,
          resources: metrics.resources_storage
        }
      });

      return metrics;

    } catch (error) {
      logger.error('Error fetching storage metrics', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to fetch storage metrics');
    }
  }

  /**
   * Get all aggregated metrics with privacy protection
   */
  static async getAllMetrics(): Promise<AggregatedMetrics> {
    try {
      logger.info('Fetching all aggregated metrics for admin dashboard');

      const [userMetrics, contentMetrics, storageMetrics] = await Promise.all([
        this.getUserMetrics(),
        this.getContentMetrics(),
        this.getStorageMetrics()
      ]);

      // Check if we meet aggregation threshold based on user count
      const meetsThreshold = AnonymizationService.meetsAggregationThreshold(userMetrics.total_users);

      const aggregatedMetrics: AggregatedMetrics = {
        user_metrics: userMetrics,
        content_metrics: contentMetrics,
        storage_metrics: storageMetrics,
        aggregation_timestamp: new Date(),
        meets_threshold: meetsThreshold
      };

      logger.info('Successfully fetched all aggregated metrics', {
        meets_threshold: meetsThreshold,
        total_users: userMetrics.total_users,
        total_content_items: contentMetrics.total_tasks + contentMetrics.total_notes + 
                            contentMetrics.total_files + contentMetrics.total_resources,
        total_storage: storageMetrics.total_storage
      });

      return aggregatedMetrics;

    } catch (error) {
      logger.error('Error fetching aggregated metrics', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to fetch aggregated metrics');
    }
  }

  /**
   * Get DAU/WAU/MAU metrics with privacy protection
   * Note: This requires proper last_login tracking in the users table
   */
  static async getActiveUserMetrics(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<number> {
    try {
      logger.info(`Fetching ${timeframe} active user metrics`);

      let interval: string;
      switch (timeframe) {
        case 'daily':
          interval = '1 day';
          break;
        case 'weekly':
          interval = '7 days';
          break;
        case 'monthly':
          interval = '30 days';
          break;
        default:
          throw new Error('Invalid timeframe specified');
      }

      // Using updated_at as a proxy for activity until we implement proper last_login tracking
      const result = await query(`
        SELECT COUNT(*) as active_users
        FROM users
        WHERE updated_at >= NOW() - INTERVAL '${interval}'
      `);

      const activeUsers = parseInt(result.rows[0].active_users) || 0;

      // Apply aggregation threshold
      if (!AnonymizationService.meetsAggregationThreshold(activeUsers)) {
        logger.warn(`${timeframe} active users below aggregation threshold`);
        return 0;
      }

      logger.info(`Successfully fetched ${timeframe} active users`, { count: activeUsers });
      return activeUsers;

    } catch (error) {
      logger.error(`Error fetching ${timeframe} active user metrics`, AnonymizationService.sanitizeErrorLog(error));
      throw new Error(`Failed to fetch ${timeframe} active user metrics`);
    }
  }
}

export default AdminAggregationService;