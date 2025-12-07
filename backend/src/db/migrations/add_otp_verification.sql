-- Add OTP verification fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_users_otp_code ON users(otp_code);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
