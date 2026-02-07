-- Create security_logs table for security monitoring
-- This migration creates the security logs table for tracking security events

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('failed_login', 'suspicious_activity', 'blocked_ip', 'threat_detected', 'session_terminated', 'unauthorized_access')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_security_logs_type ON security_logs(type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);

-- Create composite index for filtering by type and severity
CREATE INDEX idx_security_logs_type_severity ON security_logs(type, severity);

-- Create composite index for date range queries with severity
CREATE INDEX idx_security_logs_created_severity ON security_logs(created_at DESC, severity);

-- Add comments for documentation
COMMENT ON TABLE security_logs IS 'Security event logs for monitoring and threat detection';
COMMENT ON COLUMN security_logs.type IS 'Type of security event';
COMMENT ON COLUMN security_logs.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN security_logs.user_id IS 'Associated user ID if applicable';
COMMENT ON COLUMN security_logs.ip_address IS 'Source IP address of the security event';
COMMENT ON COLUMN security_logs.details IS 'Additional event details in JSON format';
