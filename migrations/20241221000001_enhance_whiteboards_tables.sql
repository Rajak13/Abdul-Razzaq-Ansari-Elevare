-- Add missing columns to whiteboards table
ALTER TABLE whiteboards 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"width": 1920, "height": 1080, "backgroundColor": "#ffffff", "gridEnabled": true, "snapToGrid": false, "gridSize": 20, "zoom": 1, "panX": 0, "panY": 0}',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP;

-- Update whiteboard_elements table structure to match enhanced service
ALTER TABLE whiteboard_elements 
DROP COLUMN IF EXISTS element_type,
DROP COLUMN IF EXISTS element_data,
ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'drawing',
ADD COLUMN IF NOT EXISTS position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS layer_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Update whiteboard_versions table structure
ALTER TABLE whiteboard_versions 
ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create whiteboard_permissions table
CREATE TABLE IF NOT EXISTS whiteboard_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('VIEW', 'EDIT', 'ADMIN')),
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(whiteboard_id, user_id)
);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_type ON whiteboard_elements(type);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_layer_index ON whiteboard_elements(layer_index);
CREATE INDEX IF NOT EXISTS idx_whiteboard_permissions_whiteboard_id ON whiteboard_permissions(whiteboard_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_permissions_user_id ON whiteboard_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_whiteboards_is_public ON whiteboards(is_public);
CREATE INDEX IF NOT EXISTS idx_whiteboards_template_type ON whiteboards(template_type);

-- Update existing data to have proper structure
UPDATE whiteboard_elements 
SET type = COALESCE(element_type, 'drawing'),
    position = COALESCE(element_data->>'position', '{"x": 0, "y": 0}')::jsonb,
    properties = COALESCE(element_data, '{}')
WHERE type IS NULL OR position IS NULL;

-- Remove old columns if they exist (after data migration)
-- Note: This is commented out to prevent data loss. Run manually after verifying data migration.
-- ALTER TABLE whiteboard_elements DROP COLUMN IF EXISTS element_type;
-- ALTER TABLE whiteboard_elements DROP COLUMN IF EXISTS element_data;