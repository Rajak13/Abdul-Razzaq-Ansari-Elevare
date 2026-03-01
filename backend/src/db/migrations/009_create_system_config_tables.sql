-- Create system configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    updated_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Insert default system configuration values
INSERT INTO system_config (key, value, description, category) VALUES
('max_file_upload_size', '"10485760"', 'Maximum file upload size in bytes (10MB default)', 'limits'),
('rate_limit_requests_per_minute', '"100"', 'API rate limit per minute', 'limits'),
('session_timeout_hours', '"2"', 'Session timeout in hours', 'security'),
('max_failed_login_attempts', '"5"', 'Maximum failed login attempts before account lock', 'security'),
('account_lock_duration_minutes', '"30"', 'Account lock duration in minutes after max failed attempts', 'security')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_config IS 'Stores system-wide configuration settings';
