-- Add more sample security events
INSERT INTO security_events (event_type, severity, source_ip, user_agent, details, resolved) VALUES
('failed_login', 'medium', '192.168.1.101', 'Mozilla/5.0', '{"email": "admin@test.com", "attempts": 3}', false),
('failed_login', 'medium', '192.168.1.102', 'Mozilla/5.0', '{"email": "user@test.com", "attempts": 2}', false),
('rate_limit_exceeded', 'low', '10.0.0.51', 'curl/7.68.0', '{"endpoint": "/api/auth/login", "count": 120}', false),
('unauthorized_access_attempt', 'high', '172.16.0.26', 'PostmanRuntime/7.29.0', '{"resource": "/api/admin/users", "method": "DELETE"}', false),
('suspicious_activity', 'critical', '203.0.113.45', 'Python-urllib/3.8', '{"pattern": "sql_injection_attempt", "payload": "OR 1=1"}', false),
('privilege_escalation_attempt', 'critical', '198.51.100.23', 'Mozilla/5.0', '{"attempted_role": "owner", "current_role": "viewer"}', false),
('brute_force_attack', 'high', '192.0.2.100', 'curl/7.68.0', '{"target": "admin_login", "attempts": 50}', false);

-- Add sample admin security events (failed logins)
INSERT INTO admin_security_events (event_type, ip_address, user_agent, details) VALUES
('failed_login', '192.168.1.101', 'Mozilla/5.0', '{"email": "admin@test.com", "reason": "invalid_password"}'),
('failed_login', '192.168.1.102', 'Mozilla/5.0', '{"email": "user@test.com", "reason": "invalid_password"}'),
('failed_login', '10.0.0.51', 'curl/7.68.0', '{"email": "test@test.com", "reason": "account_not_found"}'),
('failed_login', '172.16.0.26', 'PostmanRuntime/7.29.0', '{"email": "admin@test.com", "reason": "invalid_password"}'),
('failed_login', '203.0.113.45', 'Python-urllib/3.8', '{"email": "root@test.com", "reason": "account_locked"}');

-- Add sample blocked IPs
INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active) VALUES
('203.0.113.45', 'Multiple SQL injection attempts detected', NOW() + INTERVAL '24 hours', true),
('198.51.100.23', 'Privilege escalation attempt', NOW() + INTERVAL '48 hours', true),
('192.0.2.100', 'Brute force attack on admin login', NOW() + INTERVAL '72 hours', true);

COMMENT ON TABLE security_events IS 'Updated with sample data for testing';
