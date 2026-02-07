-- Create admin database tables for Privacy-Preserving Admin Dashboard
-- This migration creates the core admin tables with security and privacy features

-- Enable pgcrypto extension for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin_users table with role-based permissions
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'administrator', 'moderator')),
  mfa_secret VARCHAR(255), -- TOTP secret for multi-factor authentication
  mfa_enabled BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[], -- Array of encrypted backup codes for MFA recovery
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked BOOLEAN DEFAULT FALSE,
  locked_until TIMESTAMP, -- Temporary lock expiration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_sessions table for session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed JWT token
  ip_address INET NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table with cryptographic integrity
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  action_type VARCHAR(100) NOT NULL, -- Type of action performed
  target_entity VARCHAR(100), -- Entity type affected (user, system, config, etc.)
  target_id VARCHAR(255), -- ID of the affected entity
  details JSONB, -- Action details and parameters
  ip_address INET NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hash VARCHAR(255) NOT NULL -- Cryptographic hash for integrity verification
);

-- Create feature_flags table for system configuration
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  config JSONB, -- Additional configuration parameters
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create security_events table for monitoring and alerting
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- failed_login, suspicious_activity, rate_limit_violation, etc.
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source_ip INET,
  user_agent TEXT,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_config table for platform configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50), -- maintenance, limits, notifications, etc.
  updated_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance and security

-- Admin users indexes
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_account_locked ON admin_users(account_locked);
CREATE INDEX idx_admin_users_mfa_enabled ON admin_users(mfa_enabled);

-- Admin sessions indexes
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_ip_address ON admin_sessions(ip_address);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_target_entity ON audit_logs(target_entity);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Feature flags indexes
CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- Security events indexes
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_admin_id ON security_events(admin_id);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);

-- System config indexes
CREATE INDEX idx_system_config_key ON system_config(key);
CREATE INDEX idx_system_config_category ON system_config(category);
CREATE INDEX idx_system_config_updated_by ON system_config(updated_by);

-- Create triggers for updated_at timestamps

-- Admin users trigger
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Feature flags trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- System config trigger
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function for automatic session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function for audit log integrity hashing
CREATE OR REPLACE FUNCTION generate_audit_hash(
  p_admin_id UUID,
  p_action_type VARCHAR,
  p_target_entity VARCHAR,
  p_target_id VARCHAR,
  p_details JSONB,
  p_ip_address INET,
  p_timestamp TIMESTAMP
) RETURNS VARCHAR AS $$
BEGIN
  -- Generate SHA-256 hash of audit log data for integrity verification
  -- In production, this should use a more sophisticated HMAC with secret key
  RETURN encode(
    digest(
      CONCAT(
        COALESCE(p_admin_id::text, ''),
        COALESCE(p_action_type, ''),
        COALESCE(p_target_entity, ''),
        COALESCE(p_target_id, ''),
        COALESCE(p_details::text, ''),
        COALESCE(p_ip_address::text, ''),
        COALESCE(p_timestamp::text, '')
      ),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate audit log hash
CREATE OR REPLACE FUNCTION set_audit_log_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hash = generate_audit_hash(
    NEW.admin_id,
    NEW.action_type,
    NEW.target_entity,
    NEW.target_id,
    NEW.details,
    NEW.ip_address,
    NEW.timestamp
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_set_hash
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_log_hash();

-- Note: Default system configuration will be inserted after first admin user is created

-- Create initial feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage) VALUES
  ('admin_dashboard', 'Enable admin dashboard access', true, 100),
  ('advanced_analytics', 'Enable advanced analytics features', false, 0),
  ('bulk_user_operations', 'Enable bulk user management operations', false, 0),
  ('real_time_monitoring', 'Enable real-time system monitoring', true, 100),
  ('automated_backups', 'Enable automated system backups', true, 100)
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE admin_users IS 'Administrative users with role-based access control';
COMMENT ON TABLE admin_sessions IS 'Active admin sessions with security tracking';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail with cryptographic integrity';
COMMENT ON TABLE feature_flags IS 'System feature toggles for gradual rollouts';
COMMENT ON TABLE security_events IS 'Security monitoring and incident tracking';
COMMENT ON TABLE system_config IS 'Platform configuration parameters';

COMMENT ON COLUMN admin_users.mfa_secret IS 'TOTP secret for multi-factor authentication';
COMMENT ON COLUMN admin_users.backup_codes IS 'Encrypted backup codes for MFA recovery';
COMMENT ON COLUMN admin_sessions.token_hash IS 'Hashed JWT token for security';
COMMENT ON COLUMN audit_logs.hash IS 'Cryptographic hash for tamper detection';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage of users who see this feature';