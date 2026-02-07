-- Create suspension appeals table
CREATE TABLE IF NOT EXISTS suspension_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspension_id UUID NOT NULL REFERENCES user_suspensions(id) ON DELETE CASCADE,
  appeal_message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  admin_response TEXT,
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_user_id ON suspension_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_suspension_id ON suspension_appeals(suspension_id);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_status ON suspension_appeals(status);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_created_at ON suspension_appeals(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_suspension_appeals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suspension_appeals_updated_at
  BEFORE UPDATE ON suspension_appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_suspension_appeals_updated_at();

-- Add comments
COMMENT ON TABLE suspension_appeals IS 'User appeals against account suspensions';
COMMENT ON COLUMN suspension_appeals.status IS 'Appeal status: pending, approved, rejected, under_review';
COMMENT ON COLUMN suspension_appeals.appeal_message IS 'User message explaining why suspension should be lifted';
COMMENT ON COLUMN suspension_appeals.admin_response IS 'Admin response to the appeal';
