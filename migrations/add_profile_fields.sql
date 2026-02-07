-- Add missing profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS university VARCHAR(255),
ADD COLUMN IF NOT EXISTS major VARCHAR(255),
ADD COLUMN IF NOT EXISTS graduation_date DATE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_university ON users(university);
CREATE INDEX IF NOT EXISTS idx_users_major ON users(major);