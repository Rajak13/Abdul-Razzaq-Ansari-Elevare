-- Create admin_notifications table for real-time admin notifications
-- This migration creates the notifications table with indexes for performance

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE, -- NULL for broadcast to all admins
  type VARCHAR(50) NOT NULL CHECK (type IN ('new_report', 'user_suspended', 'content_deleted', 'system_alert')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Type-specific data
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);

-- Add comment for documentation
COMMENT ON TABLE admin_notifications IS 'Real-time notifications for admin users';
COMMENT ON COLUMN admin_notifications.admin_id IS 'Target admin user ID, NULL for broadcast to all admins';
COMMENT ON COLUMN admin_notifications.type IS 'Notification type: new_report, user_suspended, content_deleted, system_alert';
COMMENT ON COLUMN admin_notifications.data IS 'Type-specific notification data in JSON format';
