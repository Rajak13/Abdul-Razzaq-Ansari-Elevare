-- Add tags column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for tags array
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING gin(tags);