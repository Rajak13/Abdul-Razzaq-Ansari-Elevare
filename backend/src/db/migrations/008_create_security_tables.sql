-- Create security events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source_ip VARCHAR(45),
    user_agent TEXT,
    admin_id UUID REFERENCES admin_users(id),
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES admin_users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);

-- Create blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by UUID REFERENCES admin_users(id),
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_active ON blocked_ips(is_active);
CREATE INDEX idx_blocked_ips_expires ON blocked_ips(expires_at);

-- Create admin security events table (for failed logins, etc.)
CREATE TABLE IF NOT EXISTS admin_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    admin_id UUID REFERENCES admin_users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_security_events_type ON admin_security_events(event_type);
CREATE INDEX idx_admin_security_events_created ON admin_security_events(created_at DESC);
CREATE INDEX idx_admin_security_events_admin ON admin_security_events(admin_id);

-- Security events will be automatically logged by the system

COMMENT ON TABLE security_events IS 'Stores security events and threats detected by the system';
COMMENT ON TABLE blocked_ips IS 'Stores IP addresses that have been blocked for security reasons';
COMMENT ON TABLE admin_security_events IS 'Stores admin-specific security events like failed logins';
