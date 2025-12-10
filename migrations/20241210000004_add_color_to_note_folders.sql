-- Add color field to note_folders table
ALTER TABLE note_folders ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6b7280';

-- Update existing folders with default colors
UPDATE note_folders SET color = '#6b7280' WHERE color IS NULL;