import { query, getClient } from '../db/connection';
import logger from '../utils/logger';
import adminAuditService from './adminAuditService';

export interface GdprDataDeletionRequest {
  id: string;
  user_id: string;
  requested_by_admin: string;
  identity_verified: boolean;
  verification_method: string;
  deletion_reason: string;
  status: 'pending' | 'verified' | 'processing' | 'completed' | 'failed';
  requested_at: Date;
  verified_at?: Date;
  completed_at?: Date;
  deletion_report?: any;
}

export interface GdprDataExportRequest {
  id: string;
  user_id: string;
  requested_by_admin: string;
  export_format: 'json' | 'xml' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: Date;
  completed_at?: Date;
  download_url?: string;
  expires_at?: Date;
}

export interface DataRetentionPolicy {
  entity_type: string;
  retention_days: number;
  auto_delete: boolean;
  legal_basis: string;
  description: string;
}

export interface PrivacyImpactAssessment {
  id: string;
  assessment_type: string;
  data_categories: string[];
  processing_purposes: string[];
  legal_basis: string[];
  risk_level: 'low' | 'medium' | 'high';
  mitigation_measures: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserDataSummary {
  user_id: string;
  email: string;
  registration_date: Date;
  last_login?: Date;
  data_categories: {
    category: string;
    count: number;
    size_bytes: number;
    last_updated: Date;
  }[];
  total_size_bytes: number;
  retention_status: {
    category: string;
    retention_days: number;
    expires_at: Date;
    auto_delete: boolean;
  }[];
}

export class AdminGdprService {
  private readonly EXPORT_EXPIRY_HOURS = 72; // 3 days

  /**
   * Create user data deletion request with identity verification
   */
  async createDataDeletionRequest(
    userId: string,
    adminId: string,
    reason: string,
    verificationMethod: string,
    ipAddress: string
  ): Promise<string> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Verify user exists
      const userResult = await client.query(
        'SELECT id, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Create deletion request
      const requestResult = await client.query(
        `INSERT INTO gdpr_deletion_requests 
         (user_id, requested_by_admin, identity_verified, verification_method, deletion_reason, status, requested_at)
         VALUES ($1, $2, false, $3, $4, 'pending', CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, adminId, verificationMethod, reason]
      );

      const requestId = requestResult.rows[0].id;

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'gdpr_deletion_request_created',
        ipAddress,
        undefined,
        'gdpr_deletion_request',
        requestId,
        {
          user_id: userId,
          user_email: user.email,
          reason,
          verification_method: verificationMethod
        }
      );

      await client.query('COMMIT');

      logger.info('GDPR data deletion request created', {
        requestId,
        userId,
        adminId,
        reason,
        verificationMethod
      });

      return requestId;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create data deletion request', {
        userId,
        adminId,
        reason,
        error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify identity for data deletion request
   */
  async verifyDeletionRequestIdentity(
    requestId: string,
    adminId: string,
    verificationData: any,
    ipAddress: string
  ): Promise<boolean> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get deletion request
      const requestResult = await client.query(
        `SELECT id, user_id, verification_method, status
         FROM gdpr_deletion_requests
         WHERE id = $1 AND status = 'pending'`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Deletion request not found or already processed');
      }

      const request = requestResult.rows[0];

      // Perform identity verification based on method
      const isVerified = await this.performIdentityVerification(
        request.user_id,
        request.verification_method,
        verificationData
      );

      if (isVerified) {
        // Update request status
        await client.query(
          `UPDATE gdpr_deletion_requests
           SET identity_verified = true, status = 'verified', verified_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [requestId]
        );

        // Create audit log
        await adminAuditService.createAuditLog(
          adminId,
          'gdpr_deletion_identity_verified',
          ipAddress,
          undefined,
          'gdpr_deletion_request',
          requestId,
          {
            user_id: request.user_id,
            verification_method: request.verification_method,
            verification_data: verificationData
          }
        );

        await client.query('COMMIT');

        logger.info('GDPR deletion request identity verified', {
          requestId,
          userId: request.user_id,
          adminId
        });

        return true;
      } else {
        // Create audit log for failed verification
        await adminAuditService.createAuditLog(
          adminId,
          'gdpr_deletion_identity_verification_failed',
          ipAddress,
          undefined,
          'gdpr_deletion_request',
          requestId,
          {
            user_id: request.user_id,
            verification_method: request.verification_method,
            reason: 'Identity verification failed'
          }
        );

        await client.query('COMMIT');

        logger.warn('GDPR deletion request identity verification failed', {
          requestId,
          userId: request.user_id,
          adminId
        });

        return false;
      }

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to verify deletion request identity', {
        requestId,
        adminId,
        error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute user data deletion
   */
  async executeDataDeletion(
    requestId: string,
    adminId: string,
    ipAddress: string
  ): Promise<{ success: boolean; deletionReport: any }> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get verified deletion request
      const requestResult = await client.query(
        `SELECT id, user_id, status, identity_verified
         FROM gdpr_deletion_requests
         WHERE id = $1 AND status = 'verified' AND identity_verified = true`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Deletion request not found or not verified');
      }

