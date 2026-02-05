import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AdminAuditService } from './adminAuditService';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  // Computed fields
  is_suspended?: boolean;
  suspension_info?: {
    reason: string;
    suspended_by: string;
    expires_at?: Date;
    suspension_type: 'temporary' | 'permanent';
  };
  violation_count?: number;
  last_login?: Date;
}

export interface UserSearchFilters {
  search?: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
  is_suspended?: boolean;
  created_after?: Date;
  created_before?: Date;
  has_violations?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  users: UserAccount[];
  total: number;
}

export interface UserStatistics {
  total_users: number;
  verified_users: number;
  suspended_users: number;
  users_with_violations: number;
  new_users_last_30_days: number;
  active_users_last_30_days: number;
  users_by_month: Array<{ month: string; count: number }>;
}

export interface PasswordResetData {
  user_id: string;
  admin_id: string;
  reason: string;
  notify_user: boolean;
}

export interface UserNotificationData {
  user_id: string;
  type: 'warning' | 'suspension' | 'password_reset' | 'account_deletion' | 'general';
  subject: string;
  message: string;
  admin_id: string;
}

export interface AccountDeletionData {
  user_id: string;
  admin_id: string;
  reason: string;
  gdpr_request: boolean;
  backup_data: boolean;
}

export class AdminUserManagementService {
  constructor(
    private db: Pool,
    private auditService: AdminAuditService
  ) { }

