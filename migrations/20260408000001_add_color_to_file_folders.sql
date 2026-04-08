-- Add color field to file_folders table
ALTER TABLE file_folders ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6b7280';

-- Update existing folders with default color
UPDATE file_folders SET color = '#6b7280' WHERE color IS NULL;
