-- Migration: Create admin notifications for existing reports
-- This ensures all existing reports are visible in the admin dashboard

-- Create notifications for all existing pending and under_review reports
INSERT INTO admin_notifications (admin_id, type, title, message, data, read, created_at)
SELECT 
  NULL as admin_id, -- Broadcast to all admins
  'new_report' as type,
  'Existing Abuse Report' as title,
  CONCAT('A ', 
    CASE content_type
      WHEN 'resource' THEN 'resource'
      WHEN 'study_group' THEN 'study group'
      WHEN 'message' THEN 'message'
      WHEN 'comment' THEN 'comment'
      WHEN 'note' THEN 'note'
      WHEN 'file' THEN 'file'
      WHEN 'whiteboard' THEN 'whiteboard'
      WHEN 'profile' THEN 'profile'
      ELSE content_type
    END,
    ' has been reported for ',
    LOWER(REPLACE(reason, '_', ' ')),
    '.'
  ) as message,
  jsonb_build_object(
    'report_id', id,
    'content_type', content_type,
    'reason', reason,
    'priority', priority
  ) as data,
  false as read,
  created_at
FROM abuse_reports
WHERE status IN ('pending', 'under_review')
AND NOT EXISTS (
  SELECT 1 FROM admin_notifications 
  WHERE data->>'report_id' = abuse_reports.id::text
);

-- Log the migration
DO $$
DECLARE
  notification_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO notification_count
  FROM admin_notifications
  WHERE type = 'new_report';
  
  RAISE NOTICE 'Created notifications for existing reports. Total notifications: %', notification_count;
END $$;