  /**
   * Search and list user accounts with privacy-safe metadata only
   */
  async searchUsers(filters: UserSearchFilters = {}): Promise<UserSearchResult> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (filters.search) {
      conditions.push(`(u.email ILIKE $${++paramCount} OR u.name ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
    } else {
      if (filters.email) {
        conditions.push(`u.email ILIKE $${++paramCount}`);
        values.push(`%${filters.email}%`);
      }

      if (filters.name) {
        conditions.push(`u.name ILIKE $${++paramCount}`);
        values.push(`%${filters.name}%`);
      }
    }

    if (filters.email_verified !== undefined) {
      conditions.push(`u.email_verified = $${++paramCount}`);
      values.push(filters.email_verified);
    }

    if (filters.created_after) {
      conditions.push(`u.created_at >= $${++paramCount}`);
      values.push(filters.created_after);
    }

    if (filters.created_before) {
      conditions.push(`u.created_at <= $${++paramCount}`);
      values.push(filters.created_before);
    }

    // Handle suspension filter
    let suspensionJoin = '';
    if (filters.is_suspended !== undefined) {
      suspensionJoin = `
        LEFT JOIN user_suspensions us ON u.id = us.user_id 
        AND us.is_active = TRUE 
        AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
      `;
      if (filters.is_suspended) {
        conditions.push('us.id IS NOT NULL');
      } else {
        conditions.push('us.id IS NULL');
      }
    }

    // Handle violations filter
    let violationJoin = '';
    if (filters.has_violations !== undefined) {
      violationJoin = 'LEFT JOIN user_violations uv ON u.id = uv.user_id';
      if (filters.has_violations) {
        conditions.push('uv.id IS NOT NULL');
      } else {
        conditions.push('uv.id IS NULL');
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${suspensionJoin}
      ${violationJoin}
      ${whereClause}
    `;

    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get users with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT DISTINCT
        u.id,
        u.email,
        u.name,
        u.bio,
        u.avatar_url,
        u.email_verified,
        u.created_at,
        u.updated_at,
        -- Suspension info
        us.reason as suspension_reason,
        us.suspended_by,
        us.expires_at as suspension_expires_at,
        us.suspension_type,
        -- Violation count
        (SELECT COUNT(*) FROM user_violations WHERE user_id = u.id) as violation_count
      FROM users u
      LEFT JOIN user_suspensions us ON u.id = us.user_id 
        AND us.is_active = TRUE 
        AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
      ${violationJoin}
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const queryValues = [...values, limit, offset];
    const result = await this.db.query(query, queryValues);

    const users: UserAccount[] = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      bio: row.bio,
      avatar_url: row.avatar_url,
      email_verified: row.email_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_suspended: !!row.suspension_reason,
      suspension_info: row.suspension_reason ? {
        reason: row.suspension_reason,
        suspended_by: row.suspended_by,
        expires_at: row.suspension_expires_at,
        suspension_type: row.suspension_type
      } : undefined,
      violation_count: parseInt(row.violation_count) || 0
    }));

    return { users, total };
  }

  /**
   * Get detailed user account information (metadata only)
   */
  async getUserById(userId: string): Promise<UserAccount | null> {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.bio,
        u.avatar_url,
        u.email_verified,
        u.created_at,
        u.updated_at,
        -- Suspension info
        us.reason as suspension_reason,
        us.suspended_by,
        us.expires_at as suspension_expires_at,
        us.suspension_type,
        -- Violation count
        (SELECT COUNT(*) FROM user_violations WHERE user_id = u.id) as violation_count
      FROM users u
      LEFT JOIN user_suspensions us ON u.id = us.user_id 
        AND us.is_active = TRUE 
        AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
      WHERE u.id = $1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      bio: row.bio,
      avatar_url: row.avatar_url,
      email_verified: row.email_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_suspended: !!row.suspension_reason,
      suspension_info: row.suspension_reason ? {
        reason: row.suspension_reason,
        suspended_by: row.suspended_by,
        expires_at: row.suspension_expires_at,
        suspension_type: row.suspension_type
      } : undefined,
      violation_count: parseInt(row.violation_count) || 0
    };
  }

  /**
   * Reset user password (admin action)
   */
  async resetUserPassword(
    data: PasswordResetData,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ temporary_password: string }> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Generate temporary password
      const temporaryPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

      // Update user password
      const updateResult = await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING email, name',
        [hashedPassword, data.user_id]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = updateResult.rows[0];

      // Create audit log entry
      await this.auditService.createAuditLog(
        data.admin_id,
        'user_password_reset',
        ipAddress,
        userAgent,
        'user',
        data.user_id,
        {
          reason: data.reason,
          notify_user: data.notify_user,
          user_email: user.email
        }
      );

      // Send notification if requested
      if (data.notify_user) {
        await this.sendUserNotification({
          user_id: data.user_id,
          type: 'password_reset',
          subject: 'Password Reset by Administrator',
          message: `Your password has been reset by an administrator. Reason: ${data.reason}. Your temporary password is: ${temporaryPassword}. Please change it immediately after logging in.`,
          admin_id: data.admin_id
        }, client);
      }

      await client.query('COMMIT');

      return { temporary_password: temporaryPassword };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send notification to user (for moderation actions)
   */
  async sendUserNotification(
    data: UserNotificationData,
    client?: any
  ): Promise<void> {
    const dbClient = client || this.db;

    // Store notification in database
    await dbClient.query(`
      INSERT INTO notifications (
        user_id, type, title, message, created_by_admin, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      data.user_id,
      data.type,
      data.subject,
      data.message,
      data.admin_id
    ]);

    // In a real implementation, this would also send email/push notifications
    // For now, we just store in the database
  }

  /**
   * Delete user account with GDPR compliance
   */
  async deleteUserAccount(
    data: AccountDeletionData,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    deleted: boolean;
    backup_created: boolean;
    data_export?: string;
  }> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get user data for backup if requested
      let dataExport: string | undefined;
      if (data.backup_data) {
        const userData = await this.exportUserData(data.user_id, client);
        dataExport = JSON.stringify(userData, null, 2);
      }

      // Soft delete approach - mark user as deleted but preserve audit trail
      const updateResult = await client.query(`
        UPDATE users 
        SET 
          email = CONCAT('deleted_', id, '@deleted.local'),
          name = 'Deleted User',
          bio = NULL,
          avatar_url = NULL,
          password_hash = 'deleted',
          email_verified = FALSE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING email
      `, [data.user_id]);

      if (updateResult.rows.length === 0) {
        throw new Error('User not found');
      }

      // Delete user content (notes, files, etc.) - this would be implemented
      // based on the specific content tables in the system
      await this.deleteUserContent(data.user_id, client);

      // Create audit log entry
      await this.auditService.createAuditLog(
        data.admin_id,
        'user_account_deleted',
        ipAddress,
        userAgent,
        'user',
        data.user_id,
        {
          reason: data.reason,
          gdpr_request: data.gdpr_request,
          backup_created: data.backup_data,
          deletion_type: 'soft_delete'
        }
      );

      await client.query('COMMIT');

      return {
        deleted: true,
        backup_created: data.backup_data,
        data_export: dataExport
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user with complete cascade deletion and GDPR compliance
   * Requirements: 3.1, 3.2, 3.3, 14.1, 14.2, 14.4
   */
  async deleteUser(
    userId: string,
    adminId: string,
    reason: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    deleted: boolean;
    deletedData: string[];
  }> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Verify user exists
      const userCheck = await client.query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userCheck.rows[0];

      // Cascade delete user data and track what was deleted
      const deletedData = await this.cascadeDeleteUserData(userId, client);

      // Remove PII from user record (GDPR compliance)
      await client.query(`
        UPDATE users 
        SET 
          email = CONCAT('deleted_', id, '@deleted.local'),
          name = 'Deleted User',
          bio = NULL,
          avatar_url = NULL,
          password_hash = 'deleted',
          email_verified = FALSE,
          preferred_language = NULL,
          gender = NULL,
          age = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [userId]);

      // Create audit log entry (preserved for compliance - Requirements 14.2)
      await this.auditService.createAuditLog(
        adminId,
        'user_deleted',
        ipAddress,
        userAgent,
        'user',
        userId,
        {
          reason,
          user_email: user.email,
          user_name: user.name,
          deleted_data: deletedData,
          deletion_timestamp: new Date().toISOString()
        }
      );

      await client.query('COMMIT');

      return {
        deleted: true,
        deletedData
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cascade delete all user data across all tables
   * Requirements: 3.2
   */
  async cascadeDeleteUserData(userId: string, client: any): Promise<string[]> {
    const deletedData: string[] = [];

    // Define all tables with user data and their deletion queries
    const deletionOperations = [
      {
        name: 'tasks',
        query: 'DELETE FROM tasks WHERE user_id = $1',
        description: 'tasks'
      },
      {
        name: 'task_categories',
        query: 'DELETE FROM task_categories WHERE user_id = $1',
        description: 'task categories'
      },
      {
        name: 'notes',
        query: 'DELETE FROM notes WHERE user_id = $1',
        description: 'notes'
      },
      {
        name: 'note_folders',
        query: 'DELETE FROM note_folders WHERE user_id = $1',
        description: 'note folders'
      },
      {
        name: 'files',
        query: 'DELETE FROM files WHERE user_id = $1',
        description: 'files'
      },
      {
        name: 'file_folders',
        query: 'DELETE FROM file_folders WHERE user_id = $1',
        description: 'file folders'
      },
      {
        name: 'resources',
        query: 'DELETE FROM resources WHERE user_id = $1',
        description: 'resources'
      },
      {
        name: 'resource_ratings',
        query: 'DELETE FROM resource_ratings WHERE user_id = $1',
        description: 'resource ratings'
      },
      {
        name: 'resource_comments',
        query: 'DELETE FROM resource_comments WHERE user_id = $1',
        description: 'resource comments'
      },
      {
        name: 'whiteboards',
        query: 'DELETE FROM whiteboards WHERE user_id = $1',
        description: 'whiteboards'
      },
      {
        name: 'whiteboard_permissions',
        query: 'DELETE FROM whiteboard_permissions WHERE user_id = $1',
        description: 'whiteboard permissions'
      },
      {
        name: 'study_group_memberships',
        query: 'DELETE FROM study_group_memberships WHERE user_id = $1',
        description: 'study group memberships'
      },
      {
        name: 'study_group_invitations',
        query: 'DELETE FROM study_group_invitations WHERE user_id = $1',
        description: 'study group invitations'
      },
      {
        name: 'study_group_messages',
        query: 'DELETE FROM study_group_messages WHERE user_id = $1',
        description: 'study group messages'
      },
      {
        name: 'notifications',
        query: 'DELETE FROM notifications WHERE user_id = $1',
        description: 'notifications'
      },
      {
        name: 'notification_preferences',
        query: 'DELETE FROM notification_preferences WHERE user_id = $1',
        description: 'notification preferences'
      },
      {
        name: 'dashboard_preferences',
        query: 'DELETE FROM dashboard_preferences WHERE user_id = $1',
        description: 'dashboard preferences'
      },
      {
        name: 'password_reset_tokens',
        query: 'DELETE FROM password_reset_tokens WHERE user_id = $1',
        description: 'password reset tokens'
      },
      {
        name: 'file_shares',
        query: 'DELETE FROM file_shares WHERE shared_with_user_id = $1 OR shared_by_user_id = $1',
        description: 'file shares'
      },
      {
        name: 'file_activity_logs',
        query: 'DELETE FROM file_activity_logs WHERE user_id = $1',
        description: 'file activity logs'
      },
      {
        name: 'abuse_reports_as_reporter',
        query: 'DELETE FROM abuse_reports WHERE reporter_id = $1',
        description: 'abuse reports (as reporter)'
      },
      {
        name: 'abuse_reports_as_reported',
        query: 'UPDATE abuse_reports SET reported_user_id = NULL WHERE reported_user_id = $1',
        description: 'abuse reports (as reported user - anonymized)'
      },
      {
        name: 'user_violations',
        query: 'DELETE FROM user_violations WHERE user_id = $1',
        description: 'user violations'
      },
      {
        name: 'user_suspensions',
        query: 'DELETE FROM user_suspensions WHERE user_id = $1',
        description: 'user suspensions'
      },
      {
        name: 'gdpr_deletion_requests',
        query: 'DELETE FROM gdpr_deletion_requests WHERE user_id = $1',
        description: 'GDPR deletion requests'
      },
      {
        name: 'gdpr_export_requests',
        query: 'DELETE FROM gdpr_export_requests WHERE user_id = $1',
        description: 'GDPR export requests'
      }
    ];

    // Execute all deletion operations
    for (const operation of deletionOperations) {
      try {
        const result = await client.query(operation.query, [userId]);
        const rowCount = result.rowCount || 0;
        if (rowCount > 0) {
          deletedData.push(`${operation.description} (${rowCount} records)`);
        }
      } catch (error) {
        // Log error but continue with other deletions
        console.error(`Error deleting ${operation.name}:`, error);
        // Still track that we attempted this deletion
        deletedData.push(`${operation.description} (error during deletion)`);
      }
    }

    // Anonymize security logs (preserve for audit but remove user link)
    try {
      const securityLogResult = await client.query(
        'UPDATE security_logs SET user_id = NULL WHERE user_id = $1',
        [userId]
      );
      if (securityLogResult.rowCount && securityLogResult.rowCount > 0) {
        deletedData.push(`security logs (${securityLogResult.rowCount} records anonymized)`);
      }
    } catch (error) {
      console.error('Error anonymizing security logs:', error);
    }

    // Anonymize moderation actions (preserve for audit but remove user link)
    try {
      const moderationResult = await client.query(
        'UPDATE moderation_actions SET target_user_id = NULL WHERE target_user_id = $1',
        [userId]
      );
      if (moderationResult.rowCount && moderationResult.rowCount > 0) {
        deletedData.push(`moderation actions (${moderationResult.rowCount} records anonymized)`);
      }
    } catch (error) {
      console.error('Error anonymizing moderation actions:', error);
    }

    return deletedData;
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get basic counts
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE email_verified = TRUE) as verified_users,
        COUNT(*) FILTER (WHERE created_at >= $1) as new_users_last_30_days
      FROM users
      WHERE email NOT LIKE 'deleted_%@deleted.local'
    `;

    const statsResult = await this.db.query(statsQuery, [thirtyDaysAgo]);
    const stats = statsResult.rows[0];

    // Get suspended users count
    const suspendedResult = await this.db.query(`
      SELECT COUNT(DISTINCT user_id) as suspended_users
      FROM user_suspensions
      WHERE is_active = TRUE 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `);

    // Get users with violations count
    const violationsResult = await this.db.query(`
      SELECT COUNT(DISTINCT user_id) as users_with_violations
      FROM user_violations
    `);

    // Get users by month (last 12 months)
    const monthlyResult = await this.db.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      AND email NOT LIKE 'deleted_%@deleted.local'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    return {
      total_users: parseInt(stats.total_users),
      verified_users: parseInt(stats.verified_users),
      suspended_users: parseInt(suspendedResult.rows[0].suspended_users),
      users_with_violations: parseInt(violationsResult.rows[0].users_with_violations),
      new_users_last_30_days: parseInt(stats.new_users_last_30_days),
      active_users_last_30_days: 0, // Would need to track login activity
      users_by_month: monthlyResult.rows.map(row => ({
        month: row.month,
        count: parseInt(row.count)
      }))
    };
  }

  /**
   * Export user data for GDPR compliance
   */
  private async exportUserData(userId: string, client: any): Promise<any> {
    // Get user account data
    const userResult = await client.query(
      'SELECT id, email, name, bio, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const userData = userResult.rows[0];

    // Get user's content metadata (not the actual content for privacy)
    const contentCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM tasks WHERE user_id = $1) as task_count,
        (SELECT COUNT(*) FROM notes WHERE user_id = $1) as note_count,
        (SELECT COUNT(*) FROM files WHERE user_id = $1) as file_count,
        (SELECT COUNT(*) FROM resources WHERE user_id = $1) as resource_count
    `, [userId]);

    // Get violation history
    const violations = await client.query(
      'SELECT violation_type, severity, created_at FROM user_violations WHERE user_id = $1',
      [userId]
    );

    return {
      account: userData,
      content_summary: contentCounts.rows[0],
      violations: violations.rows,
      export_date: new Date().toISOString(),
      note: 'This export contains metadata only. Private content is not included for privacy protection.'
    };
  }

  /**
   * Delete user content (implementation depends on specific content tables)
   */
  private async deleteUserContent(userId: string, client: any): Promise<void> {
    // Delete or anonymize user content
    // This is a simplified implementation - in practice, you'd need to handle
    // each content type according to your privacy policy

    const contentTables = [
      'tasks',
      'notes',
      'files',
      'resources',
      'whiteboard_sessions',
      'study_group_memberships'
    ];

    for (const table of contentTables) {
      try {
        // Soft delete approach - mark as deleted but preserve for audit
        await client.query(`
          UPDATE ${table} 
          SET 
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by_admin = TRUE
          WHERE user_id = $1 
          AND deleted_at IS NULL
        `, [userId]);
      } catch (error) {
        // Table might not exist or have these columns - continue with others
        console.warn(`Could not delete content from table ${table}:`, error);
      }
    }
  }

  /**
   * Bulk user operations (for efficiency)
   */
  async bulkSuspendUsers(
    userIds: string[],
    adminId: string,
    reason: string,
    ipAddress: string,
    duration_hours?: number,
    userAgent?: string
  ): Promise<{ suspended_count: number; failed_users: string[] }> {
    const client = await this.db.connect();
    const failedUsers: string[] = [];
    let suspendedCount = 0;

    try {
      await client.query('BEGIN');

      for (const userId of userIds) {
        try {
          // Use the moderation service to create suspension
          const expiresAt = duration_hours ?
            new Date(Date.now() + duration_hours * 60 * 60 * 1000) : null;

          await client.query(`
            INSERT INTO user_suspensions (
              user_id, suspended_by, reason, suspension_type, expires_at
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            userId,
            adminId,
            reason,
            duration_hours ? 'temporary' : 'permanent',
            expiresAt
          ]);

          suspendedCount++;

        } catch (error) {
          failedUsers.push(userId);
        }
      }

      // Create audit log for bulk operation
      await this.auditService.createAuditLog(
        adminId,
        'bulk_user_suspension',
        ipAddress,
        userAgent,
        'users',
        userIds.join(','),
        {
          reason,
          duration_hours,
          suspended_count: suspendedCount,
          failed_count: failedUsers.length,
          total_attempted: userIds.length
        }
      );

      await client.query('COMMIT');

      return { suspended_count: suspendedCount, failed_users: failedUsers };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}