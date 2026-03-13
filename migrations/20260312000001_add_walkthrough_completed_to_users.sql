-- Add walkthrough_completed column to users table
-- This tracks whether a user has completed the first-time walkthrough

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS walkthrough_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_walkthrough_completed 
ON users(walkthrough_completed);

-- Add comment for documentation
COMMENT ON COLUMN users.walkthrough_completed IS 'Indicates whether the user has completed the first-time product walkthrough';
