import { query } from '../db/connection';
import logger from '../utils/logger';
import { AnonymizationService } from './adminAggregationService';

/**
 * Privacy-preserving metadata extraction service for admin dashboard
 * Extracts only allowed metadata from user accounts without exposing private content
 */

// Types for privacy-safe user metadata
export interface UserMetadata {
  id: string; // Anonymized user ID
  email: string; // Email (for admin purposes only)
  registration_date: Date;
  last_activity: Date | null;
  account_status: 'active' | 'suspended' | 'deleted';
  violation_count: number;
  content_counts: {
    tasks: number;
    notes: number;
    files: number;
    resources: number;
  };
  storage_usage: number;
}

export interface UserSearchResult {
  users: UserMetadata[];
  total_count: number;
  page: number;
  per_page: number;
  meets_threshold: boolean;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  suspended_users: number;
  new_users_this_month: number;
  average_content_per_user: number;
  average_storage_per_user: number;
}

/**
 * Admin Metadata Service
 * Provides privacy-safe access to user account metadata for administrative purposes
 */
export class AdminMetadataService {
  
  /**
   * Search for user accounts with privacy-safe results
   * Only returns metadata, never private content
   */
  static async searchUsers(
    searchTerm?: string,
    page: number = 1,
    perPage: number = 20,
    status?: 'active' | 'suspended' | 'deleted'
  ): Promise<UserSearchResult> {
    try {
      logger.info('Searching user accounts for admin dashboard', { 
        searchTerm: searchTerm ? '[REDACTED]' : undefined, 
        page, 
        perPage, 
        status 
      });

      const offset = (page - 1) * perPage;
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Add search term filter (only on email, not private data)
      if (searchTerm) {
        whereClause += ` AND email ILIKE $${paramIndex}`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      // Add status filter (assuming we have a status column or use soft delete)
      if (status) {
        // For now, we'll assume all users are 'active' unless we implement status tracking
        if (status !== 'active') {
          whereClause += ` AND FALSE`; // No suspended/deleted users yet
        }
      }

      // Get total count first
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `, params);

      const totalCount = parseInt(countResult.rows[0].total);

      // Check aggregation threshold
      if (totalCount < 5) {
        logger.warn('User search results below aggregation threshold');
        return {
          users: [],
          total_count: 0,
          page,
          per_page: perPage,
          meets_threshold: false
        };
      }

      // Get user metadata with content counts
      const usersResult = await query(`
        SELECT 
          u.id,
          u.email,
          u.created_at as registration_date,
          u.updated_at as last_activity,
          'active' as account_status,
          0 as violation_count,
          COALESCE(task_counts.count, 0) as task_count,
          COALESCE(note_counts.count, 0) as note_count,
          COALESCE(file_counts.count, 0) as file_count,
          COALESCE(resource_counts.count, 0) as resource_count,
          COALESCE(file_storage.storage, 0) + COALESCE(resource_storage.storage, 0) as storage_usage
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM tasks 
          GROUP BY user_id
        ) task_counts ON u.id = task_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM notes 
          GROUP BY user_id
        ) note_counts ON u.id = note_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM files 
          GROUP BY user_id
        ) file_counts ON u.id = file_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM resources 
          GROUP BY user_id
        ) resource_counts ON u.id = resource_counts.user_id
        LEFT JOIN (
          SELECT user_id, SUM(size) as storage 
          FROM files 
          GROUP BY user_id
        ) file_storage ON u.id = file_storage.user_id
        LEFT JOIN (
          SELECT user_id, SUM(file_size) as storage 
          FROM resources 
          GROUP BY user_id
        ) resource_storage ON u.id = resource_storage.user_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, perPage, offset]);

      const users: UserMetadata[] = usersResult.rows.map(row => ({
        id: AnonymizationService.anonymizeUserId(row.id),
        email: row.email,
        registration_date: row.registration_date,
        last_activity: row.last_activity,
        account_status: row.account_status,
        violation_count: row.violation_count,
        content_counts: {
          tasks: parseInt(row.task_count) || 0,
          notes: parseInt(row.note_count) || 0,
          files: parseInt(row.file_count) || 0,
          resources: parseInt(row.resource_count) || 0
        },
        storage_usage: parseInt(row.storage_usage) || 0
      }));

      logger.info('Successfully retrieved user search results', {
        total_count: totalCount,
        returned_count: users.length,
        page,
        meets_threshold: true
      });

      return {
        users,
        total_count: totalCount,
        page,
        per_page: perPage,
        meets_threshold: true
      };

    } catch (error) {
      logger.error('Error searching users', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to search users');
    }
  }
  /**
   * Get detailed metadata for a specific user account
   * Returns only metadata, never private content
   */
  static async getUserMetadata(userId: string): Promise<UserMetadata | null> {
    try {
      logger.info('Fetching user metadata for admin dashboard', { 
        userId: AnonymizationService.anonymizeUserId(userId) 
      });

      const result = await query(`
        SELECT 
          u.id,
          u.email,
          u.created_at as registration_date,
          u.updated_at as last_activity,
          'active' as account_status,
          0 as violation_count,
          COALESCE(task_counts.count, 0) as task_count,
          COALESCE(note_counts.count, 0) as note_count,
          COALESCE(file_counts.count, 0) as file_count,
          COALESCE(resource_counts.count, 0) as resource_count,
          COALESCE(file_storage.storage, 0) + COALESCE(resource_storage.storage, 0) as storage_usage
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM tasks 
          WHERE user_id = $1
          GROUP BY user_id
        ) task_counts ON u.id = task_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM notes 
          WHERE user_id = $1
          GROUP BY user_id
        ) note_counts ON u.id = note_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM files 
          WHERE user_id = $1
          GROUP BY user_id
        ) file_counts ON u.id = file_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM resources 
          WHERE user_id = $1
          GROUP BY user_id
        ) resource_counts ON u.id = resource_counts.user_id
        LEFT JOIN (
          SELECT user_id, SUM(size) as storage 
          FROM files 
          WHERE user_id = $1
          GROUP BY user_id
        ) file_storage ON u.id = file_storage.user_id
        LEFT JOIN (
          SELECT user_id, SUM(file_size) as storage 
          FROM resources 
          WHERE user_id = $1
          GROUP BY user_id
        ) resource_storage ON u.id = resource_storage.user_id
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        logger.warn('User not found', { userId: AnonymizationService.anonymizeUserId(userId) });
        return null;
      }

      const row = result.rows[0];
      const userMetadata: UserMetadata = {
        id: AnonymizationService.anonymizeUserId(row.id),
        email: row.email,
        registration_date: row.registration_date,
        last_activity: row.last_activity,
        account_status: row.account_status,
        violation_count: row.violation_count,
        content_counts: {
          tasks: parseInt(row.task_count) || 0,
          notes: parseInt(row.note_count) || 0,
          files: parseInt(row.file_count) || 0,
          resources: parseInt(row.resource_count) || 0
        },
        storage_usage: parseInt(row.storage_usage) || 0
      };

      logger.info('Successfully retrieved user metadata', {
        anonymized_id: userMetadata.id,
        content_items: Object.values(userMetadata.content_counts).reduce((a, b) => a + b, 0),
        storage_usage: userMetadata.storage_usage
      });

      return userMetadata;

    } catch (error) {
      logger.error('Error fetching user metadata', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to fetch user metadata');
    }
  }

  /**
   * Get aggregated user statistics without individual identification
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    try {
      logger.info('Fetching aggregated user statistics for admin dashboard');

      const result = await query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
          0 as suspended_users,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month,
          (
            SELECT AVG(content_count) FROM (
              SELECT user_id, 
                (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id) +
                (SELECT COUNT(*) FROM notes WHERE notes.user_id = users.id) +
                (SELECT COUNT(*) FROM files WHERE files.user_id = users.id) +
                (SELECT COUNT(*) FROM resources WHERE resources.user_id = users.id) as content_count
              FROM users
            ) user_content_counts
          ) as average_content_per_user,
          (
            SELECT AVG(storage_usage) FROM (
              SELECT user_id,
                COALESCE((SELECT SUM(size) FROM files WHERE files.user_id = users.id), 0) +
                COALESCE((SELECT SUM(file_size) FROM resources WHERE resources.user_id = users.id), 0) as storage_usage
              FROM users
            ) user_storage_usage
          ) as average_storage_per_user
        FROM users
      `);

      const row = result.rows[0];
      const totalUsers = parseInt(row.total_users);

      // Apply aggregation threshold
      if (totalUsers < 5) {
        logger.warn('User statistics below aggregation threshold');
        return {
          total_users: 0,
          active_users: 0,
          suspended_users: 0,
          new_users_this_month: 0,
          average_content_per_user: 0,
          average_storage_per_user: 0
        };
      }

      const statistics: UserStatistics = {
        total_users: totalUsers,
        active_users: parseInt(row.active_users) || 0,
        suspended_users: parseInt(row.suspended_users) || 0,
        new_users_this_month: parseInt(row.new_users_this_month) || 0,
        average_content_per_user: parseFloat(row.average_content_per_user) || 0,
        average_storage_per_user: parseFloat(row.average_storage_per_user) || 0
      };

      logger.info('Successfully retrieved user statistics', {
        total_users: statistics.total_users,
        meets_threshold: true
      });

      return statistics;

    } catch (error) {
      logger.error('Error fetching user statistics', AnonymizationService.sanitizeErrorLog(error));
      throw new Error('Failed to fetch user statistics');
    }
  }

  /**
   * Validate that a query does not attempt to access prohibited private content
   */
  static validatePrivacyCompliance(queryParams: any): boolean {
    const prohibitedFields = [
      'content', 'description', 'title', 'name', 'bio', 
      'password', 'password_hash', 'note_content', 'message_content'
    ];

    const queryString = JSON.stringify(queryParams).toLowerCase();
    
    for (const field of prohibitedFields) {
      if (queryString.includes(field)) {
        logger.warn('Privacy violation attempt detected', { 
          field, 
          query: '[REDACTED]' 
        });
        return false;
      }
    }

    return true;
  }
}

export default AdminMetadataService;