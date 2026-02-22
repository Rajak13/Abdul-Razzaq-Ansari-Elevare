import crypto from 'crypto';
import { query, getClient } from '../db/connection';
import logger from '../utils/logger';

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action_type: string;
  target_entity?: string;
  target_id?: string;
  details?: any;
  ip_address: string;
  user_agent?: string;
  timestamp: Date;
  hash: string;
}

export interface AuditLogFilter {
  adminId?: string;
  actionType?: string;
  targetEntity?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogSearchResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface AuditRetentionPolicy {
  retentionDays: number;
  archiveAfterDays: number;
  compressionEnabled: boolean;
}

export class AdminAuditService {
  private readonly DEFAULT_RETENTION_DAYS = 2555; // 7 years for compliance
  private readonly DEFAULT_ARCHIVE_DAYS = 365; // Archive after 1 year
  private readonly MAX_SEARCH_RESULTS = 1000;

  /**
   * Create an immutable audit log entry
   */
  async createAuditLog(
    adminId: string,
    actionType: string,
    ipAddress: string,
    userAgent?: string,
    targetEntity?: string,
    targetId?: string,
    details?: any
  ): Promise<string> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const timestamp = new Date();
      const hash = this.generateAuditHash(
        adminId,
        actionType,
        targetEntity,
        targetId,
        details,
        ipAddress,
        timestamp
      );

