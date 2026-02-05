import { Pool } from 'pg';
import { AdminAuditService } from './adminAuditService';
import { sendSuspensionEmail, sendUnsuspensionEmail } from './emailService';
import logger from '../utils/logger';

export interface AbuseReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: 'note' | 'message' | 'file' | 'resource' | 'whiteboard' | 'profile' | 'study_group';
  content_id: string;
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'copyright_violation' | 'hate_speech' | 'violence' | 'other';
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  moderator_id?: string;
  action_taken?: string;
  moderator_notes?: string;
  created_at: Date;
  resolved_at?: Date;
  updated_at: Date;
}

export interface UserViolation {
  id: string;
  user_id: string;
  violation_type: string;
  severity: 'warning' | 'minor' | 'major' | 'severe';
  description: string;
  moderator_id: string;
  abuse_report_id?: string;
  action_taken: string;
  duration_hours?: number;
  expires_at?: Date;
  created_at: Date;
}

export interface UserSuspension {
  id: string;
  user_id: string;
  suspended_by: string;
  reason: string;
  suspension_type: 'temporary' | 'permanent';
  starts_at: Date;
  expires_at?: Date;
  is_active: boolean;
  lifted_by?: string;
  lifted_at?: Date;
  lift_reason?: string;
  created_at: Date;
}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  action_type: string;
  target_user_id?: string;
  target_content_type?: string;
  target_content_id?: string;
  abuse_report_id?: string;
  details: any;
  ip_address: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateAbuseReportData {
  reporter_id: string;
  reported_user_id: string;
  content_type: AbuseReport['content_type'];
  content_id: string;
  reason: AbuseReport['reason'];
  description?: string;
}

export interface ModerationActionData {
  action: 'dismiss' | 'warn' | 'suspend' | 'ban' | 'resolve';
  reason: string;
  notes?: string;
  duration_hours?: number; // For temporary suspensions
}

export interface ModerationFilters {
  status?: AbuseReport['status'];
  priority?: AbuseReport['priority'];
  content_type?: AbuseReport['content_type'];
  moderator_id?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}

export class AdminModerationService {
  constructor(
    private db: Pool,
    private auditService: AdminAuditService
  ) {}

  /**
   * Create a new abuse report (called by regular users)
   * Only stores metadata, never private content
   */
  async createAbuseReport(data: CreateAbuseReportData): Promise<AbuseReport> {
    const query = `
      INSERT INTO abuse_reports (
        reporter_id, reported_user_id, content_type, content_id, 
        reason, description, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'medium')
      RETURNING *
    `;

    const values = [
      data.reporter_id,
      data.reported_user_id,
      data.content_type,
      data.content_id,
      data.reason,
      data.description || null
    ];

    const result = await this.db.query(query, values);
    const report = result.rows[0];

    // Log the report creation (no private content)
    await this.auditService.createAuditLog(
      'system', // This is a user action, not admin
      'abuse_report_created',
      '0.0.0.0', // Will be set by the calling controller
      undefined,
      'abuse_report',
      report.id,
      {
        content_type: data.content_type,
        reason: data.reason,
        reported_user_id: data.reported_user_id
      }
    );

    return report;
  }

