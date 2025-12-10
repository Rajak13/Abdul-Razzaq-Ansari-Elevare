-- Add tags to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add tags to study_groups table
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for tags arrays
CREATE INDEX IF NOT EXISTS idx_files_tags ON files USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_study_groups_tags ON study_groups USING gin(tags);

-- Update existing records to have empty tags array if NULL
UPDATE files SET tags = '{}' WHERE tags IS NULL;
UPDATE study_groups SET tags = '{}' WHERE tags IS NULL;
UPDATE tasks SET tags = '{}' WHERE tags IS NULL;
UPDATE notes SET tags = '{}' WHERE tags IS NULL;
UPDATE resources SET tags = '{}' WHERE tags IS NULL;