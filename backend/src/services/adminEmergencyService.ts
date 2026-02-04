import { query, getClient } from '../db/connection';
import logger from '../utils/logger';
import nodemailer from 'nodemailer';
import config from '../config';
import adminAuditService from './adminAuditService';

export interface EmergencyLockdown {
  id: string;
  enabled: boolean;
  reason: string;
  duration_hours?: number;
  enabled_by: string;
  enabled_at: Date;
  expires_at?: Date;
  disabled_at?: Date;
  disabled_by?: string;
}

export interface BackupRestoration {
  id: string;
  backup_id: string;
  backup_timestamp: Date;
  restoration_type: 'full' | 'partial' | 'database' | 'files';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  initiated_by: string;
  initiated_at: Date;
  completed_at?: Date;
  error_message?: string;
  integrity_verified: boolean;
}

export interface IncidentReport {
  id: string;
  incident_type: 'data_breach' | 'security_incident' | 'system_failure' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_users_count?: number;
  affected_data_types?: string[];
  breach_scope?: string;
  status: 'reported' | 'investigating' | 'contained' | 'resolved';
  reported_by: string;
  reported_at: Date;
  resolved_at?: Date;
  resolution_notes?: string;
}

export class AdminEmergencyService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  /**
   * Task 7.1: Create emergency lockdown system
   * Enable immediate user access restriction while preserving admin access
   */
  async enableEmergencyLockdown(
    reason: string,
    durationHours: number | undefined,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<EmergencyLockdown> {
    const client = await getClient();

    try {
      // Validate inputs
      if (!reason || reason.trim().length === 0) {
        throw new Error('Lockdown reason is required');
      }

      if (!adminId || adminId === '00000000-0000-0000-0000-000000000000' || adminId === '00000000-0000-1000-8000-000000000000') {
        throw new Error('Valid admin ID is required');
      }

      if (!ipAddress || ipAddress === '0.0.0.0') {
        throw new Error('Valid IP address is required');
      }

      if (durationHours !== undefined && durationHours <= 0) {
        throw new Error('Duration must be positive');
      }

      await client.query('BEGIN');

      // Calculate expiration if duration provided
      const expiresAt = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : undefined;

      // Create lockdown record
      const result = await client.query(
        `INSERT INTO emergency_lockdowns (reason, duration_hours, enabled_by, expires_at, enabled_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING id, enabled, reason, duration_hours, enabled_by, enabled_at, expires_at`,
        [reason, durationHours, adminId, expiresAt]
      );

      const lockdown = result.rows[0];

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'emergency_lockdown_enabled',
        ipAddress,
        userAgent,
        'system',
        lockdown.id,
        {
          reason,
          duration_hours: durationHours,
          expires_at: expiresAt
        }
      );

      // Notify all platform owners
      await this.notifyPlatformOwners(
        'Emergency Lockdown Activated',
        'critical',
        `Emergency lockdown has been activated by admin ${adminId}.\n\nReason: ${reason}\n\nDuration: ${durationHours ? `${durationHours} hours` : 'Indefinite'}\n\nUser access has been restricted. Admin access is preserved.`,
        { lockdown_id: lockdown.id, reason, duration_hours: durationHours, enabled_by: adminId }
      );

      await client.query('COMMIT');

      logger.warn('Emergency lockdown enabled', {
        lockdownId: lockdown.id,
        reason,
        durationHours,
        adminId
      });

      return {
        id: lockdown.id,
        enabled: true,
        reason: lockdown.reason,
        duration_hours: lockdown.duration_hours,
        enabled_by: lockdown.enabled_by,
        enabled_at: lockdown.enabled_at,
        expires_at: lockdown.expires_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to enable emergency lockdown', { reason, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Disable emergency lockdown
   */
  async disableEmergencyLockdown(
    lockdownId: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update lockdown record
      await client.query(
        `UPDATE emergency_lockdowns
         SET enabled = false, disabled_at = CURRENT_TIMESTAMP, disabled_by = $1
         WHERE id = $2`,
        [adminId, lockdownId]
      );

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'emergency_lockdown_disabled',
        ipAddress,
        userAgent,
        'system',
        lockdownId,
        { disabled_by: adminId }
      );

      // Notify platform owners
      await this.notifyPlatformOwners(
        'Emergency Lockdown Deactivated',
        'high',
        `Emergency lockdown has been deactivated by admin ${adminId}.\n\nNormal user access has been restored.`,
        { lockdown_id: lockdownId, disabled_by: adminId }
      );

      await client.query('COMMIT');

      logger.info('Emergency lockdown disabled', { lockdownId, adminId });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to disable emergency lockdown', { lockdownId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if emergency lockdown is active
   */
  async isLockdownActive(): Promise<boolean> {
    try {
      const result = await query(
        `SELECT id FROM emergency_lockdowns
         WHERE enabled = true
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         LIMIT 1`
      );

      return result.rows.length > 0;

    } catch (error) {
      logger.error('Failed to check lockdown status', { error });
      return false;
    }
  }

  /**
   * Get active lockdown details
   */
  async getActiveLockdown(): Promise<EmergencyLockdown | null> {
    try {
      const result = await query(
        `SELECT id, enabled, reason, duration_hours, enabled_by, enabled_at, expires_at
         FROM emergency_lockdowns
         WHERE enabled = true
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         ORDER BY enabled_at DESC
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        enabled: row.enabled,
        reason: row.reason,
        duration_hours: row.duration_hours,
        enabled_by: row.enabled_by,
        enabled_at: row.enabled_at,
        expires_at: row.expires_at
      };

    } catch (error) {
      logger.error('Failed to get active lockdown', { error });
      return null;
    }
  }

  /**
   * Task 7.2: Implement backup and recovery tools
   * Create emergency backup restoration interface with integrity verification
   */
  async initiateBackupRestoration(
    backupId: string,
    backupTimestamp: Date,
    restorationType: 'full' | 'partial' | 'database' | 'files',
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<BackupRestoration> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Create restoration record
      const result = await client.query(
        `INSERT INTO backup_restorations 
         (backup_id, backup_timestamp, restoration_type, status, initiated_by, initiated_at, integrity_verified)
         VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP, false)
         RETURNING id, backup_id, backup_timestamp, restoration_type, status, initiated_by, initiated_at, integrity_verified`,
        [backupId, backupTimestamp, restorationType, adminId]
      );

      const restoration = result.rows[0];

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'backup_restoration_initiated',
        ipAddress,
        userAgent,
        'backup',
        restoration.id,
        {
          backup_id: backupId,
          backup_timestamp: backupTimestamp,
          restoration_type: restorationType
        }
      );

      // Notify platform owners
      await this.notifyPlatformOwners(
        'Backup Restoration Initiated',
        'critical',
        `Backup restoration has been initiated by admin ${adminId}.\n\nBackup ID: ${backupId}\nType: ${restorationType}\nBackup Timestamp: ${backupTimestamp.toISOString()}\n\nPlease monitor the restoration progress.`,
        { restoration_id: restoration.id, backup_id: backupId, restoration_type: restorationType }
      );

      await client.query('COMMIT');

      logger.warn('Backup restoration initiated', {
        restorationId: restoration.id,
        backupId,
        restorationType,
        adminId
      });

      return {
        id: restoration.id,
        backup_id: restoration.backup_id,
        backup_timestamp: restoration.backup_timestamp,
        restoration_type: restoration.restoration_type,
        status: restoration.status,
        initiated_by: restoration.initiated_by,
        initiated_at: restoration.initiated_at,
        integrity_verified: restoration.integrity_verified
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initiate backup restoration', { backupId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackupIntegrity(
    restorationId: string,
    checksumValid: boolean,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update restoration record
      await client.query(
        `UPDATE backup_restorations
         SET integrity_verified = $1
         WHERE id = $2`,
        [checksumValid, restorationId]
      );

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'backup_integrity_verified',
        ipAddress,
        userAgent,
        'backup',
        restorationId,
        { checksum_valid: checksumValid }
      );

      await client.query('COMMIT');

      logger.info('Backup integrity verified', { restorationId, checksumValid, adminId });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to verify backup integrity', { restorationId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update restoration status
   */
  async updateRestorationStatus(
    restorationId: string,
    status: 'in_progress' | 'completed' | 'failed',
    errorMessage?: string,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update restoration record
      const updateQuery = status === 'completed' || status === 'failed'
        ? `UPDATE backup_restorations
           SET status = $1, completed_at = CURRENT_TIMESTAMP, error_message = $2
           WHERE id = $3`
        : `UPDATE backup_restorations
           SET status = $1, error_message = $2
           WHERE id = $3`;

      await client.query(updateQuery, [status, errorMessage, restorationId]);

      // Create audit log if admin provided
      if (adminId && ipAddress) {
        await adminAuditService.createAuditLog(
          adminId,
          'backup_restoration_status_updated',
          ipAddress,
          userAgent,
          'backup',
          restorationId,
          { status, error_message: errorMessage }
        );
      }

      // Notify platform owners on completion or failure
      if (status === 'completed' || status === 'failed') {
        await this.notifyPlatformOwners(
          `Backup Restoration ${status === 'completed' ? 'Completed' : 'Failed'}`,
          status === 'completed' ? 'high' : 'critical',
          `Backup restoration ${restorationId} has ${status}.\n\n${errorMessage ? `Error: ${errorMessage}` : 'Restoration completed successfully.'}`,
          { restoration_id: restorationId, status, error_message: errorMessage }
        );
      }

      await client.query('COMMIT');

      logger.info('Restoration status updated', { restorationId, status, errorMessage });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update restoration status', { restorationId, status, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get restoration status
   */
  async getRestorationStatus(restorationId: string): Promise<BackupRestoration | null> {
    try {
      const result = await query(
        `SELECT id, backup_id, backup_timestamp, restoration_type, status, initiated_by, 
                initiated_at, completed_at, error_message, integrity_verified
         FROM backup_restorations
         WHERE id = $1`,
        [restorationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        backup_id: row.backup_id,
        backup_timestamp: row.backup_timestamp,
        restoration_type: row.restoration_type,
        status: row.status,
        initiated_by: row.initiated_by,
        initiated_at: row.initiated_at,
        completed_at: row.completed_at,
        error_message: row.error_message,
        integrity_verified: row.integrity_verified
      };

    } catch (error) {
      logger.error('Failed to get restoration status', { restorationId, error });
      return null;
    }
  }

  /**
   * Task 7.3: Create incident response tools
   * Implement data breach response workflow with metadata-only user identification
   */
  async reportIncident(
    incidentType: 'data_breach' | 'security_incident' | 'system_failure' | 'unauthorized_access',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    affectedUsersCount: number | undefined,
    affectedDataTypes: string[] | undefined,
    breachScope: string | undefined,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<IncidentReport> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Create incident report
      const result = await client.query(
        `INSERT INTO incident_reports 
         (incident_type, severity, description, affected_users_count, affected_data_types, 
          breach_scope, status, reported_by, reported_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'reported', $7, CURRENT_TIMESTAMP)
         RETURNING id, incident_type, severity, description, affected_users_count, 
                   affected_data_types, breach_scope, status, reported_by, reported_at`,
        [incidentType, severity, description, affectedUsersCount, affectedDataTypes, breachScope, adminId]
      );

      const incident = result.rows[0];

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'incident_reported',
        ipAddress,
        userAgent,
        'incident',
        incident.id,
        {
          incident_type: incidentType,
          severity,
          description,
          affected_users_count: affectedUsersCount,
          affected_data_types: affectedDataTypes,
          breach_scope: breachScope
        }
      );

      // Notify platform owners immediately
      await this.notifyPlatformOwners(
        `${severity.toUpperCase()} Incident Reported: ${incidentType}`,
        severity as 'low' | 'medium' | 'high' | 'critical',
        `A ${severity} severity incident has been reported by admin ${adminId}.\n\nType: ${incidentType}\nDescription: ${description}\n\n${affectedUsersCount ? `Affected Users: ${affectedUsersCount}\n` : ''}${affectedDataTypes ? `Affected Data Types: ${affectedDataTypes.join(', ')}\n` : ''}${breachScope ? `Breach Scope: ${breachScope}\n` : ''}\n\nImmediate action may be required.`,
        {
          incident_id: incident.id,
          incident_type: incidentType,
          severity,
          affected_users_count: affectedUsersCount,
          reported_by: adminId
        }
      );

      await client.query('COMMIT');

      logger.warn('Incident reported', {
        incidentId: incident.id,
        incidentType,
        severity,
        affectedUsersCount,
        adminId
      });

      return {
        id: incident.id,
        incident_type: incident.incident_type,
        severity: incident.severity,
        description: incident.description,
        affected_users_count: incident.affected_users_count,
        affected_data_types: incident.affected_data_types,
        breach_scope: incident.breach_scope,
        status: incident.status,
        reported_by: incident.reported_by,
        reported_at: incident.reported_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to report incident', { incidentType, severity, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string,
    status: 'investigating' | 'contained' | 'resolved',
    resolutionNotes: string | undefined,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update incident record
      const updateQuery = status === 'resolved'
        ? `UPDATE incident_reports
           SET status = $1, resolved_at = CURRENT_TIMESTAMP, resolution_notes = $2
           WHERE id = $3`
        : `UPDATE incident_reports
           SET status = $1, resolution_notes = $2
           WHERE id = $3`;

      await client.query(updateQuery, [status, resolutionNotes, incidentId]);

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'incident_status_updated',
        ipAddress,
        userAgent,
        'incident',
        incidentId,
        { status, resolution_notes: resolutionNotes }
      );

      // Notify platform owners on resolution
      if (status === 'resolved') {
        await this.notifyPlatformOwners(
          'Incident Resolved',
          'medium',
          `Incident ${incidentId} has been resolved by admin ${adminId}.\n\n${resolutionNotes ? `Resolution Notes: ${resolutionNotes}` : ''}`,
          { incident_id: incidentId, status, resolved_by: adminId }
        );
      }

      await client.query('COMMIT');

      logger.info('Incident status updated', { incidentId, status, adminId });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update incident status', { incidentId, status, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get incident details
   */
  async getIncident(incidentId: string): Promise<IncidentReport | null> {
    try {
      const result = await query(
        `SELECT id, incident_type, severity, description, affected_users_count, 
                affected_data_types, breach_scope, status, reported_by, reported_at, 
                resolved_at, resolution_notes
         FROM incident_reports
         WHERE id = $1`,
        [incidentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        incident_type: row.incident_type,
        severity: row.severity,
        description: row.description,
        affected_users_count: row.affected_users_count,
        affected_data_types: row.affected_data_types,
        breach_scope: row.breach_scope,
        status: row.status,
        reported_by: row.reported_by,
        reported_at: row.reported_at,
        resolved_at: row.resolved_at,
        resolution_notes: row.resolution_notes
      };

    } catch (error) {
      logger.error('Failed to get incident', { incidentId, error });
      return null;
    }
  }

  /**
   * Get all incidents with filtering
   */
  async getIncidents(
    page: number = 1,
    limit: number = 20,
    filters: {
      incidentType?: string;
      severity?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ incidents: IncidentReport[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.incidentType) {
        whereClause += ` AND incident_type = $${paramIndex}`;
        params.push(filters.incidentType);
        paramIndex++;
      }

      if (filters.severity) {
        whereClause += ` AND severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.startDate) {
        whereClause += ` AND reported_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        whereClause += ` AND reported_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM incident_reports ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get paginated incidents
      const offset = (page - 1) * limit;
      const incidentsResult = await query(
        `SELECT * FROM incident_reports ${whereClause}
         ORDER BY reported_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      return {
        incidents: incidentsResult.rows,
        total
      };

    } catch (error) {
      logger.error('Failed to get incidents', { filters, error });
      throw error;
    }
  }

  /**
   * Identify affected users (metadata only - no private content)
   */
  async identifyAffectedUsers(
    incidentId: string,
    criteria: {
      dateRange?: { start: Date; end: Date };
      dataTypes?: string[];
      userIds?: string[];
    }
  ): Promise<{ user_id: string; email: string; registration_date: Date; last_login?: Date }[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (criteria.dateRange) {
        whereClause += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(criteria.dateRange.start, criteria.dateRange.end);
        paramIndex += 2;
      }

      if (criteria.userIds && criteria.userIds.length > 0) {
        whereClause += ` AND id = ANY($${paramIndex}::uuid[])`;
        params.push(criteria.userIds);
        paramIndex++;
      }

      // Query only metadata - no private content
      const result = await query(
        `SELECT id as user_id, email, created_at as registration_date, last_login
         FROM users
         ${whereClause}
         ORDER BY created_at DESC`,
        params
      );

      logger.info('Affected users identified (metadata only)', {
        incidentId,
        affectedCount: result.rows.length
      });

      return result.rows;

    } catch (error) {
      logger.error('Failed to identify affected users', { incidentId, error });
      throw error;
    }
  }

  /**
   * Notify platform owners about emergency events
   */
  private async notifyPlatformOwners(
    subject: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details: any
  ): Promise<void> {
    try {
      // Get all platform owners
      const ownersResult = await query(
        "SELECT email FROM admin_users WHERE role = 'owner' AND account_locked = false"
      );

      const ownerEmails = ownersResult.rows.map(row => row.email);

      if (ownerEmails.length === 0) {
        logger.warn('No platform owners found to send emergency notification');
        return;
      }

      const severityColor = this.getSeverityColor(severity);

      const mailOptions = {
        from: config.email.from,
        to: ownerEmails,
        subject: `[EMERGENCY] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${severityColor}; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">🚨 Emergency Alert</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px;">${severity.toUpperCase()} SEVERITY</p>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #333; margin-top: 0;">${subject}</h2>
              <p style="white-space: pre-line;">${message}</p>
              
              <h3 style="color: #333;">Additional Details</h3>
              <pre style="background-color: #fff; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(details, null, 2)}
              </pre>
              
              <div style="margin-top: 30px; padding: 15px; background-color: #dc3545; color: white; border-radius: 4px;">
                <p style="margin: 0;">
                  <strong>⚠️ IMMEDIATE ACTION REQUIRED</strong><br/>
                  Please log into the admin dashboard immediately to review and respond to this emergency situation.
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated emergency alert from the Elevare Admin Dashboard.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);

      logger.info('Emergency notification sent to platform owners', {
        subject,
        severity,
        recipients: ownerEmails.length
      });

    } catch (error) {
      logger.error('Failed to send emergency notification', { subject, severity, error });
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    const colorMap: Record<string, string> = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    return colorMap[severity] || '#6c757d';
  }
}

export default new AdminEmergencyService();
