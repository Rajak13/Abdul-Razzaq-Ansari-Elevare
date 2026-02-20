-- Add 'comment' to the allowed content_type values in abuse_reports table
-- This allows users to report resource comments

-- Drop the existing constraint
ALTER TABLE abuse_reports DROP CONSTRAINT IF EXISTS abuse_reports_content_type_check;

-- Add the new constraint with 'comment' included
ALTER TABLE abuse_reports ADD CONSTRAINT abuse_reports_content_type_check 
  CHECK (content_type IN ('note', 'message', 'file', 'resource', 'whiteboard', 'profile', 'study_group', 'comment'));

-- Add comment for documentation
COMMENT ON CONSTRAINT abuse_reports_content_type_check ON abuse_reports IS 'Allowed content types for abuse reports including comments';
