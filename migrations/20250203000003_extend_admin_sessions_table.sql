-- Extend admin_sessions table for enhanced session management
-- This migration adds additional columns to the existing admin_sessions table

-- Add is_admin column to track admin vs regular user sessions
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add last_activity column for session activity tracking
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index on is_admin for filtering
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_admin ON admin_sessions(is_admin);

-- Create index on last_activity for activity tracking
CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_activity ON admin_sessions(last_activity DESC);

-- Create composite index for active admin sessions
-- Note: Cannot use CURRENT_TIMESTAMP in WHERE clause as it's not immutable
-- Instead, create a simple composite index for filtering active admin sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active_admin ON admin_sessions(is_admin, expires_at) WHERE is_admin = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN admin_sessions.is_admin IS 'Whether this is an admin user session';
COMMENT ON COLUMN admin_sessions.last_activity IS 'Timestamp of the last activity in this session';
