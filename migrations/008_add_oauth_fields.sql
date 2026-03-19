-- Add OAuth fields to users table
-- This migration adds support for Google and Facebook OAuth authentication

-- Add OAuth provider column (google, facebook, or null for regular users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);

-- Add OAuth ID column (unique identifier from OAuth provider)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);

-- Add OAuth profile column (stores raw OAuth profile data as JSON)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS oauth_profile JSONB;

-- Create index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- OAuth users don't need password verification, so make password_hash nullable
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider name (google, facebook, or null for regular users)';
COMMENT ON COLUMN users.oauth_id IS 'Unique identifier from OAuth provider';
COMMENT ON COLUMN users.oauth_profile IS 'Raw OAuth profile data stored as JSON';