  /**
   * Create a resource report
   * Validates report reason and creates report with resource content type
   */
  async createResourceReport(
    reporterId: string,
    resourceId: string,
    reason: AbuseReport['reason'],
    description?: string
  ): Promise<AbuseReport> {
    // Validate report reason
    const validReasons: AbuseReport['reason'][] = [
      'spam', 'harassment', 'inappropriate_content', 'copyright_violation', 
      'hate_speech', 'violence', 'other'
    ];
    
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid report reason: ${reason}`);
    }

    // Get resource owner to set as reported_user_id
    const resourceQuery = 'SELECT user_id FROM resources WHERE id = $1';
    const resourceResult = await this.db.query(resourceQuery, [resourceId]);
    
    if (resourceResult.rows.length === 0) {
      throw new Error('Resource not found');
    }

    const reportedUserId = resourceResult.rows[0].user_id;

    return this.createAbuseReport({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      content_type: 'resource',
      content_id: resourceId,
      reason,
      description
    });
  }

  /**
   * Create a study group report
   * Validates group membership before allowing report submission
   */
  async createStudyGroupReport(
    reporterId: string,
    groupId: string,
    reason: AbuseReport['reason'],
    description?: string
  ): Promise<AbuseReport> {
    // Validate report reason
    const validReasons: AbuseReport['reason'][] = [
      'spam', 'harassment', 'inappropriate_content', 'copyright_violation', 
      'hate_speech', 'violence', 'other'
    ];
    
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid report reason: ${reason}`);
    }

    // Validate group membership
    const isMember = await this.validateGroupMembership(reporterId, groupId);
    if (!isMember) {
      throw new Error('Only group members can report a study group');
    }

    // Get group owner to set as reported_user_id
    const groupQuery = 'SELECT owner_id FROM study_groups WHERE id = $1';
    const groupResult = await this.db.query(groupQuery, [groupId]);
    
    if (groupResult.rows.length === 0) {
      throw new Error('Study group not found');
    }

    const reportedUserId = groupResult.rows[0].owner_id;

    return this.createAbuseReport({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      content_type: 'study_group',
      content_id: groupId,
      reason,
      description
    });
  }

  /**
   * Validate if a user is a member of a study group
   */
  async validateGroupMembership(userId: string, groupId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM group_members 
      WHERE user_id = $1 AND group_id = $2
    `;
    
    const result = await this.db.query(query, [userId, groupId]);
    return result.rows.length > 0;
  }

  /**
   * Get abuse reports for moderation queue
   * Returns only metadata, never private content
   */
  async getAbuseReports(filters: ModerationFilters = {}): Promise<{
    reports: AbuseReport[];
    total: number;
  }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (filters.status) {
      conditions.push(`ar.status = $${++paramCount}`);
      values.push(filters.status);
    }

    if (filters.priority) {
      conditions.push(`ar.priority = $${++paramCount}`);
      values.push(filters.priority);
    }

    if (filters.content_type) {
      conditions.push(`ar.content_type = $${++paramCount}`);
      values.push(filters.content_type);
    }

    if (filters.moderator_id) {
      conditions.push(`ar.moderator_id = $${++paramCount}`);
      values.push(filters.moderator_id);
    }

    if (filters.date_from) {
      conditions.push(`ar.created_at >= $${++paramCount}`);
      values.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`ar.created_at <= $${++paramCount}`);
      values.push(filters.date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM abuse_reports ar
      ${whereClause}
    `;

    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get reports with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT 
        ar.*,
        reporter.email as reporter_email,
        reported.email as reported_user_email,
        admin_users.email as moderator_email
      FROM abuse_reports ar
      LEFT JOIN users reporter ON ar.reporter_id = reporter.id
      LEFT JOIN users reported ON ar.reported_user_id = reported.id
      LEFT JOIN admin_users ON ar.moderator_id = admin_users.id
      ${whereClause}
      ORDER BY ar.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const queryValues = [...values, limit, offset];

    const result = await this.db.query(query, queryValues);

    return {
      reports: result.rows,
      total
    };
  }

  /**
   * Get a specific abuse report by ID
   */
  async getAbuseReportById(reportId: string): Promise<AbuseReport | null> {
    const query = `
      SELECT 
        ar.*,
        reporter.email as reporter_email,
        reported.email as reported_user_email,
        admin_users.email as moderator_email
      FROM abuse_reports ar
      LEFT JOIN users reporter ON ar.reporter_id = reporter.id
      LEFT JOIN users reported ON ar.reported_user_id = reported.id
      LEFT JOIN admin_users ON ar.moderator_id = admin_users.id
      WHERE ar.id = $1
    `;

    const result = await this.db.query(query, [reportId]);
    return result.rows[0] || null;
  }

  /**
   * Take moderation action on an abuse report
   * Maintains privacy by never accessing private content
   */
  async takeModerationAction(
    reportId: string,
    moderatorId: string,
    actionData: ModerationActionData,
    ipAddress: string,
    userAgent?: string
  ): Promise<AbuseReport> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get the abuse report
      const reportResult = await client.query(
        'SELECT * FROM abuse_reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        throw new Error('Abuse report not found');
      }

      const report = reportResult.rows[0];

      // Update the abuse report
      const updateQuery = `
        UPDATE abuse_reports 
        SET 
          status = $1,
          moderator_id = $2,
          action_taken = $3,
          moderator_notes = $4,
          resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      const status = actionData.action === 'dismiss' ? 'dismissed' : 
                    actionData.action === 'resolve' ? 'resolved' : 'under_review';

      const updateResult = await client.query(updateQuery, [
        status,
        moderatorId,
        actionData.action,
        actionData.notes || null,
        reportId
      ]);

      const updatedReport = updateResult.rows[0];

      // Create user violation record if action is taken against user
      if (['warn', 'suspend', 'ban'].includes(actionData.action)) {
        await this.createUserViolation(client, {
          user_id: report.reported_user_id,
          violation_type: report.reason,
          severity: this.getSeverityFromAction(actionData.action),
          description: actionData.reason,
          moderator_id: moderatorId,
          abuse_report_id: reportId,
          action_taken: actionData.action,
          duration_hours: actionData.duration_hours
        });
      }

      // Create suspension if needed
      if (['suspend', 'ban'].includes(actionData.action)) {
        await this.createUserSuspension(client, {
          user_id: report.reported_user_id,
          suspended_by: moderatorId,
          reason: actionData.reason,
          suspension_type: actionData.action === 'ban' ? 'permanent' : 'temporary',
          duration_hours: actionData.duration_hours
        });
      }

      // Log the moderation action
      await client.query(`
        INSERT INTO moderation_actions (
          moderator_id, action_type, target_user_id, target_content_type,
          target_content_id, abuse_report_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        moderatorId,
        `report_${actionData.action}`,
        report.reported_user_id,
        report.content_type,
        report.content_id,
        reportId,
        JSON.stringify({
          action: actionData.action,
          reason: actionData.reason,
          duration_hours: actionData.duration_hours
        }),
        ipAddress,
        userAgent
      ]);

      // Create audit log entry
      await this.auditService.createAuditLog(
        moderatorId,
        'moderation_action',
        ipAddress,
        userAgent,
        'abuse_report',
        reportId,
        {
          action: actionData.action,
          reported_user_id: report.reported_user_id,
          content_type: report.content_type,
          reason: actionData.reason
        }
      );

      await client.query('COMMIT');
      return updatedReport;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve a report and take action
   * Updates report status to resolved and executes moderation action
   */
  async approveReport(
    reportId: string,
    moderatorId: string,
    action: 'delete_content' | 'suspend_user' | 'warn_user',
    reason: string,
    ipAddress: string,
    userAgent?: string,
    durationHours?: number
  ): Promise<AbuseReport> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get the abuse report
      const reportResult = await client.query(
        'SELECT * FROM abuse_reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        throw new Error('Abuse report not found');
      }

      const report = reportResult.rows[0];

      // Validate status transition: only pending or under_review can be approved
      if (!['pending', 'under_review'].includes(report.status)) {
        throw new Error(`Cannot approve report with status: ${report.status}`);
      }

      // Update report status to resolved
      const updateQuery = `
        UPDATE abuse_reports 
        SET 
          status = 'resolved',
          moderator_id = $1,
          action_taken = $2,
          moderator_notes = $3,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        moderatorId,
        action,
        reason,
        reportId
      ]);

      const updatedReport = updateResult.rows[0];

      // Execute the appropriate action
      if (action === 'warn_user') {
        await this.createUserViolation(client, {
          user_id: report.reported_user_id,
          violation_type: report.reason,
          severity: 'warning',
          description: reason,
          moderator_id: moderatorId,
          abuse_report_id: reportId,
          action_taken: 'warn'
        });
      } else if (action === 'suspend_user') {
        await this.createUserViolation(client, {
          user_id: report.reported_user_id,
          violation_type: report.reason,
          severity: 'major',
          description: reason,
          moderator_id: moderatorId,
          abuse_report_id: reportId,
          action_taken: 'suspend',
          duration_hours: durationHours
        });

        await this.createUserSuspension(client, {
          user_id: report.reported_user_id,
          suspended_by: moderatorId,
          reason: reason,
          suspension_type: 'temporary',
          duration_hours: durationHours
        });
      }

      // Log the moderation action
      await client.query(`
        INSERT INTO moderation_actions (
          moderator_id, action_type, target_user_id, target_content_type,
          target_content_id, abuse_report_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        moderatorId,
        'report_approved',
        report.reported_user_id,
        report.content_type,
        report.content_id,
        reportId,
        JSON.stringify({
          action,
          reason,
          duration_hours: durationHours
        }),
        ipAddress,
        userAgent
      ]);

      // Create audit log entry
      await this.auditService.createAuditLog(
        moderatorId,
        'report_approved',
        ipAddress,
        userAgent,
        'abuse_report',
        reportId,
        {
          action,
          reported_user_id: report.reported_user_id,
          content_type: report.content_type,
          reason
        }
      );

      await client.query('COMMIT');
      return updatedReport;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Dismiss a report without taking action
   * Updates report status to dismissed
   */
  async dismissReport(
    reportId: string,
    moderatorId: string,
    reason: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<AbuseReport> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get the abuse report
      const reportResult = await client.query(
        'SELECT * FROM abuse_reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        throw new Error('Abuse report not found');
      }

      const report = reportResult.rows[0];

      // Validate status transition: only pending or under_review can be dismissed
      if (!['pending', 'under_review'].includes(report.status)) {
        throw new Error(`Cannot dismiss report with status: ${report.status}`);
      }

      // Update report status to dismissed
      const updateQuery = `
        UPDATE abuse_reports 
        SET 
          status = 'dismissed',
          moderator_id = $1,
          action_taken = 'dismiss',
          moderator_notes = $2,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        moderatorId,
        reason,
        reportId
      ]);

      const updatedReport = updateResult.rows[0];

      // Log the moderation action
      await client.query(`
        INSERT INTO moderation_actions (
          moderator_id, action_type, target_user_id, target_content_type,
          target_content_id, abuse_report_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        moderatorId,
        'report_dismissed',
        report.reported_user_id,
        report.content_type,
        report.content_id,
        reportId,
        JSON.stringify({ reason }),
        ipAddress,
        userAgent
      ]);

      // Create audit log entry
      await this.auditService.createAuditLog(
        moderatorId,
        'report_dismissed',
        ipAddress,
        userAgent,
        'abuse_report',
        reportId,
        {
          reported_user_id: report.reported_user_id,
          content_type: report.content_type,
          reason
        }
      );

      await client.query('COMMIT');
      return updatedReport;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user violation history (metadata only)
   */
  async getUserViolationHistory(userId: string): Promise<UserViolation[]> {
    const query = `
      SELECT 
        uv.*,
        au.email as moderator_email
      FROM user_violations uv
      LEFT JOIN admin_users au ON uv.moderator_id = au.id
      WHERE uv.user_id = $1
      ORDER BY uv.created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get user suspension status
   */
  async getUserSuspensionStatus(userId: string): Promise<UserSuspension | null> {
    const query = `
      SELECT 
        us.*,
        suspended_by_admin.email as suspended_by_email,
        lifted_by_admin.email as lifted_by_email
      FROM user_suspensions us
      LEFT JOIN admin_users suspended_by_admin ON us.suspended_by = suspended_by_admin.id
      LEFT JOIN admin_users lifted_by_admin ON us.lifted_by = lifted_by_admin.id
      WHERE us.user_id = $1 
      AND us.is_active = TRUE 
      AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Lift user suspension
   */
  async liftUserSuspension(
    userId: string,
    moderatorId: string,
    reason: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update active suspensions
      const updateResult = await client.query(`
        UPDATE user_suspensions 
        SET 
          is_active = FALSE,
          lifted_by = $1,
          lifted_at = CURRENT_TIMESTAMP,
          lift_reason = $2
        WHERE user_id = $3 
        AND is_active = TRUE
        RETURNING *
      `, [moderatorId, reason, userId]);

      if (updateResult.rows.length === 0) {
        throw new Error('No active suspension found for user');
      }

      // Log the action
      await client.query(`
        INSERT INTO moderation_actions (
          moderator_id, action_type, target_user_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        moderatorId,
        'suspension_lifted',
        userId,
        JSON.stringify({ reason }),
        ipAddress,
        userAgent
      ]);

      // Create audit log entry
      await this.auditService.createAuditLog(
        moderatorId,
        'user_suspension_lifted',
        ipAddress,
        userAgent,
        'user',
        userId,
        { reason }
      );

      // Get user details for email notification
      try {
        const userResult = await client.query(
          'SELECT email, name, preferred_language FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const locale = user.preferred_language || 'en';

          // Send unsuspension email notification
          await sendUnsuspensionEmail(
            user.email,
            user.name,
            reason,
            locale
          );

          logger.info('Unsuspension email sent to user', {
            userId,
            email: user.email
          });
        }
      } catch (emailError) {
        // Log error but don't fail the unsuspension
        logger.error('Failed to send unsuspension email', {
          userId,
          error: emailError
        });
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(dateFrom?: Date, dateTo?: Date): Promise<{
    total_reports: number;
    pending_reports: number;
    resolved_reports: number;
    dismissed_reports: number;
    active_suspensions: number;
    reports_by_type: Array<{ content_type: string; count: number }>;
    reports_by_reason: Array<{ reason: string; count: number }>;
  }> {
    const dateFilter = dateFrom && dateTo ? 
      'WHERE created_at >= $1 AND created_at <= $2' : '';
    const dateParams = dateFrom && dateTo ? [dateFrom, dateTo] : [];

    // Get basic stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_reports,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_reports,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed_reports
      FROM abuse_reports
      ${dateFilter}
    `;

    const statsResult = await this.db.query(statsQuery, dateParams);
    const stats = statsResult.rows[0];

    // Get active suspensions count
    const suspensionsResult = await this.db.query(`
      SELECT COUNT(*) as active_suspensions
      FROM user_suspensions
      WHERE is_active = TRUE 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `);

    // Get reports by content type
    const typeQuery = `
      SELECT content_type, COUNT(*) as count
      FROM abuse_reports
      ${dateFilter}
      GROUP BY content_type
      ORDER BY count DESC
    `;

    const typeResult = await this.db.query(typeQuery, dateParams);

    // Get reports by reason
    const reasonQuery = `
      SELECT reason, COUNT(*) as count
      FROM abuse_reports
      ${dateFilter}
      GROUP BY reason
      ORDER BY count DESC
    `;

    const reasonResult = await this.db.query(reasonQuery, dateParams);

    return {
      total_reports: parseInt(stats.total_reports),
      pending_reports: parseInt(stats.pending_reports),
      resolved_reports: parseInt(stats.resolved_reports),
      dismissed_reports: parseInt(stats.dismissed_reports),
      active_suspensions: parseInt(suspensionsResult.rows[0].active_suspensions),
      reports_by_type: typeResult.rows.map(row => ({
        content_type: row.content_type,
        count: parseInt(row.count)
      })),
      reports_by_reason: reasonResult.rows.map(row => ({
        reason: row.reason,
        count: parseInt(row.count)
      }))
    };
  }

  /**
   * Private helper methods
   */
  private async createUserViolation(client: any, data: {
    user_id: string;
    violation_type: string;
    severity: 'warning' | 'minor' | 'major' | 'severe';
    description: string;
    moderator_id: string;
    abuse_report_id?: string;
    action_taken: string;
    duration_hours?: number;
  }): Promise<void> {
    const expiresAt = data.duration_hours ? 
      new Date(Date.now() + data.duration_hours * 60 * 60 * 1000) : null;

    await client.query(`
      INSERT INTO user_violations (
        user_id, violation_type, severity, description, moderator_id,
        abuse_report_id, action_taken, duration_hours, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      data.user_id,
      data.violation_type,
      data.severity,
      data.description,
      data.moderator_id,
      data.abuse_report_id || null,
      data.action_taken,
      data.duration_hours || null,
      expiresAt
    ]);
  }

  private async createUserSuspension(client: any, data: {
    user_id: string;
    suspended_by: string;
    reason: string;
    suspension_type: 'temporary' | 'permanent';
    duration_hours?: number;
  }): Promise<void> {
    const expiresAt = data.suspension_type === 'temporary' && data.duration_hours ? 
      new Date(Date.now() + data.duration_hours * 60 * 60 * 1000) : null;

    await client.query(`
      INSERT INTO user_suspensions (
        user_id, suspended_by, reason, suspension_type, expires_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      data.user_id,
      data.suspended_by,
      data.reason,
      data.suspension_type,
      expiresAt
    ]);

    // Get user details for email notification
    try {
      const userResult = await client.query(
        'SELECT email, name, preferred_language FROM users WHERE id = $1',
        [data.user_id]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const locale = user.preferred_language || 'en';

        // Send suspension email notification
        await sendSuspensionEmail(
          user.email,
          user.name,
          data.reason,
          data.suspension_type,
          expiresAt || undefined,
          locale
        );

        logger.info('Suspension email sent to user', {
          userId: data.user_id,
          email: user.email,
          suspensionType: data.suspension_type
        });
      }
    } catch (emailError) {
      // Log error but don't fail the suspension
      logger.error('Failed to send suspension email', {
        userId: data.user_id,
        error: emailError
      });
    }
  }

  private getSeverityFromAction(action: string): 'warning' | 'minor' | 'major' | 'severe' {
    switch (action) {
      case 'warn': return 'warning';
      case 'suspend': return 'major';
      case 'ban': return 'severe';
      default: return 'minor';
    }
  }
}