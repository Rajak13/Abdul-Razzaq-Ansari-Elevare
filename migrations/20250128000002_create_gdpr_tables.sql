-- Create GDPR compliance tables for Privacy-Preserving Admin Dashboard
-- This migration creates tables for GDPR data deletion, export, and privacy impact assessments

-- Create GDPR data deletion requests table
CREATE TABLE IF NOT EXISTS gdpr_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by_admin UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  identity_verified BOOLEAN DEFAULT FALSE,
  verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN ('email_verification', 'admin_verification', 'document_verification')),
  deletion_reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  completed_at TIMESTAMP,
  deletion_report JSONB -- Report of what was deleted
);

-- Create GDPR data export requests table
CREATE TABLE IF NOT EXISTS gdpr_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by_admin UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  export_format VARCHAR(10) NOT NULL CHECK (export_format IN ('json', 'xml', 'csv')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  download_url TEXT,
  expires_at TIMESTAMP -- When the download link expires
);

-- Create privacy impact assessments table
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type VARCHAR(100) NOT NULL,
  data_categories JSONB NOT NULL, -- Array of data categories being assessed
  processing_purposes JSONB NOT NULL, -- Array of processing purposes
  legal_basis JSONB NOT NULL, -- Array of legal basis for processing
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  mitigation_measures JSONB NOT NULL, -- Array of mitigation measures
  created_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL UNIQUE, -- Table/entity name
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  auto_delete BOOLEAN DEFAULT FALSE,
  legal_basis VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance

-- GDPR deletion requests indexes
CREATE INDEX idx_gdpr_deletion_requests_user_id ON gdpr_deletion_requests(user_id);
CREATE INDEX idx_gdpr_deletion_requests_admin_id ON gdpr_deletion_requests(requested_by_admin);
CREATE INDEX idx_gdpr_deletion_requests_status ON gdpr_deletion_requests(status);
CREATE INDEX idx_gdpr_deletion_requests_requested_at ON gdpr_deletion_requests(requested_at DESC);

-- GDPR export requests indexes
CREATE INDEX idx_gdpr_export_requests_user_id ON gdpr_export_requests(user_id);
CREATE INDEX idx_gdpr_export_requests_admin_id ON gdpr_export_requests(requested_by_admin);
CREATE INDEX idx_gdpr_export_requests_status ON gdpr_export_requests(status);
CREATE INDEX idx_gdpr_export_requests_requested_at ON gdpr_export_requests(requested_at DESC);
CREATE INDEX idx_gdpr_export_requests_expires_at ON gdpr_export_requests(expires_at);

-- Privacy impact assessments indexes
CREATE INDEX idx_privacy_assessments_type ON privacy_impact_assessments(assessment_type);
CREATE INDEX idx_privacy_assessments_risk_level ON privacy_impact_assessments(risk_level);
CREATE INDEX idx_privacy_assessments_created_by ON privacy_impact_assessments(created_by);
CREATE INDEX idx_privacy_assessments_created_at ON privacy_impact_assessments(created_at DESC);

-- Data retention policies indexes
CREATE INDEX idx_data_retention_policies_entity_type ON data_retention_policies(entity_type);
CREATE INDEX idx_data_retention_policies_auto_delete ON data_retention_policies(auto_delete);

-- Create triggers for updated_at timestamps

-- Privacy impact assessments trigger
CREATE TRIGGER update_privacy_assessments_updated_at
  BEFORE UPDATE ON privacy_impact_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Data retention policies trigger
CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: Default data retention policies will be inserted after first admin user is created

