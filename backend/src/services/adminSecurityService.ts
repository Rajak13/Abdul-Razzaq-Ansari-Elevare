import { query } from '../db/connection';
import logger from '../utils/logger';
import nodemailer from 'nodemailer';
import config from '../config';

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source_ip: string;
  user_agent?: string;
  admin_id?: string;
  details: any;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: Date;
  created_at: Date;
}

export interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
}

export interface SuspiciousActivityPattern {
  pattern_type: string;
  description: string;
  threshold_exceeded: boolean;
  current_count: number;
  threshold: number;
  time_window: string;
}

// Types matching design document requirements
export interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  last_activity: Date;
  is_admin: boolean;
}

export interface SecurityLog {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address: string;
  details: Record<string, any>;
  created_at: Date;
}

export interface ThreatIndicator {
  type: string;
  severity: string;
  count: number;
  last_occurrence: Date;
}

export class AdminSecurityService {
  private transporter: nodemailer.Transporter;
  private alertThresholds = {
    failed_login_attempts: 5,
    rate_limit_violations: 10,
    suspicious_ip_requests: 20,
    concurrent_sessions: 3,
    privilege_escalation_attempts: 1
  };

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  /**
   * Log security event and trigger alerts if necessary
   */
  async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    sourceIp: string,
    userAgent: string,
    adminId?: string,
    details?: any
  ): Promise<string> {
    try {
      // Insert security event
      const result = await query(
        `INSERT INTO security_events (event_type, severity, source_ip, user_agent, admin_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING id`,
        [eventType, severity, sourceIp, userAgent, adminId, JSON.stringify(details)]
      );

      const eventId = result.rows[0].id;

      logger.info('Security event logged', {
        eventId,
        eventType,
        severity,
        sourceIp,
        adminId
      });

      // Check for suspicious patterns and trigger alerts
      await this.analyzeSecurityPatterns(eventType, sourceIp, adminId);

      // Send immediate alerts for critical events
      if (severity === 'critical') {
        await this.sendSecurityAlert({
          type: eventType,
          severity,
          message: `Critical security event detected: ${eventType}`,
          details: { eventId, sourceIp, adminId, ...details },
          timestamp: new Date()
        });
      }

      return eventId;
    } catch (error) {
      logger.error('Failed to log security event', { eventType, severity, error });
      throw error;
    }
  }

  /**
   * Track failed login attempts and implement account locking
   */
  async trackFailedLogin(
    adminId: string,
    sourceIp: string,
    userAgent: string,
    email?: string
  ): Promise<void> {
    try {
      // Log the failed login event
      await this.logSecurityEvent(
        'failed_login',
        'medium',
        sourceIp,
        userAgent,
        adminId,
        { email, attempt_timestamp: new Date() }
      );

      // Check failed login count in the last hour
      const failedLoginCount = await this.getFailedLoginCount(adminId, sourceIp, 60);

      if (failedLoginCount >= this.alertThresholds.failed_login_attempts) {
        // Lock account temporarily
        await this.lockAdminAccount(adminId, 30); // Lock for 30 minutes

        // Send security alert
        await this.sendSecurityAlert({
          type: 'account_locked',
          severity: 'high',
          message: `Admin account locked due to ${failedLoginCount} failed login attempts`,
          details: { adminId, sourceIp, failedLoginCount },
          timestamp: new Date()
        });

        logger.warn('Admin account locked due to failed login attempts', {
          adminId,
          sourceIp,
          failedLoginCount
        });
      }
    } catch (error) {
      logger.error('Failed to track failed login', { adminId, sourceIp, error });
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async analyzeSecurityPatterns(
    eventType: string,
    sourceIp: string,
    adminId?: string
  ): Promise<SuspiciousActivityPattern[]> {
    try {
      const patterns: SuspiciousActivityPattern[] = [];

      // Pattern 1: Multiple failed logins from same IP
      if (eventType === 'failed_login') {
        const ipFailedLogins = await this.getEventCountByIp(sourceIp, 'failed_login', 60);
        patterns.push({
          pattern_type: 'ip_failed_logins',
          description: 'Multiple failed login attempts from same IP',
          threshold_exceeded: ipFailedLogins >= 10,
          current_count: ipFailedLogins,
          threshold: 10,
          time_window: '1 hour'
        });
      }

      // Pattern 2: Rate limit violations
      if (eventType === 'rate_limit_violation') {
        const rateLimitViolations = await this.getEventCountByIp(sourceIp, 'rate_limit_violation', 30);
        patterns.push({
          pattern_type: 'rate_limit_violations',
          description: 'Excessive rate limit violations',
          threshold_exceeded: rateLimitViolations >= this.alertThresholds.rate_limit_violations,
          current_count: rateLimitViolations,
          threshold: this.alertThresholds.rate_limit_violations,
          time_window: '30 minutes'
        });
      }

      // Pattern 3: Privilege escalation attempts
      if (eventType === 'privilege_escalation_attempt') {
        patterns.push({
          pattern_type: 'privilege_escalation',
          description: 'Unauthorized privilege escalation attempt',
          threshold_exceeded: true,
          current_count: 1,
          threshold: 1,
          time_window: 'immediate'
        });

        // Immediate critical alert for privilege escalation
        await this.sendSecurityAlert({
          type: 'privilege_escalation_attempt',
          severity: 'critical',
          message: 'Unauthorized privilege escalation attempt detected',
          details: { adminId, sourceIp, timestamp: new Date() },
          timestamp: new Date()
        });
      }

      // Pattern 4: Concurrent sessions from different IPs
      if (adminId && eventType === 'admin_login') {
        const concurrentSessions = await this.getConcurrentSessionCount(adminId);
        patterns.push({
          pattern_type: 'concurrent_sessions',
          description: 'Multiple concurrent sessions detected',
          threshold_exceeded: concurrentSessions >= this.alertThresholds.concurrent_sessions,
          current_count: concurrentSessions,
          threshold: this.alertThresholds.concurrent_sessions,
          time_window: 'current'
        });
      }

      // Pattern 5: Unusual access times
      const currentHour = new Date().getHours();
      if (eventType === 'admin_login' && (currentHour < 6 || currentHour > 22)) {
        patterns.push({
          pattern_type: 'unusual_access_time',
          description: 'Login attempt during unusual hours',
          threshold_exceeded: true,
          current_count: 1,
          threshold: 1,
          time_window: 'off-hours'
        });
      }

      // Send alerts for patterns that exceed thresholds
      for (const pattern of patterns) {
        if (pattern.threshold_exceeded) {
          await this.sendSecurityAlert({
            type: pattern.pattern_type,
            severity: this.getSeverityForPattern(pattern.pattern_type),
            message: `Suspicious activity detected: ${pattern.description}`,
            details: { pattern, sourceIp, adminId },
            timestamp: new Date()
          });
        }
      }

      return patterns;
    } catch (error) {
      logger.error('Failed to analyze security patterns', { eventType, sourceIp, error });
      return [];
    }
  }

  /**
   * Get failed login count for admin or IP in specified time window
   */
  private async getFailedLoginCount(
    adminId: string,
    sourceIp: string,
    timeWindowMinutes: number
  ): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM security_events
       WHERE (admin_id = $1 OR source_ip = $2)
         AND event_type = 'failed_login'
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowMinutes} minutes'`,
      [adminId, sourceIp]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get event count by IP in specified time window
   */
  private async getEventCountByIp(
    sourceIp: string,
    eventType: string,
    timeWindowMinutes: number
  ): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM security_events
       WHERE source_ip = $1
         AND event_type = $2
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowMinutes} minutes'`,
      [sourceIp, eventType]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get concurrent session count for admin
   */
  private async getConcurrentSessionCount(adminId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(DISTINCT ip_address) as count
       FROM admin_sessions
       WHERE admin_id = $1
         AND expires_at > CURRENT_TIMESTAMP`,
      [adminId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Lock admin account temporarily
   */
  private async lockAdminAccount(adminId: string, lockDurationMinutes: number): Promise<void> {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + lockDurationMinutes);

    await query(
      `UPDATE admin_users
       SET account_locked = true, locked_until = $1
       WHERE id = $2`,
      [lockUntil, adminId]
    );

    // Log the account lock event
    await this.logSecurityEvent(
      'account_locked',
      'high',
      '127.0.0.1',
      'system',
      adminId,
      { lock_duration_minutes: lockDurationMinutes, locked_until: lockUntil }
    );
  }

  /**
   * Send security alert to platform owners
   */
  private async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Get all platform owners
      const ownersResult = await query(
        "SELECT email FROM admin_users WHERE role = 'owner' AND account_locked = false"
      );

      const ownerEmails = ownersResult.rows.map(row => row.email);

      if (ownerEmails.length === 0) {
        logger.warn('No platform owners found to send security alert');
        return;
      }

      const mailOptions = {
        from: config.email.from,
        to: ownerEmails,
        subject: `[SECURITY ALERT] ${alert.severity.toUpperCase()}: ${alert.type}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Security Alert</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px;">${alert.severity.toUpperCase()} SEVERITY</p>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #333; margin-top: 0;">Alert Details</h2>
              <p><strong>Type:</strong> ${alert.type}</p>
              <p><strong>Message:</strong> ${alert.message}</p>
              <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
              
              <h3 style="color: #333;">Additional Information</h3>
              <pre style="background-color: #fff; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(alert.details, null, 2)}
              </pre>
              
              <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;">
                  <strong>Action Required:</strong> Please review this security event and take appropriate action if necessary.
                  Log into the admin dashboard to investigate further.
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated security alert from the Elevare Admin Dashboard.</p>
              <p>If you believe this alert was sent in error, please contact the system administrator.</p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);

      logger.info('Security alert sent successfully', {
        alertType: alert.type,
        severity: alert.severity,
        recipients: ownerEmails.length
      });

    } catch (error) {
      logger.error('Failed to send security alert', { alert, error });
    }
  }

  /**
   * Get severity level for security pattern
   */
  private getSeverityForPattern(patternType: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      ip_failed_logins: 'medium',
      rate_limit_violations: 'medium',
      privilege_escalation: 'critical',
      concurrent_sessions: 'high',
      unusual_access_time: 'low'
    };

    return severityMap[patternType] || 'medium';
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

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(
    page: number = 1,
    limit: number = 20,
    filters: {
      eventType?: string;
      severity?: string;
      sourceIp?: string;
      adminId?: string;
      startDate?: Date;
      endDate?: Date;
      resolved?: boolean;
    } = {}
  ): Promise<{ events: SecurityEvent[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.eventType) {
        whereClause += ` AND event_type = $${paramIndex}`;
        params.push(filters.eventType);
        paramIndex++;
      }

      if (filters.severity) {
        whereClause += ` AND severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.sourceIp) {
        whereClause += ` AND source_ip = $${paramIndex}`;
        params.push(filters.sourceIp);
        paramIndex++;
      }

      if (filters.adminId) {
        whereClause += ` AND admin_id = $${paramIndex}`;
        params.push(filters.adminId);
        paramIndex++;
      }

      if (filters.startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.resolved !== undefined) {
        whereClause += ` AND resolved = $${paramIndex}`;
        params.push(filters.resolved);
        paramIndex++;
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM security_events ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get paginated events
      const offset = (page - 1) * limit;
      const eventsResult = await query(
        `SELECT * FROM security_events ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      return {
        events: eventsResult.rows,
        total
      };

    } catch (error) {
      logger.error('Failed to get security events', { filters, error });
      throw error;
    }
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    resolution?: string
  ): Promise<void> {
    try {
      await query(
        `UPDATE security_events
         SET resolved = true, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [resolvedBy, eventId]
      );

      // Log the resolution
      await this.logSecurityEvent(
        'security_event_resolved',
        'low',
        '127.0.0.1',
        'system',
        resolvedBy,
        { resolved_event_id: eventId, resolution }
      );

      logger.info('Security event resolved', { eventId, resolvedBy });

    } catch (error) {
      logger.error('Failed to resolve security event', { eventId, resolvedBy, error });
      throw error;
    }
  }

  /**
   * Block IP address
   */
  async blockIpAddress(
    ipAddress: string,
    blockedBy: string,
    reason: string,
    durationHours: number = 24
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      // This would integrate with a firewall or rate limiting system
      // For now, we'll log the block action
      await this.logSecurityEvent(
        'ip_blocked',
        'high',
        ipAddress,
        'system',
        blockedBy,
        { reason, duration_hours: durationHours, expires_at: expiresAt }
      );

      logger.info('IP address blocked', { ipAddress, blockedBy, reason, durationHours });

    } catch (error) {
      logger.error('Failed to block IP address', { ipAddress, blockedBy, error });
      throw error;
    }
  }

  /**
   * Get security dashboard metrics
   */
  async getSecurityMetrics(): Promise<{
    totalEvents: number;
    criticalEvents: number;
    resolvedEvents: number;
    topEventTypes: Array<{ event_type: string; count: number }>;
    topSourceIps: Array<{ source_ip: string; count: number }>;
  }> {
    try {
      // Get total events in last 24 hours
      const totalResult = await query(
        `SELECT COUNT(*) as total
         FROM security_events
         WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
      );

      // Get critical events in last 24 hours
      const criticalResult = await query(
        `SELECT COUNT(*) as critical
         FROM security_events
         WHERE severity = 'critical'
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
      );

      // Get resolved events in last 24 hours
      const resolvedResult = await query(
        `SELECT COUNT(*) as resolved
         FROM security_events
         WHERE resolved = true
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
      );

      // Get top event types in last 24 hours
      const topEventTypesResult = await query(
        `SELECT event_type, COUNT(*) as count
         FROM security_events
         WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
         GROUP BY event_type
         ORDER BY count DESC
         LIMIT 5`
      );

      // Get top source IPs in last 24 hours
      const topSourceIpsResult = await query(
        `SELECT source_ip, COUNT(*) as count
         FROM security_events
         WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
         GROUP BY source_ip
         ORDER BY count DESC
         LIMIT 5`
      );

      return {
        totalEvents: parseInt(totalResult.rows[0].total),
        criticalEvents: parseInt(criticalResult.rows[0].critical),
        resolvedEvents: parseInt(resolvedResult.rows[0].resolved),
        topEventTypes: topEventTypesResult.rows,
        topSourceIps: topSourceIpsResult.rows
      };

    } catch (error) {
      logger.error('Failed to get security metrics', { error });
      throw error;
    }
  }

  /**
   * Get active sessions with filtering
   * Requirements: 6.1
   */
  async getActiveSessions(filters?: {
    userId?: string;
    adminOnly?: boolean;
    limit?: number;
  }): Promise<ActiveSession[]> {
    try {
      let whereClause = 'WHERE s.expires_at > CURRENT_TIMESTAMP';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.userId) {
        whereClause += ` AND s.admin_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters?.adminOnly) {
        whereClause += ` AND a.id IS NOT NULL`;
      }

      const limit = filters?.limit || 100;

      const result = await query(
        `SELECT 
          s.id,
          s.admin_id as user_id,
          a.email as user_email,
          s.ip_address,
          s.user_agent,
          s.created_at,
          s.created_at as last_activity,
          true as is_admin
         FROM admin_sessions s
         JOIN admin_users a ON s.admin_id = a.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${paramIndex}`,
        [...params, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get active sessions', { filters, error });
      throw error;
    }
  }

  /**
   * Terminate a session
   * Requirements: 6.3
   */
  async terminateSession(
    sessionId: string,
    adminId: string,
    reason: string,
    ipAddress: string
  ): Promise<void> {
    try {
      // Get session details before deletion
      const sessionResult = await query(
        'SELECT admin_id, ip_address FROM admin_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }

      const session = sessionResult.rows[0];

      // Delete the session
      await query('DELETE FROM admin_sessions WHERE id = $1', [sessionId]);

      // Log the termination
      await this.logSecurityEvent(
        'session_terminated',
        'medium',
        ipAddress,
        'admin_action',
        adminId,
        {
          terminated_session_id: sessionId,
          terminated_user_id: session.admin_id,
          terminated_from_ip: session.ip_address,
          reason
        }
      );

      logger.info('Session terminated', {
        sessionId,
        terminatedBy: adminId,
        reason
      });
    } catch (error) {
      logger.error('Failed to terminate session', { sessionId, adminId, error });
      throw error;
    }
  }

  /**
   * Get security logs with filtering
   * Requirements: 6.2, 6.4
   */
  async getSecurityLogs(filters: {
    type?: string;
    severity?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<SecurityLog[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.type) {
        whereClause += ` AND event_type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.severity) {
        whereClause += ` AND severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      const limit = filters.limit || 100;

      const result = await query(
        `SELECT 
          id,
          event_type as type,
          severity,
          admin_id as user_id,
          source_ip as ip_address,
          details,
          created_at
         FROM security_events
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex}`,
        [...params, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get security logs', { filters, error });
      throw error;
    }
  }

  /**
   * Get threat metrics
   * Requirements: 6.5
   */
  async getThreatMetrics(): Promise<{
    failedLogins: number;
    blockedIps: number;
    suspiciousActivities: number;
    recentThreats: ThreatIndicator[];
  }> {
    try {
      // Get failed logins in last 24 hours
      const failedLoginsResult = await query(
        `SELECT COUNT(*) as count
         FROM security_events
         WHERE event_type = 'failed_login'
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
      );

      // Get blocked IPs in last 24 hours
      const blockedIpsResult = await query(
        `SELECT COUNT(DISTINCT source_ip) as count
         FROM security_events
         WHERE event_type = 'ip_blocked'
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
      );

      // Get suspicious activities in last 24 hours
      const suspiciousActivitiesResult = await query(
        `SELECT COUNT(*) as count
         FROM security_events
         WHERE event_type IN ('suspicious_activity', 'privilege_escalation_attempt', 'rate_limit_violation')
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
      );

      // Get recent threats grouped by type
      const recentThreatsResult = await query(
        `SELECT 
          event_type as type,
          severity,
          COUNT(*) as count,
          MAX(created_at) as last_occurrence
         FROM security_events
         WHERE severity IN ('high', 'critical')
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
         GROUP BY event_type, severity
         ORDER BY last_occurrence DESC
         LIMIT 10`
      );

      return {
        failedLogins: parseInt(failedLoginsResult.rows[0].count),
        blockedIps: parseInt(blockedIpsResult.rows[0].count),
        suspiciousActivities: parseInt(suspiciousActivitiesResult.rows[0].count),
        recentThreats: recentThreatsResult.rows
      };
    } catch (error) {
      logger.error('Failed to get threat metrics', { error });
      throw error;
    }
  }
}

export default new AdminSecurityService();