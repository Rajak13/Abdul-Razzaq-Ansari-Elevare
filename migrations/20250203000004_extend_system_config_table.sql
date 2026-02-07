-- Extend system_config table for enhanced configuration management
-- This migration adds additional columns to the existing system_config table

-- Add category column for grouping configuration settings
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Add comments for documentation
COMMENT ON COLUMN system_config.category IS 'Configuration category: maintenance, limits, notifications, security, etc.';

-- Note: Default system configuration values should be inserted after first admin user is created
-- to satisfy the updated_by foreign key constraint