-- Create function to clean up expired export requests
CREATE OR REPLACE FUNCTION cleanup_expired_gdpr_exports()
RETURNS void AS $$
BEGIN
  -- Delete expired export requests
  DELETE FROM gdpr_export_requests 
  WHERE expires_at < CURRENT_TIMESTAMP AND status = 'completed';
  
  -- Log cleanup activity
  INSERT INTO audit_logs (admin_id, action_type, target_entity, details, ip_address, timestamp)
  VALUES (
    (SELECT id FROM admin_users WHERE role = 'owner' LIMIT 1),
    'gdpr_export_cleanup',
    'gdpr_export_requests',
    '{"automated_cleanup": true}',
    '127.0.0.1',
    CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE gdpr_deletion_requests IS 'GDPR Article 17 - Right to erasure (right to be forgotten) requests';
COMMENT ON TABLE gdpr_export_requests IS 'GDPR Article 20 - Right to data portability requests';
COMMENT ON TABLE privacy_impact_assessments IS 'GDPR Article 35 - Data protection impact assessments';
COMMENT ON TABLE data_retention_policies IS 'Data retention policies for GDPR compliance';

COMMENT ON COLUMN gdpr_deletion_requests.identity_verified IS 'Whether the user identity has been verified for the deletion request';
COMMENT ON COLUMN gdpr_deletion_requests.verification_method IS 'Method used to verify user identity';
COMMENT ON COLUMN gdpr_deletion_requests.deletion_report IS 'JSON report of what data was deleted';
COMMENT ON COLUMN gdpr_export_requests.download_url IS 'Secure URL for downloading the exported data';
COMMENT ON COLUMN gdpr_export_requests.expires_at IS 'When the download link expires for security';
COMMENT ON COLUMN privacy_impact_assessments.risk_level IS 'Assessed privacy risk level';
COMMENT ON COLUMN data_retention_policies.auto_delete IS 'Whether data should be automatically deleted after retention period';

-- Create compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  generated_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_minimized BOOLEAN DEFAULT TRUE,
  encryption_used BOOLEAN DEFAULT FALSE,
  report_data JSONB NOT NULL,
  download_url TEXT,
  expires_at TIMESTAMP,
  encryption_key TEXT -- Encrypted storage key
);

-- Create external auditor access table
CREATE TABLE IF NOT EXISTS external_auditor_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_email VARCHAR(255) NOT NULL,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('read_only', 'audit_logs', 'compliance_reports')),
  granted_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  access_token_hash VARCHAR(255) NOT NULL UNIQUE,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  last_accessed TIMESTAMP
);

-- Create indexes for compliance tables

-- Compliance reports indexes
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_generated_by ON compliance_reports(generated_by);
CREATE INDEX idx_compliance_reports_generated_at ON compliance_reports(generated_at DESC);
CREATE INDEX idx_compliance_reports_expires_at ON compliance_reports(expires_at);

-- External auditor access indexes
CREATE INDEX idx_external_auditor_email ON external_auditor_access(auditor_email);
CREATE INDEX idx_external_auditor_access_level ON external_auditor_access(access_level);
CREATE INDEX idx_external_auditor_granted_by ON external_auditor_access(granted_by);
CREATE INDEX idx_external_auditor_expires_at ON external_auditor_access(expires_at);
CREATE INDEX idx_external_auditor_revoked ON external_auditor_access(revoked);
CREATE INDEX idx_external_auditor_token_hash ON external_auditor_access(access_token_hash);

-- Create function to clean up expired compliance reports
CREATE OR REPLACE FUNCTION cleanup_expired_compliance_reports()
RETURNS void AS $$
BEGIN
  -- Delete expired compliance reports
  DELETE FROM compliance_reports 
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  -- Revoke expired auditor access
  UPDATE external_auditor_access 
  SET revoked = true, revoked_at = CURRENT_TIMESTAMP
  WHERE expires_at < CURRENT_TIMESTAMP AND revoked = false;
  
  -- Log cleanup activity
  INSERT INTO audit_logs (admin_id, action_type, target_entity, details, ip_address, timestamp)
  VALUES (
    (SELECT id FROM admin_users WHERE role = 'owner' LIMIT 1),
    'compliance_cleanup',
    'compliance_reports',
    '{"automated_cleanup": true}',
    '127.0.0.1',
    CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments for compliance tables
COMMENT ON TABLE compliance_reports IS 'Generated compliance reports with data minimization and encryption';
COMMENT ON TABLE external_auditor_access IS 'Temporary access credentials for external auditors';

COMMENT ON COLUMN compliance_reports.data_minimized IS 'Whether personal data was minimized in the report';
COMMENT ON COLUMN compliance_reports.encryption_used IS 'Whether the report data is encrypted';
COMMENT ON COLUMN compliance_reports.encryption_key IS 'Encrypted key for report data decryption';
COMMENT ON COLUMN external_auditor_access.access_token_hash IS 'Hashed access token for security';
COMMENT ON COLUMN external_auditor_access.last_accessed IS 'Last time the auditor accessed the system';