      // Create audit log entry with explicit hash and timestamp
      const result = await client.query(
        `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_id, details, ip_address, user_agent, timestamp, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [adminId, actionType, targetEntity, targetId, JSON.stringify(details), ipAddress, userAgent, timestamp, hash]
      );

      const auditId = result.rows[0].id;

      await client.query('COMMIT');

      logger.debug('Audit log entry created', {
        auditId,
        adminId,
        actionType,
        targetEntity,
        targetId,
        hash
      });

      return auditId;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create audit log entry', {
        adminId,
        actionType,
        targetEntity,
        targetId,
        error
      });
      // Don't throw error to prevent blocking main action if audit fails
      // throw new Error('Failed to create audit log entry');
      return '';
    } finally {
      client.release();
    }
  }

  /**
   * Search and filter audit log entries
   */
  /**
     * Search and filter audit log entries
     */
    async searchAuditLogs(filter: AuditLogFilter): Promise<AuditLogSearchResult> {
      try {
        const limit = Math.min(filter.limit || 50, this.MAX_SEARCH_RESULTS);
        const offset = filter.offset || 0;

        // Build dynamic query
        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filter.adminId) {
          whereClause += ` AND al.admin_id = $${paramIndex}`;
          params.push(filter.adminId);
          paramIndex++;
        }

        if (filter.actionType) {
          whereClause += ` AND al.action_type = $${paramIndex}`;
          params.push(filter.actionType);
          paramIndex++;
        }

        if (filter.targetEntity) {
          whereClause += ` AND al.target_entity = $${paramIndex}`;
          params.push(filter.targetEntity);
          paramIndex++;
        }

        if (filter.startDate) {
          whereClause += ` AND al.timestamp >= $${paramIndex}`;
          params.push(filter.startDate);
          paramIndex++;
        }

        if (filter.endDate) {
          whereClause += ` AND al.timestamp <= $${paramIndex}`;
          params.push(filter.endDate);
          paramIndex++;
        }

        if (filter.ipAddress) {
          whereClause += ` AND al.ip_address = $${paramIndex}`;
          params.push(filter.ipAddress);
          paramIndex++;
        }

        // Get total count
        const countQuery = `
          SELECT COUNT(*) as total
          FROM audit_logs al
          ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated results with admin email
        const searchQuery = `
          SELECT 
            al.id, al.admin_id, al.action_type, al.target_entity, al.target_id, 
            al.details, al.ip_address, al.user_agent, al.timestamp, al.hash,
            au.email as admin_email, au.role as admin_role
          FROM audit_logs al
          LEFT JOIN admin_users au ON al.admin_id = au.id
          ${whereClause}
          ORDER BY al.timestamp DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const result = await query(searchQuery, params);

        const entries: AuditLogEntry[] = result.rows.map(row => ({
          id: row.id,
          admin_id: row.admin_id,
          action_type: row.action_type,
          target_entity: row.target_entity,
          target_id: row.target_id,
          details: row.details,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          timestamp: row.timestamp,
          hash: row.hash,
          admin_email: row.admin_email,
          admin_role: row.admin_role
        } as any));

        const hasMore = offset + limit < total;

        logger.debug('Audit log search completed', {
          filter,
          resultCount: entries.length,
          total,
          hasMore
        });

        return {
          entries,
          total,
          hasMore
        };

      } catch (error) {
        logger.error('Failed to search audit logs', { filter, error });
        throw new Error('Failed to search audit logs');
      }
    }

  /**
   * Get audit log entry by ID with integrity verification
   */
  async getAuditLogById(auditId: string): Promise<AuditLogEntry | null> {
    try {
      const result = await query(
        `SELECT 
          id, admin_id, action_type, target_entity, target_id, 
          details, ip_address, user_agent, timestamp, hash
         FROM audit_logs
         WHERE id = $1`,
        [auditId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const entry = result.rows[0];

      // Verify integrity hash
      const isValid = await this.verifyAuditLogIntegrity(entry);
      if (!isValid) {
        logger.error('Audit log integrity verification failed', { auditId });
        throw new Error('Audit log integrity compromised');
      }

      return {
        id: entry.id,
        admin_id: entry.admin_id,
        action_type: entry.action_type,
        target_entity: entry.target_entity,
        target_id: entry.target_id,
        details: entry.details,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        timestamp: entry.timestamp,
        hash: entry.hash
      };

    } catch (error) {
      logger.error('Failed to get audit log entry', { auditId, error });
      throw error;
    }
  }

  /**
   * Verify audit log integrity using cryptographic hash
   */
  async verifyAuditLogIntegrity(entry: any): Promise<boolean> {
    try {
      // Recreate hash using the same algorithm as the database function
      const expectedHash = this.generateAuditHash(
        entry.admin_id,
        entry.action_type,
        entry.target_entity,
        entry.target_id,
        entry.details,
        entry.ip_address,
        entry.timestamp
      );

      return entry.hash === expectedHash;

    } catch (error) {
      logger.error('Failed to verify audit log integrity', { entryId: entry.id, error });
      return false;
    }
  }

  /**
   * Generate audit hash (matches database function)
   */
  private generateAuditHash(
    adminId: string,
    actionType: string,
    targetEntity?: string,
    targetId?: string,
    details?: any,
    ipAddress?: string,
    timestamp?: Date
  ): string {
    const data = [
      adminId || '',
      actionType || '',
      targetEntity || '',
      targetId || '',
      details ? JSON.stringify(details) : '',
      ipAddress || '',
      timestamp ? timestamp.toISOString() : ''
    ].join('');

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(days: number = 30): Promise<{
    totalEntries: number;
    entriesByAction: { action_type: string; count: number }[];
    entriesByAdmin: { admin_id: string; count: number }[];
    entriesByDay: { date: string; count: number }[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Total entries
      const totalResult = await query(
        'SELECT COUNT(*) as total FROM audit_logs WHERE timestamp >= $1',
        [startDate]
      );

      // Entries by action type
      const actionResult = await query(
        `SELECT action_type, COUNT(*) as count
         FROM audit_logs
         WHERE timestamp >= $1
         GROUP BY action_type
         ORDER BY count DESC
         LIMIT 10`,
        [startDate]
      );

      // Entries by admin
      const adminResult = await query(
        `SELECT admin_id, COUNT(*) as count
         FROM audit_logs
         WHERE timestamp >= $1
         GROUP BY admin_id
         ORDER BY count DESC
         LIMIT 10`,
        [startDate]
      );

      // Entries by day
      const dailyResult = await query(
        `SELECT DATE(timestamp) as date, COUNT(*) as count
         FROM audit_logs
         WHERE timestamp >= $1
         GROUP BY DATE(timestamp)
         ORDER BY date DESC`,
        [startDate]
      );

      return {
        totalEntries: parseInt(totalResult.rows[0].total),
        entriesByAction: actionResult.rows.map(row => ({
          action_type: row.action_type,
          count: parseInt(row.count)
        })),
        entriesByAdmin: adminResult.rows.map(row => ({
          admin_id: row.admin_id,
          count: parseInt(row.count)
        })),
        entriesByDay: dailyResult.rows.map(row => ({
          date: row.date,
          count: parseInt(row.count)
        }))
      };

    } catch (error) {
      logger.error('Failed to get audit statistics', { days, error });
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Archive old audit logs based on retention policy
   */
  async archiveOldAuditLogs(policy?: AuditRetentionPolicy): Promise<{
    archivedCount: number;
    deletedCount: number;
  }> {
    const retentionPolicy = policy || {
      retentionDays: this.DEFAULT_RETENTION_DAYS,
      archiveAfterDays: this.DEFAULT_ARCHIVE_DAYS,
      compressionEnabled: true
    };

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - retentionPolicy.archiveAfterDays);

      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - retentionPolicy.retentionDays);

      // Archive logs older than archive date but newer than delete date
      const archiveResult = await client.query(
        `UPDATE audit_logs 
         SET details = jsonb_set(COALESCE(details, '{}'), '{archived}', 'true')
         WHERE timestamp < $1 AND timestamp >= $2 
         AND (details->>'archived' IS NULL OR details->>'archived' != 'true')`,
        [archiveDate, deleteDate]
      );

      // Delete logs older than retention period
      const deleteResult = await client.query(
        'DELETE FROM audit_logs WHERE timestamp < $1',
        [deleteDate]
      );

      await client.query('COMMIT');

      const archivedCount = archiveResult.rowCount || 0;
      const deletedCount = deleteResult.rowCount || 0;

      logger.info('Audit log archival completed', {
        archivedCount,
        deletedCount,
        archiveDate,
        deleteDate,
        policy: retentionPolicy
      });

      return { archivedCount, deletedCount };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to archive audit logs', { policy: retentionPolicy, error });
      throw new Error('Failed to archive audit logs');
    } finally {
      client.release();
    }
  }

  /**
   * Export audit logs for compliance reporting
   */
  async exportAuditLogs(
    filter: AuditLogFilter,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    try {
      // Get all matching audit logs (no pagination for export)
      const exportFilter = { ...filter, limit: undefined, offset: undefined };
      const result = await this.searchAuditLogs(exportFilter);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'csv') {
        const csvData = this.convertToCSV(result.entries);
        return {
          data: csvData,
          filename: `audit-logs-${timestamp}.csv`,
          mimeType: 'text/csv'
        };
      } else {
        const jsonData = JSON.stringify({
          exportDate: new Date().toISOString(),
          filter,
          totalEntries: result.total,
          entries: result.entries
        }, null, 2);

        return {
          data: jsonData,
          filename: `audit-logs-${timestamp}.json`,
          mimeType: 'application/json'
        };
      }

    } catch (error) {
      logger.error('Failed to export audit logs', { filter, format, error });
      throw new Error('Failed to export audit logs');
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(entries: AuditLogEntry[]): string {
    const headers = [
      'ID',
      'Admin ID',
      'Action Type',
      'Target Entity',
      'Target ID',
      'IP Address',
      'User Agent',
      'Timestamp',
      'Hash',
      'Details'
    ];

    const csvRows = [headers.join(',')];

    for (const entry of entries) {
      const row = [
        entry.id,
        entry.admin_id,
        entry.action_type,
        entry.target_entity || '',
        entry.target_id || '',
        entry.ip_address,
        entry.user_agent || '',
        entry.timestamp.toISOString(),
        entry.hash,
        entry.details ? JSON.stringify(entry.details).replace(/"/g, '""') : ''
      ];

      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Verify audit trail completeness for a time period
   */
  async verifyAuditTrailCompleteness(
    startDate: Date,
    endDate: Date
  ): Promise<{
    isComplete: boolean;
    missingPeriods: { start: Date; end: Date }[];
    totalEntries: number;
    integrityIssues: string[];
  }> {
    try {
      // Get all audit logs in the period
      const result = await query(
        `SELECT id, timestamp, hash, admin_id, action_type, target_entity, target_id, details, ip_address
         FROM audit_logs
         WHERE timestamp >= $1 AND timestamp <= $2
         ORDER BY timestamp ASC`,
        [startDate, endDate]
      );

      const entries = result.rows;
      const totalEntries = entries.length;
      const integrityIssues: string[] = [];
      const missingPeriods: { start: Date; end: Date }[] = [];

      // Verify integrity of each entry
      for (const entry of entries) {
        const isValid = await this.verifyAuditLogIntegrity(entry);
        if (!isValid) {
          integrityIssues.push(`Entry ${entry.id} at ${entry.timestamp} has invalid hash`);
        }
      }

      // Check for gaps in audit trail (simplified - could be more sophisticated)
      if (entries.length > 1) {
        for (let i = 1; i < entries.length; i++) {
          const prevTime = new Date(entries[i - 1].timestamp);
          const currTime = new Date(entries[i].timestamp);
          const timeDiff = currTime.getTime() - prevTime.getTime();

          // If gap is more than 1 hour, flag as potential missing period
          if (timeDiff > 3600000) {
            missingPeriods.push({
              start: prevTime,
              end: currTime
            });
          }
        }
      }

      const isComplete = integrityIssues.length === 0 && missingPeriods.length === 0;

      logger.info('Audit trail completeness verification completed', {
        startDate,
        endDate,
        totalEntries,
        isComplete,
        integrityIssuesCount: integrityIssues.length,
        missingPeriodsCount: missingPeriods.length
      });

      return {
        isComplete,
        missingPeriods,
        totalEntries,
        integrityIssues
      };

    } catch (error) {
      logger.error('Failed to verify audit trail completeness', { startDate, endDate, error });
      throw new Error('Failed to verify audit trail completeness');
    }
  }
}

export default new AdminAuditService();