      const request = requestResult.rows[0];
      const userId = request.user_id;

      // Update request status to processing
      await client.query(
        'UPDATE gdpr_deletion_requests SET status = $1 WHERE id = $2',
        ['processing', requestId]
      );

      // Get user data summary before deletion
      const dataSummary = await this.getUserDataSummary(userId);

      // Perform data deletion across all tables
      const deletionReport = await this.performUserDataDeletion(client, userId);

      // Update request with completion
      await client.query(
        `UPDATE gdpr_deletion_requests
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, deletion_report = $1
         WHERE id = $2`,
        [JSON.stringify(deletionReport), requestId]
      );

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'gdpr_data_deletion_completed',
        ipAddress,
        undefined,
        'user',
        userId,
        {
          request_id: requestId,
          data_summary: dataSummary,
          deletion_report: deletionReport
        }
      );

      await client.query('COMMIT');

      logger.info('GDPR data deletion completed', {
        requestId,
        userId,
        adminId,
        deletionReport
      });

      return { success: true, deletionReport };

    } catch (error) {
      await client.query('ROLLBACK');
      
      // Update request status to failed
      try {
        await query(
          'UPDATE gdpr_deletion_requests SET status = $1 WHERE id = $2',
          ['failed', requestId]
        );
      } catch (updateError) {
        logger.error('Failed to update deletion request status', { requestId, updateError });
      }

      logger.error('Failed to execute data deletion', {
        requestId,
        adminId,
        error
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create data portability export request
   */
  async createDataExportRequest(
    userId: string,
    adminId: string,
    format: 'json' | 'xml' | 'csv',
    ipAddress: string
  ): Promise<string> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Verify user exists
      const userResult = await client.query(
        'SELECT id, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Create export request
      const requestResult = await client.query(
        `INSERT INTO gdpr_export_requests 
         (user_id, requested_by_admin, export_format, status, requested_at)
         VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, adminId, format]
      );

      const requestId = requestResult.rows[0].id;

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'gdpr_export_request_created',
        ipAddress,
        undefined,
        'gdpr_export_request',
        requestId,
        {
          user_id: userId,
          user_email: user.email,
          export_format: format
        }
      );

      await client.query('COMMIT');

      // Start export processing asynchronously
      this.processDataExport(requestId, adminId).catch(error => {
        logger.error('Data export processing failed', { requestId, error });
      });

      logger.info('GDPR data export request created', {
        requestId,
        userId,
        adminId,
        format
      });

      return requestId;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create data export request', {
        userId,
        adminId,
        format,
        error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user data summary for privacy assessment
   */
  async getUserDataSummary(userId: string): Promise<UserDataSummary> {
    try {
      // Get user basic info
      const userResult = await query(
        'SELECT id, email, created_at, last_login FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get data categories with counts and sizes
      const dataCategories = await Promise.all([
        this.getDataCategoryInfo(userId, 'tasks', 'tasks'),
        this.getDataCategoryInfo(userId, 'notes', 'notes'),
        this.getDataCategoryInfo(userId, 'files', 'files'),
        this.getDataCategoryInfo(userId, 'resources', 'resources'),
        this.getDataCategoryInfo(userId, 'study_groups', 'group_members'),
        this.getDataCategoryInfo(userId, 'notifications', 'notifications')
      ]);

      const totalSizeBytes = dataCategories.reduce((sum, cat) => sum + cat.size_bytes, 0);

      // Get retention status
      const retentionPolicies = await this.getDataRetentionPolicies();
      const retentionStatus = retentionPolicies.map(policy => {
        const expiresAt = new Date(user.created_at);
        expiresAt.setDate(expiresAt.getDate() + policy.retention_days);
        
        return {
          category: policy.entity_type,
          retention_days: policy.retention_days,
          expires_at: expiresAt,
          auto_delete: policy.auto_delete
        };
      });

      return {
        user_id: userId,
        email: user.email,
        registration_date: user.created_at,
        last_login: user.last_login,
        data_categories: dataCategories,
        total_size_bytes: totalSizeBytes,
        retention_status: retentionStatus
      };

    } catch (error) {
      logger.error('Failed to get user data summary', { userId, error });
      throw error;
    }
  }

  /**
   * Create privacy impact assessment
   */
  async createPrivacyImpactAssessment(
    assessmentType: string,
    dataCategories: string[],
    processingPurposes: string[],
    legalBasis: string[],
    riskLevel: 'low' | 'medium' | 'high',
    mitigationMeasures: string[],
    adminId: string,
    ipAddress: string
  ): Promise<string> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      const assessmentResult = await client.query(
        `INSERT INTO privacy_impact_assessments 
         (assessment_type, data_categories, processing_purposes, legal_basis, risk_level, mitigation_measures, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          assessmentType,
          JSON.stringify(dataCategories),
          JSON.stringify(processingPurposes),
          JSON.stringify(legalBasis),
          riskLevel,
          JSON.stringify(mitigationMeasures),
          adminId
        ]
      );

      const assessmentId = assessmentResult.rows[0].id;

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'privacy_impact_assessment_created',
        ipAddress,
        undefined,
        'privacy_impact_assessment',
        assessmentId,
        {
          assessment_type: assessmentType,
          data_categories: dataCategories,
          processing_purposes: processingPurposes,
          legal_basis: legalBasis,
          risk_level: riskLevel
        }
      );

      await client.query('COMMIT');

      logger.info('Privacy impact assessment created', {
        assessmentId,
        assessmentType,
        riskLevel,
        adminId
      });

      return assessmentId;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create privacy impact assessment', {
        assessmentType,
        riskLevel,
        adminId,
        error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Enforce data retention policies
   */
  async enforceDataRetentionPolicies(adminId: string, ipAddress: string): Promise<{
    policiesApplied: number;
    recordsDeleted: number;
    recordsArchived: number;
  }> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      const policies = await this.getDataRetentionPolicies();
      let totalDeleted = 0;
      let totalArchived = 0;

      for (const policy of policies) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

        if (policy.auto_delete) {
          // Delete expired records
          const deleteResult = await client.query(
            `DELETE FROM ${policy.entity_type} WHERE created_at < $1`,
            [cutoffDate]
          );
          totalDeleted += deleteResult.rowCount || 0;
        } else {
          // Archive expired records
          const archiveResult = await client.query(
            `UPDATE ${policy.entity_type} 
             SET archived = true, archived_at = CURRENT_TIMESTAMP
             WHERE created_at < $1 AND (archived IS NULL OR archived = false)`,
            [cutoffDate]
          );
          totalArchived += archiveResult.rowCount || 0;
        }
      }

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'data_retention_policies_enforced',
        ipAddress,
        undefined,
        'system',
        undefined,
        {
          policies_applied: policies.length,
          records_deleted: totalDeleted,
          records_archived: totalArchived,
          policies: policies.map(p => ({
            entity_type: p.entity_type,
            retention_days: p.retention_days,
            auto_delete: p.auto_delete
          }))
        }
      );

      await client.query('COMMIT');

      logger.info('Data retention policies enforced', {
        policiesApplied: policies.length,
        recordsDeleted: totalDeleted,
        recordsArchived: totalArchived,
        adminId
      });

      return {
        policiesApplied: policies.length,
        recordsDeleted: totalDeleted,
        recordsArchived: totalArchived
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to enforce data retention policies', { adminId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Private helper methods
   */

  private async performIdentityVerification(
    userId: string,
    method: string,
    verificationData: any
  ): Promise<boolean> {
    switch (method) {
      case 'email_verification':
        return this.verifyByEmail(userId, verificationData.email);
      case 'admin_verification':
        return this.verifyByAdmin(userId, verificationData.adminConfirmation);
      case 'document_verification':
        return this.verifyByDocument(userId, verificationData.documentHash);
      default:
        return false;
    }
  }

  private async verifyByEmail(userId: string, email: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM users WHERE id = $1 AND email = $2',
      [userId, email]
    );
    return result.rows.length > 0;
  }

  private async verifyByAdmin(_userId: string, adminConfirmation: boolean): Promise<boolean> {
    return adminConfirmation === true;
  }

  private async verifyByDocument(_userId: string, documentHash: string): Promise<boolean> {
    // In a real implementation, this would verify against stored document hashes
    return Boolean(documentHash && documentHash.length > 0);
  }

  private async performUserDataDeletion(client: any, userId: string): Promise<any> {
    const deletionReport: any = {
      user_id: userId,
      deleted_at: new Date(),
      tables_processed: [],
      total_records_deleted: 0
    };

    // Define tables to delete from (in dependency order)
    const tablesToDelete = [
      'notifications',
      'group_members',
      'resource_comments',
      'whiteboard_permissions',
      'files',
      'resources',
      'notes',
      'tasks',
      'whiteboards',
      'users' // Delete user record last
    ];

    for (const table of tablesToDelete) {
      try {
        const result = await client.query(
          `DELETE FROM ${table} WHERE user_id = $1`,
          [userId]
        );
        
        deletionReport.tables_processed.push({
          table,
          records_deleted: result.rowCount || 0,
          status: 'success'
        });
        
        deletionReport.total_records_deleted += result.rowCount || 0;
      } catch (error) {
        deletionReport.tables_processed.push({
          table,
          records_deleted: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return deletionReport;
  }

  private async processDataExport(requestId: string, adminId: string): Promise<void> {
    try {
      // Update status to processing
      await query(
        'UPDATE gdpr_export_requests SET status = $1 WHERE id = $2',
        ['processing', requestId]
      );

      // Get request details
      const requestResult = await query(
        'SELECT user_id, export_format FROM gdpr_export_requests WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Export request not found');
      }

      const { user_id, export_format } = requestResult.rows[0];

      // Generate export data
      const exportData = await this.generateUserDataExport(user_id, export_format);

      // Store export (in real implementation, this would be stored securely)
      const downloadUrl = `/admin/gdpr/exports/${requestId}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.EXPORT_EXPIRY_HOURS);

      // Update request with completion (exportData would be stored in real implementation)
      await query(
        `UPDATE gdpr_export_requests
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, download_url = $1, expires_at = $2
         WHERE id = $3`,
        [downloadUrl, expiresAt, requestId]
      );

      logger.info('Data export completed', { 
        requestId, 
        userId: user_id, 
        adminId,
        exportSize: exportData.length 
      });

    } catch (error) {
      await query(
        'UPDATE gdpr_export_requests SET status = $1 WHERE id = $2',
        ['failed', requestId]
      );
      
      logger.error('Data export failed', { requestId, adminId, error });
      throw error;
    }
  }

  private async generateUserDataExport(userId: string, _format: string): Promise<string> {
    // Get all user data
    const userData = await this.getUserDataSummary(userId);
    
    // In a real implementation, this would generate the actual export file
    // and return the file path or content
    return JSON.stringify(userData, null, 2);
  }

  private async getDataCategoryInfo(
    userId: string,
    category: string,
    tableName: string
  ): Promise<{ category: string; count: number; size_bytes: number; last_updated: Date }> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count, 
                COALESCE(SUM(OCTET_LENGTH(content::text)), 0) as size_bytes,
                MAX(updated_at) as last_updated
         FROM ${tableName}
         WHERE user_id = $1`,
        [userId]
      );

      const row = result.rows[0];
      return {
        category,
        count: parseInt(row.count),
        size_bytes: parseInt(row.size_bytes),
        last_updated: row.last_updated || new Date()
      };
    } catch (error) {
      logger.error(`Failed to get data category info for ${category}`, { userId, error });
      return {
        category,
        count: 0,
        size_bytes: 0,
        last_updated: new Date()
      };
    }
  }

  private async getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    // In a real implementation, these would be stored in the database
    return [
      {
        entity_type: 'tasks',
        retention_days: 2555, // 7 years
        auto_delete: false,
        legal_basis: 'Contract performance',
        description: 'User tasks and related data'
      },
      {
        entity_type: 'notes',
        retention_days: 2555, // 7 years
        auto_delete: false,
        legal_basis: 'Contract performance',
        description: 'User notes and content'
      },
      {
        entity_type: 'files',
        retention_days: 1825, // 5 years
        auto_delete: true,
        legal_basis: 'Contract performance',
        description: 'User uploaded files'
      },
      {
        entity_type: 'notifications',
        retention_days: 365, // 1 year
        auto_delete: true,
        legal_basis: 'Legitimate interest',
        description: 'User notifications'
      }
    ];
  }
}

export default new AdminGdprService();