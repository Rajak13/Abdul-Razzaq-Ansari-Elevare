import { query, getClient } from '../db/connection';
import logger from '../utils/logger';
import adminAuditService from './adminAuditService';

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rollout_percentage: number;
  config?: any;
  created_at: Date;
  updated_at: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  category?: string;
  updated_by: string;
  updated_at: Date;
}

export interface MaintenanceMode {
  enabled: boolean;
  message?: string;
  estimated_resolution?: Date;
  enabled_by?: string;
  enabled_at?: Date;
}

export interface SystemLimits {
  max_file_upload_size: number;
  rate_limit_requests_per_minute: number;
  session_timeout_hours: number;
  max_failed_login_attempts: number;
  account_lock_duration_minutes: number;
}

export class AdminConfigService {
  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const result = await query(
        `SELECT id, name, description, enabled, rollout_percentage, config, created_at, updated_at
         FROM feature_flags
         ORDER BY name ASC`
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        enabled: row.enabled,
        rollout_percentage: row.rollout_percentage,
        config: row.config,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

    } catch (error) {
      logger.error('Failed to get feature flags', { error });
      throw new Error('Failed to get feature flags');
    }
  }

  /**
   * Get feature flags (alias for getAllFeatureFlags)
   * Requirement 8.2: Support feature flags configuration
   */
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return this.getAllFeatureFlags();
  }

  /**
   * Get feature flag by name
   */
  async getFeatureFlagByName(name: string): Promise<FeatureFlag | null> {
    try {
      const result = await query(
        `SELECT id, name, description, enabled, rollout_percentage, config, created_at, updated_at
         FROM feature_flags
         WHERE name = $1`,
        [name]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        enabled: row.enabled,
        rollout_percentage: row.rollout_percentage,
        config: row.config,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

    } catch (error) {
      logger.error('Failed to get feature flag', { name, error });
      throw new Error('Failed to get feature flag');
    }
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(
    name: string,
    description: string,
    enabled: boolean,
    rolloutPercentage: number,
    config: any,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<FeatureFlag> {
    const client = await getClient();

    try {
      // Validate rollout percentage
      if (rolloutPercentage < 0 || rolloutPercentage > 100) {
        throw new Error('Rollout percentage must be between 0 and 100');
      }

      await client.query('BEGIN');

      // Create feature flag
      const result = await client.query(
        `INSERT INTO feature_flags (name, description, enabled, rollout_percentage, config)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, enabled, rollout_percentage, config, created_at, updated_at`,
        [name, description, enabled, rolloutPercentage, JSON.stringify(config)]
      );

      const featureFlag = result.rows[0];

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'feature_flag_created',
        ipAddress,
        userAgent,
        'feature_flag',
        featureFlag.id,
        {
          name,
          description,
          enabled,
          rollout_percentage: rolloutPercentage,
          config
        }
      );

      await client.query('COMMIT');

      logger.info('Feature flag created', {
        featureFlagId: featureFlag.id,
        name,
        enabled,
        rolloutPercentage,
        adminId
      });

      return {
        id: featureFlag.id,
        name: featureFlag.name,
        description: featureFlag.description,
        enabled: featureFlag.enabled,
        rollout_percentage: featureFlag.rollout_percentage,
        config: featureFlag.config,
        created_at: featureFlag.created_at,
        updated_at: featureFlag.updated_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create feature flag', { name, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    name: string,
    updates: {
      description?: string;
      enabled?: boolean;
      rollout_percentage?: number;
      config?: any;
    },
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<FeatureFlag> {
    const client = await getClient();

    try {
      // Validate rollout percentage if provided
      if (updates.rollout_percentage !== undefined && 
          (updates.rollout_percentage < 0 || updates.rollout_percentage > 100)) {
        throw new Error('Rollout percentage must be between 0 and 100');
      }

      await client.query('BEGIN');

      // Get current feature flag
      const currentResult = await client.query(
        'SELECT * FROM feature_flags WHERE name = $1',
        [name]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Feature flag not found');
      }

      const currentFlag = currentResult.rows[0];

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(updates.description);
        paramIndex++;
      }

      if (updates.enabled !== undefined) {
        updateFields.push(`enabled = $${paramIndex}`);
        updateValues.push(updates.enabled);
        paramIndex++;
      }

      if (updates.rollout_percentage !== undefined) {
        updateFields.push(`rollout_percentage = $${paramIndex}`);
        updateValues.push(updates.rollout_percentage);
        paramIndex++;
      }

      if (updates.config !== undefined) {
        updateFields.push(`config = $${paramIndex}`);
        updateValues.push(JSON.stringify(updates.config));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No updates provided');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(name);

      // Update feature flag
      const updateQuery = `
        UPDATE feature_flags
        SET ${updateFields.join(', ')}
        WHERE name = $${paramIndex}
        RETURNING id, name, description, enabled, rollout_percentage, config, created_at, updated_at
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedFlag = result.rows[0];

      // Create audit log with old and new values
      await adminAuditService.createAuditLog(
        adminId,
        'feature_flag_updated',
        ipAddress,
        userAgent,
        'feature_flag',
        updatedFlag.id,
        {
          name,
          old_values: {
            description: currentFlag.description,
            enabled: currentFlag.enabled,
            rollout_percentage: currentFlag.rollout_percentage,
            config: currentFlag.config
          },
          new_values: updates
        }
      );

      await client.query('COMMIT');

      logger.info('Feature flag updated', {
        featureFlagId: updatedFlag.id,
        name,
        updates,
        adminId
      });

      return {
        id: updatedFlag.id,
        name: updatedFlag.name,
        description: updatedFlag.description,
        enabled: updatedFlag.enabled,
        rollout_percentage: updatedFlag.rollout_percentage,
        config: updatedFlag.config,
        created_at: updatedFlag.created_at,
        updated_at: updatedFlag.updated_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update feature flag', { name, updates, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete feature flag
   */
  async deleteFeatureFlag(
    name: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get feature flag before deletion
      const flagResult = await client.query(
        'SELECT * FROM feature_flags WHERE name = $1',
        [name]
      );

      if (flagResult.rows.length === 0) {
        throw new Error('Feature flag not found');
      }

      const flag = flagResult.rows[0];

      // Delete feature flag
      await client.query('DELETE FROM feature_flags WHERE name = $1', [name]);

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'feature_flag_deleted',
        ipAddress,
        userAgent,
        'feature_flag',
        flag.id,
        {
          name,
          description: flag.description,
          enabled: flag.enabled,
          rollout_percentage: flag.rollout_percentage
        }
      );

      await client.query('COMMIT');

      logger.info('Feature flag deleted', {
        featureFlagId: flag.id,
        name,
        adminId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete feature flag', { name, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if feature is enabled for a user (with rollout percentage)
   */
  async isFeatureEnabled(featureName: string, userId?: string): Promise<boolean> {
    try {
      const flag = await this.getFeatureFlagByName(featureName);

      if (!flag) {
        return false;
      }

      if (!flag.enabled) {
        return false;
      }

      // If rollout is 100%, feature is enabled for everyone
      if (flag.rollout_percentage === 100) {
        return true;
      }

      // If rollout is 0%, feature is disabled for everyone
      if (flag.rollout_percentage === 0) {
        return false;
      }

      // If no userId provided, use rollout percentage as probability
      if (!userId) {
        return Math.random() * 100 < flag.rollout_percentage;
      }

      // Use consistent hashing to determine if user is in rollout
      const hash = this.hashUserId(userId);
      const userPercentile = (hash % 100) + 1;

      return userPercentile <= flag.rollout_percentage;

    } catch (error) {
      logger.error('Failed to check feature flag', { featureName, userId, error });
      return false;
    }
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get system configuration by key
   */
  async getSystemConfig(key: string): Promise<SystemConfig | null> {
    try {
      const result = await query(
        `SELECT id, key, value, description, category, updated_by, updated_at
         FROM system_config
         WHERE key = $1`,
        [key]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        key: row.key,
        value: row.value,
        description: row.description,
        category: row.category,
        updated_by: row.updated_by,
        updated_at: row.updated_at
      };

    } catch (error) {
      logger.error('Failed to get system config', { key, error });
      throw new Error('Failed to get system config');
    }
  }

  /**
   * Get all system configurations
   */
  async getAllSystemConfigs(): Promise<SystemConfig[]> {
    try {
      const result = await query(
        `SELECT id, key, value, description, category, updated_by, updated_at
         FROM system_config
         ORDER BY category, key ASC`
      );

      return result.rows.map(row => ({
        id: row.id,
        key: row.key,
        value: row.value,
        description: row.description,
        category: row.category,
        updated_by: row.updated_by,
        updated_at: row.updated_at
      }));

    } catch (error) {
      logger.error('Failed to get system configs', { error });
      throw new Error('Failed to get system configs');
    }
  }

  /**
   * Get system configuration as a structured object
   * Requirement 8.1: Display all system settings with current values
   */
  async getSystemConfigObject(): Promise<{
    max_file_upload_size: number;
    max_users_per_group: number;
    rate_limit_per_minute: number;
    session_timeout: number;
    maintenance_mode: boolean;
    maintenance_message?: string;
  }> {
    try {
      const configs = await this.getAllSystemConfigs();
      const maintenanceMode = await this.getMaintenanceMode();

      // Build config object with defaults
      const configObject: any = {
        max_file_upload_size: 104857600, // 100MB default
        max_users_per_group: 50,
        rate_limit_per_minute: 100,
        session_timeout: 120, // minutes
        maintenance_mode: maintenanceMode.enabled,
        maintenance_message: maintenanceMode.message
      };

      // Override with actual values from database
      for (const config of configs) {
        if (config.key === 'max_file_upload_size') {
          configObject.max_file_upload_size = parseInt(config.value);
        } else if (config.key === 'max_users_per_group') {
          configObject.max_users_per_group = parseInt(config.value);
        } else if (config.key === 'rate_limit_requests_per_minute') {
          configObject.rate_limit_per_minute = parseInt(config.value);
        } else if (config.key === 'session_timeout_hours') {
          configObject.session_timeout = parseInt(config.value) * 60; // Convert hours to minutes
        }
      }

      return configObject;

    } catch (error) {
      logger.error('Failed to get system config object', { error });
      throw new Error('Failed to get system config object');
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(
    key: string,
    value: any,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<SystemConfig> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get current config
      const currentResult = await client.query(
        'SELECT * FROM system_config WHERE key = $1',
        [key]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('System config not found');
      }

      const currentConfig = currentResult.rows[0];

      // Update config
      const result = await client.query(
        `UPDATE system_config
         SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE key = $3
         RETURNING id, key, value, description, category, updated_by, updated_at`,
        [JSON.stringify(value), adminId, key]
      );

      const updatedConfig = result.rows[0];

      // Create audit log
      await adminAuditService.createAuditLog(
        adminId,
        'system_config_updated',
        ipAddress,
        userAgent,
        'system_config',
        updatedConfig.id,
        {
          key,
          old_value: currentConfig.value,
          new_value: value
        }
      );

      await client.query('COMMIT');

      logger.info('System config updated', {
        key,
        oldValue: currentConfig.value,
        newValue: value,
        adminId
      });

      return {
        id: updatedConfig.id,
        key: updatedConfig.key,
        value: updatedConfig.value,
        description: updatedConfig.description,
        category: updatedConfig.category,
        updated_by: updatedConfig.updated_by,
        updated_at: updatedConfig.updated_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update system config', { key, value, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update system configuration with structured object
   * Requirement 8.3: Validate and update configuration settings
   */
  async updateSystemConfigObject(
    config: Partial<{
      max_file_upload_size: number;
      max_users_per_group: number;
      rate_limit_per_minute: number;
      session_timeout: number;
      maintenance_mode: boolean;
      maintenance_message?: string;
    }>,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    max_file_upload_size: number;
    max_users_per_group: number;
    rate_limit_per_minute: number;
    session_timeout: number;
    maintenance_mode: boolean;
    maintenance_message?: string;
  }> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Validate configuration values
      if (config.max_file_upload_size !== undefined) {
        if (config.max_file_upload_size < 0) {
          throw new Error('Max file upload size must be positive');
        }
        if (config.max_file_upload_size > 1073741824) { // 1GB max
          throw new Error('Max file upload size cannot exceed 1GB');
        }
      }

      if (config.max_users_per_group !== undefined) {
        if (config.max_users_per_group < 2) {
          throw new Error('Max users per group must be at least 2');
        }
        if (config.max_users_per_group > 1000) {
          throw new Error('Max users per group cannot exceed 1000');
        }
      }

      if (config.rate_limit_per_minute !== undefined) {
        if (config.rate_limit_per_minute < 1) {
          throw new Error('Rate limit must be at least 1 request per minute');
        }
        if (config.rate_limit_per_minute > 10000) {
          throw new Error('Rate limit cannot exceed 10000 requests per minute');
        }
      }

      if (config.session_timeout !== undefined) {
        if (config.session_timeout < 5) {
          throw new Error('Session timeout must be at least 5 minutes');
        }
        if (config.session_timeout > 43200) { // 30 days
          throw new Error('Session timeout cannot exceed 30 days');
        }
      }

      // Update individual config values
      if (config.max_file_upload_size !== undefined) {
        await this.updateSystemConfig(
          'max_file_upload_size',
          config.max_file_upload_size.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (config.max_users_per_group !== undefined) {
        await this.updateSystemConfig(
          'max_users_per_group',
          config.max_users_per_group.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (config.rate_limit_per_minute !== undefined) {
        await this.updateSystemConfig(
          'rate_limit_requests_per_minute',
          config.rate_limit_per_minute.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (config.session_timeout !== undefined) {
        // Convert minutes to hours for storage
        const hours = Math.ceil(config.session_timeout / 60);
        await this.updateSystemConfig(
          'session_timeout_hours',
          hours.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      // Handle maintenance mode separately
      if (config.maintenance_mode !== undefined) {
        if (config.maintenance_mode) {
          await this.enableMaintenanceMode(
            config.maintenance_message || 'System is under maintenance',
            undefined,
            adminId,
            ipAddress,
            userAgent
          );
        } else {
          await this.disableMaintenanceMode(adminId, ipAddress, userAgent);
        }
      }

      await client.query('COMMIT');

      logger.info('System config object updated', { config, adminId });

      // Return updated config
      return await this.getSystemConfigObject();

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update system config object', { config, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get maintenance mode status
   */
  async getMaintenanceMode(): Promise<MaintenanceMode> {
    try {
      const config = await this.getSystemConfig('maintenance_mode');

      if (!config) {
        return { enabled: false };
      }

      const value = config.value;

      return {
        enabled: value.enabled || false,
        message: value.message,
        estimated_resolution: value.estimated_resolution ? new Date(value.estimated_resolution) : undefined,
        enabled_by: value.enabled_by,
        enabled_at: value.enabled_at ? new Date(value.enabled_at) : undefined
      };

    } catch (error) {
      logger.error('Failed to get maintenance mode', { error });
      throw new Error('Failed to get maintenance mode');
    }
  }

  /**
   * Enable maintenance mode
   */
  async enableMaintenanceMode(
    message: string,
    estimatedResolution: Date | undefined,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<MaintenanceMode> {
    try {
      const maintenanceData = {
        enabled: true,
        message,
        estimated_resolution: estimatedResolution?.toISOString(),
        enabled_by: adminId,
        enabled_at: new Date().toISOString()
      };

      await this.updateSystemConfig(
        'maintenance_mode',
        maintenanceData,
        adminId,
        ipAddress,
        userAgent
      );

      logger.info('Maintenance mode enabled', {
        message,
        estimatedResolution,
        adminId
      });

      return {
        enabled: true,
        message,
        estimated_resolution: estimatedResolution,
        enabled_by: adminId,
        enabled_at: new Date()
      };

    } catch (error) {
      logger.error('Failed to enable maintenance mode', { message, error });
      throw error;
    }
  }

  /**
   * Disable maintenance mode
   */
  async disableMaintenanceMode(
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<MaintenanceMode> {
    try {
      const maintenanceData = {
        enabled: false,
        message: undefined,
        estimated_resolution: undefined,
        enabled_by: undefined,
        enabled_at: undefined
      };

      await this.updateSystemConfig(
        'maintenance_mode',
        maintenanceData,
        adminId,
        ipAddress,
        userAgent
      );

      logger.info('Maintenance mode disabled', { adminId });

      return { enabled: false };

    } catch (error) {
      logger.error('Failed to disable maintenance mode', { error });
      throw error;
    }
  }

  /**
   * Get system limits
   */
  async getSystemLimits(): Promise<SystemLimits> {
    try {
      const configs = await this.getAllSystemConfigs();

      const limits: SystemLimits = {
        max_file_upload_size: 104857600, // 100MB default
        rate_limit_requests_per_minute: 100,
        session_timeout_hours: 2,
        max_failed_login_attempts: 5,
        account_lock_duration_minutes: 30
      };

      for (const config of configs) {
        if (config.key === 'max_file_upload_size') {
          limits.max_file_upload_size = parseInt(config.value);
        } else if (config.key === 'rate_limit_requests_per_minute') {
          limits.rate_limit_requests_per_minute = parseInt(config.value);
        } else if (config.key === 'session_timeout_hours') {
          limits.session_timeout_hours = parseInt(config.value);
        } else if (config.key === 'max_failed_login_attempts') {
          limits.max_failed_login_attempts = parseInt(config.value);
        } else if (config.key === 'account_lock_duration_minutes') {
          limits.account_lock_duration_minutes = parseInt(config.value);
        }
      }

      return limits;

    } catch (error) {
      logger.error('Failed to get system limits', { error });
      throw new Error('Failed to get system limits');
    }
  }

  /**
   * Update system limits
   */
  async updateSystemLimits(
    limits: Partial<SystemLimits>,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<SystemLimits> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Validate limits
      if (limits.max_file_upload_size !== undefined && limits.max_file_upload_size < 0) {
        throw new Error('Max file upload size must be positive');
      }

      if (limits.rate_limit_requests_per_minute !== undefined && limits.rate_limit_requests_per_minute < 1) {
        throw new Error('Rate limit must be at least 1 request per minute');
      }

      if (limits.session_timeout_hours !== undefined && limits.session_timeout_hours < 1) {
        throw new Error('Session timeout must be at least 1 hour');
      }

      if (limits.max_failed_login_attempts !== undefined && limits.max_failed_login_attempts < 1) {
        throw new Error('Max failed login attempts must be at least 1');
      }

      if (limits.account_lock_duration_minutes !== undefined && limits.account_lock_duration_minutes < 1) {
        throw new Error('Account lock duration must be at least 1 minute');
      }

      // Update each limit
      if (limits.max_file_upload_size !== undefined) {
        await this.updateSystemConfig(
          'max_file_upload_size',
          limits.max_file_upload_size.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (limits.rate_limit_requests_per_minute !== undefined) {
        await this.updateSystemConfig(
          'rate_limit_requests_per_minute',
          limits.rate_limit_requests_per_minute.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (limits.session_timeout_hours !== undefined) {
        await this.updateSystemConfig(
          'session_timeout_hours',
          limits.session_timeout_hours.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (limits.max_failed_login_attempts !== undefined) {
        await this.updateSystemConfig(
          'max_failed_login_attempts',
          limits.max_failed_login_attempts.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      if (limits.account_lock_duration_minutes !== undefined) {
        await this.updateSystemConfig(
          'account_lock_duration_minutes',
          limits.account_lock_duration_minutes.toString(),
          adminId,
          ipAddress,
          userAgent
        );
      }

      await client.query('COMMIT');

      logger.info('System limits updated', { limits, adminId });

      // Return updated limits
      return await this.getSystemLimits();

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update system limits', { limits, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update feature flag with simple parameters (wrapper method)
   * Requirement 8.4: Update feature flags
   */
  async updateFeatureFlagSimple(
    flagName: string,
    enabled: boolean,
    rolloutPercentage: number,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<FeatureFlag> {
    return this.updateFeatureFlag(
      flagName,
      { enabled, rollout_percentage: rolloutPercentage },
      adminId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Set maintenance mode (wrapper method)
   * Requirement 8.5: Provide maintenance mode toggle
   */
  async setMaintenanceMode(
    enabled: boolean,
    message: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    if (enabled) {
      await this.enableMaintenanceMode(
        message,
        undefined,
        adminId,
        ipAddress,
        userAgent
      );
    } else {
      await this.disableMaintenanceMode(adminId, ipAddress, userAgent);
    }
  }
}

export default new AdminConfigService();
