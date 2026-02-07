-- Add summary-related columns to notes table
ALTER TABLE notes ADD COLUMN summary TEXT;
ALTER TABLE notes ADD COLUMN summary_generated_at TIMESTAMP;
ALTER TABLE notes ADD COLUMN summary_model VARCHAR(50);
ALTER TABLE notes ADD COLUMN content_hash VARCHAR(64);

-- Create index for efficient summary queries
CREATE INDEX idx_notes_summary_generated ON notes(summary_generated_at) 
WHERE summary IS NOT NULL;

-- Create index for content hash lookups
CREATE INDEX idx_notes_content_hash ON notes(content_hash) 
WHERE content_hash IS NOT NULL;

-- Add comment to document the purpose of new columns
COMMENT ON COLUMN notes.summary IS 'AI-generated summary of the note content';
COMMENT ON COLUMN notes.summary_generated_at IS 'Timestamp when the summary was generated';
COMMENT ON COLUMN notes.summary_model IS 'AI model used to generate the summary (e.g., PEGASUS)';
COMMENT ON COLUMN notes.content_hash IS 'SHA-256 hash of note content when summary was generated, used for change detection';