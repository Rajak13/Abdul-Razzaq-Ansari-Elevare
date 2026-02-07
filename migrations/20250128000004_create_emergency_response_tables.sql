-- Create emergency response tables for Privacy-Preserving Admin Dashboard
-- This migration creates tables for emergency lockdown, backup restoration, and incident response

-- Create emergency_lockdowns table
CREATE TABLE IF NOT EXISTS emergency_lockdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT TRUE,
  reason TEXT NOT NULL,
  duration_hours INTEGER, -- NULL means indefinite
  enabled_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL if indefinite
  disabled_at TIMESTAMP,
  disabled_by UUID REFERENCES admin_users(id) ON DELETE RESTRICT
);

-- Create backup_restorations table
CREATE TABLE IF NOT EXISTS backup_restorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id VARCHAR(255) NOT NULL,
  backup_timestamp TIMESTAMP NOT NULL,
  restoration_type VARCHAR(50) NOT NULL CHECK (restoration_type IN ('full', 'partial', 'database', 'files')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  initiated_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  integrity_verified BOOLEAN DEFAULT FALSE
);

-- Create incident_reports table
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('data_breach', 'security_incident', 'system_failure', 'unauthorized_access')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  affected_users_count INTEGER,
  affected_data_types TEXT[], -- Array of data types affected
  breach_scope TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('reported', 'investigating', 'contained', 'resolved')),
  reported_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

-- Create indexes for performance

-- Emergency lockdowns indexes
CREATE INDEX idx_emergency_lockdowns_enabled ON emergency_lockdowns(enabled);
CREATE INDEX idx_emergency_lockdowns_enabled_by ON emergency_lockdowns(enabled_by);
CREATE INDEX idx_emergency_lockdowns_enabled_at ON emergency_lockdowns(enabled_at DESC);
CREATE INDEX idx_emergency_lockdowns_expires_at ON emergency_lockdowns(expires_at);

-- Backup restorations indexes
CREATE INDEX idx_backup_restorations_backup_id ON backup_restorations(backup_id);
CREATE INDEX idx_backup_restorations_status ON backup_restorations(status);
CREATE INDEX idx_backup_restorations_initiated_by ON backup_restorations(initiated_by);
CREATE INDEX idx_backup_restorations_initiated_at ON backup_restorations(initiated_at DESC);

-- Incident reports indexes
CREATE INDEX idx_incident_reports_incident_type ON incident_reports(incident_type);
CREATE INDEX idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX idx_incident_reports_status ON incident_reports(status);
CREATE INDEX idx_incident_reports_reported_by ON incident_reports(reported_by);
CREATE INDEX idx_incident_reports_reported_at ON incident_reports(reported_at DESC);

-- Add comments for documentation
COMMENT ON TABLE emergency_lockdowns IS 'Emergency system lockdowns with user access restriction';
COMMENT ON TABLE backup_restorations IS 'Backup restoration operations with integrity verification';
COMMENT ON TABLE incident_reports IS 'Security and data breach incident tracking';

COMMENT ON COLUMN emergency_lockdowns.enabled IS 'Whether lockdown is currently active';
COMMENT ON COLUMN emergency_lockdowns.duration_hours IS 'Lockdown duration in hours (NULL = indefinite)';
COMMENT ON COLUMN emergency_lockdowns.expires_at IS 'When lockdown automatically expires (NULL = manual disable required)';

COMMENT ON COLUMN backup_restorations.integrity_verified IS 'Whether backup integrity has been verified before restoration';
COMMENT ON COLUMN backup_restorations.restoration_type IS 'Type of restoration: full, partial, database, or files';

COMMENT ON COLUMN incident_reports.affected_users_count IS 'Number of users affected by incident (metadata only)';
COMMENT ON COLUMN incident_reports.affected_data_types IS 'Types of data affected (no actual content)';
COMMENT ON COLUMN incident_reports.breach_scope IS 'Scope of breach without exposing private content';
