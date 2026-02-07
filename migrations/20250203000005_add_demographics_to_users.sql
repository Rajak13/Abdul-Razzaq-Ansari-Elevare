-- Add demographic fields to users table
-- This migration adds gender and age columns for user profile analytics

-- Add gender column with predefined options
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(30) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add age column with validation
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 13 AND age <= 120);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender) WHERE gender IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_age ON users(age) WHERE age IS NOT NULL;

-- Create composite index for demographic analytics
CREATE INDEX IF NOT EXISTS idx_users_demographics ON users(gender, age) WHERE gender IS NOT NULL OR age IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.gender IS 'User gender: male, female, other, prefer_not_to_say (optional)';
COMMENT ON COLUMN users.age IS 'User age in years, must be between 13 and 120 (optional)';
