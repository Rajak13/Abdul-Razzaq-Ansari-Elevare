export interface WhiteboardElement {
  id: string;
  type: 'drawing' | 'text' | 'sticky' | 'shape' | 'image';
  position: {
    x: number;
    y: number;
  };
  properties: {
    // Drawing properties
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    points?: number[];
    
    // Text properties
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    textAlign?: string;
    
    // Shape properties
    width?: number;
    height?: number;
    radius?: number;
    
    // Sticky note properties
    color?: string;
    
    // Image properties
    src?: string;
    
    // Common properties
    rotation?: number;
    opacity?: number;
    locked?: boolean;
  };
  layer_index: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface WhiteboardSettings {
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;
  panX: number;
  panY: number;
}

export interface Whiteboard {
  id: string;
  name: string;
  description?: string;
  group_id?: string;
  user_id: string;
  canvas_data: Record<string, unknown>;
  settings: WhiteboardSettings;
  version: number;
  is_public: boolean;
  template_type?: string;
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
  last_modified_at: string;
}

export interface WhiteboardVersion {
  id: string;
  whiteboard_id: string;
  version_number: number;
  canvas_data: Record<string, unknown>;
  settings: WhiteboardSettings;
  created_by: string;
  created_at: string;
  description?: string;
}

export interface WhiteboardPermission {
  id: string;
  whiteboard_id: string;
  user_id: string;
  permission_level: 'VIEW' | 'EDIT' | 'ADMIN';
  granted_by: string;
  granted_at: string;
}

export interface CreateWhiteboardInput {
  name: string;
  description?: string;
  group_id?: string;
  is_public?: boolean;
  template_type?: string;
  settings?: Partial<WhiteboardSettings>;
}

export interface UpdateWhiteboardInput {
  name?: string;
  description?: string;
  canvas_data?: Record<string, unknown>;
  settings?: Partial<WhiteboardSettings>;
  is_public?: boolean;
}

export interface WhiteboardWithElements extends Whiteboard {
  elements: WhiteboardElement[];
  permissions?: WhiteboardPermission[];
  user_permission?: 'VIEW' | 'EDIT' | 'ADMIN';
}

export interface WhiteboardQueryParams {
  group_id?: string;
  user_id?: string;
  is_public?: boolean;
  template_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Real-time drawing events
export interface DrawingEvent {
  type: 'draw_start' | 'draw_move' | 'draw_end';
  whiteboardId: string;
  userId: string;
  data: {
    x: number;
    y: number;
    tool?: string;
    color?: string;
    size?: number;
    elementId?: string;
  };
  timestamp: number;
}

export interface ElementEvent {
  type: 'add_element' | 'update_element' | 'delete_element' | 'clear_canvas';
  whiteboardId: string;
  userId: string;
  data: {
    elementId?: string;
    element?: WhiteboardElement;
    updates?: Partial<WhiteboardElement>;
  };
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  cursor?: {
    x: number;
    y: number;
  };
  currentTool?: string;
  color?: string;
  isActive: boolean;
  lastSeen: Date;
}

export interface WhiteboardExportOptions {
  format: 'png' | 'svg' | 'pdf';
  quality?: number;
  width?: number;
  height?: number;
  includeBackground?: boolean;
}