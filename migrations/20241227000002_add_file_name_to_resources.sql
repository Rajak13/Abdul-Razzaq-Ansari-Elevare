-- Add file_name column to resources table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- Update existing records to use a default file name if needed
UPDATE resources SET file_name = 'unknown_file' WHERE file_name IS NULL;

-- Make file_name NOT NULL after updating existing records
ALTER TABLE resources ALTER COLUMN file_name SET NOT NULL;