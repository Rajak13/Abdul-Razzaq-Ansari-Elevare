-- Calculate age from date_of_birth for existing users
-- This migration updates the age field based on date_of_birth

UPDATE users 
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))::INTEGER
WHERE date_of_birth IS NOT NULL 
  AND (age IS NULL OR age = 0);

-- Add a comment explaining the age field
COMMENT ON COLUMN users.age IS 'User age calculated from date_of_birth. Automatically updated on profile save.';
