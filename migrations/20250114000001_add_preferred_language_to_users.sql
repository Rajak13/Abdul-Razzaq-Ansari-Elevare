-- Add preferred_language column to users table
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';

-- Add index on preferred_language for faster lookups
CREATE INDEX idx_users_preferred_language ON users(preferred_language);

-- Add comment to document the column
COMMENT ON COLUMN users.preferred_language IS 'User preferred language code (en, ne, ko)';
