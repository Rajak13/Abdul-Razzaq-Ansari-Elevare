-- Add sort_order field to tasks table for drag-and-drop functionality
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(user_id, sort_order);

-- Update existing tasks to have sequential sort_order based on created_at
UPDATE tasks 
SET sort_order = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_number
  FROM tasks
) AS subquery
WHERE tasks.id = subquery.id;