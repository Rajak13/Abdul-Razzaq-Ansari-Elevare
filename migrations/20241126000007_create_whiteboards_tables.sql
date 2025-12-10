-- Create whiteboards table
CREATE TABLE IF NOT EXISTS whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  canvas_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create whiteboard_elements table (for individual drawing elements)
CREATE TABLE IF NOT EXISTS whiteboard_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  element_type VARCHAR(50) NOT NULL,
  element_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create whiteboard_versions table (for version history)
CREATE TABLE IF NOT EXISTS whiteboard_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  canvas_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_whiteboards_group_id ON whiteboards(group_id);
CREATE INDEX idx_whiteboards_user_id ON whiteboards(user_id);
CREATE INDEX idx_whiteboard_elements_whiteboard_id ON whiteboard_elements(whiteboard_id);
CREATE INDEX idx_whiteboard_versions_whiteboard_id ON whiteboard_versions(whiteboard_id);
CREATE INDEX idx_whiteboard_versions_created_at ON whiteboard_versions(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_whiteboards_updated_at
  BEFORE UPDATE ON whiteboards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whiteboard_elements_updated_at
  BEFORE UPDATE ON whiteboard_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
