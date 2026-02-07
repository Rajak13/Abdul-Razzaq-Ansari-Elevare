-- Create moderation and abuse reporting tables for Privacy-Preserving Admin Dashboard
-- This migration creates tables for content moderation while maintaining privacy

-- Create abuse_reports table for user-generated reports
CREATE TABLE IF NOT EXISTS abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('note', 'message', 'file', 'resource', 'whiteboard', 'profile', 'study_group')),
  content_id UUID NOT NULL, -- ID of the reported content
  reason VARCHAR(100) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'copyright_violation', 'hate_speech', 'violence', 'other')),
  description TEXT, -- Optional description from reporter
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  moderator_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action_taken VARCHAR(100), -- Action taken by moderator
  moderator_notes TEXT, -- Private notes for moderators
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_violations table for tracking violation history (metadata only)
CREATE TABLE IF NOT EXISTS user_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'minor', 'major', 'severe')),
  description TEXT, -- Description of violation (no private content)
  moderator_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  abuse_report_id UUID REFERENCES abuse_reports(id) ON DELETE SET NULL,
  action_taken VARCHAR(100) NOT NULL, -- warning, suspension, ban, etc.
  duration_hours INTEGER, -- For temporary actions like suspensions
  expires_at TIMESTAMP, -- When temporary action expires
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_suspensions table for managing account restrictions
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspended_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  reason VARCHAR(255) NOT NULL,
  suspension_type VARCHAR(20) NOT NULL CHECK (suspension_type IN ('temporary', 'permanent')),
  starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for permanent suspensions
  is_active BOOLEAN DEFAULT TRUE,
  lifted_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  lifted_at TIMESTAMP,
  lift_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create moderation_actions table for audit trail of all moderation activities
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  action_type VARCHAR(50) NOT NULL, -- report_review, user_warning, user_suspension, user_ban, etc.
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_content_type VARCHAR(50),
  target_content_id UUID,
  abuse_report_id UUID REFERENCES abuse_reports(id) ON DELETE SET NULL,
  details JSONB, -- Action details without private content
  ip_address INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance

-- Abuse reports indexes
CREATE INDEX idx_abuse_reports_reporter_id ON abuse_reports(reporter_id);
CREATE INDEX idx_abuse_reports_reported_user_id ON abuse_reports(reported_user_id);
CREATE INDEX idx_abuse_reports_content_type ON abuse_reports(content_type);
CREATE INDEX idx_abuse_reports_status ON abuse_reports(status);
CREATE INDEX idx_abuse_reports_priority ON abuse_reports(priority);
CREATE INDEX idx_abuse_reports_moderator_id ON abuse_reports(moderator_id);
CREATE INDEX idx_abuse_reports_created_at ON abuse_reports(created_at DESC);

-- User violations indexes
CREATE INDEX idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX idx_user_violations_violation_type ON user_violations(violation_type);
CREATE INDEX idx_user_violations_severity ON user_violations(severity);
CREATE INDEX idx_user_violations_moderator_id ON user_violations(moderator_id);
CREATE INDEX idx_user_violations_created_at ON user_violations(created_at DESC);

-- User suspensions indexes
CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_suspended_by ON user_suspensions(suspended_by);
CREATE INDEX idx_user_suspensions_is_active ON user_suspensions(is_active);
CREATE INDEX idx_user_suspensions_expires_at ON user_suspensions(expires_at);
CREATE INDEX idx_user_suspensions_created_at ON user_suspensions(created_at DESC);

-- Moderation actions indexes
CREATE INDEX idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_action_type ON moderation_actions(action_type);
CREATE INDEX idx_moderation_actions_target_user_id ON moderation_actions(target_user_id);
CREATE INDEX idx_moderation_actions_created_at ON moderation_actions(created_at DESC);

-- Create triggers for updated_at timestamps

-- Abuse reports trigger
CREATE TRIGGER update_abuse_reports_updated_at
  BEFORE UPDATE ON abuse_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user is currently suspended
CREATE OR REPLACE FUNCTION is_user_suspended(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions 
    WHERE user_id = p_user_id 
    AND is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get active suspension for user
CREATE OR REPLACE FUNCTION get_active_suspension(p_user_id UUID)
RETURNS user_suspensions AS $$
DECLARE
  suspension user_suspensions;
BEGIN
  SELECT * INTO suspension
  FROM user_suspensions 
  WHERE user_id = p_user_id 
  AND is_active = TRUE 
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN suspension;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically expire temporary suspensions
CREATE OR REPLACE FUNCTION expire_temporary_suspensions()
RETURNS void AS $$
BEGIN
  UPDATE user_suspensions 
  SET is_active = FALSE,
      lifted_at = CURRENT_TIMESTAMP,
      lift_reason = 'Automatic expiration'
  WHERE is_active = TRUE 
  AND expires_at IS NOT NULL 
  AND expires_at <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE abuse_reports IS 'User-generated abuse reports with metadata only';
COMMENT ON TABLE user_violations IS 'User violation history tracking without private content';
COMMENT ON TABLE user_suspensions IS 'User account suspension management';
COMMENT ON TABLE moderation_actions IS 'Audit trail of all moderation activities';

COMMENT ON COLUMN abuse_reports.content_id IS 'ID of reported content - content itself is never stored';
COMMENT ON COLUMN user_violations.description IS 'Violation description without private content';
COMMENT ON COLUMN moderation_actions.details IS 'Action details without exposing private content';