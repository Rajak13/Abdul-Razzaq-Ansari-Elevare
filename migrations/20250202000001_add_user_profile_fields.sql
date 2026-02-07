-- Add additional profile fields to users table
-- This migration adds fields needed for the admin dashboard user profile display

-- Add account_type field (instead of gender, we'll use account type: student, educator, professional, researcher)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'student' CHECK (account_type IN ('student', 'educator', 'professional', 'researcher', 'other'));

-- Add last_login field for tracking user activity
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add account_status field for better user management
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted', 'pending'));

-- Add timezone preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Add phone number (optional, for contact purposes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add date of birth (optional, for age verification if needed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add institution/organization name
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution VARCHAR(255);

-- Create index on account_type for filtering
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- Create index on account_status for filtering
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Create index on last_login for activity tracking
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- Add comments for documentation
COMMENT ON COLUMN users.account_type IS 'Type of user account: student, educator, professional, researcher, other';
COMMENT ON COLUMN users.last_login IS 'Timestamp of the user''s last successful login';
COMMENT ON COLUMN users.account_status IS 'Current status of the user account';
COMMENT ON COLUMN users.timezone IS 'User''s preferred timezone';
COMMENT ON COLUMN users.institution IS 'Educational institution or organization name';
