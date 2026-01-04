import { query } from '../db/connection';
import {
  Whiteboard,
  CreateWhiteboardInput,
  UpdateWhiteboardInput,
  WhiteboardQueryParams,
} from '../types/whiteboard';
import logger from '../utils/logger';

/**
 * Create a new whiteboard
 */
export async function createWhiteboard(
  userId: string,
  whiteboardData: CreateWhiteboardInput
): Promise<Whiteboard> {
  try {
    const { name, group_id } = whiteboardData;

    // Initialize empty canvas data
    const emptyCanvasData = {
      elements: [],
      version: 1,
      background: '#ffffff'
    };

    const result = await query<Whiteboard>(
      `INSERT INTO whiteboards (user_id, name, group_id, canvas_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, group_id || null, JSON.stringify(emptyCanvasData)]
    );

    logger.info('Whiteboard created', { whiteboardId: result.rows[0].id, userId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating whiteboard', { error, userId, whiteboardData });
    throw error;
  }
}

/**
 * Get whiteboards for a specific group
 */
export async function getGroupWhiteboards(
  userId: string,
  groupId: string
): Promise<Whiteboard[]> {
  try {
    // First check if user is a member of the group
    const memberCheck = await query<{ role: string }>(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('You are not a member of this group');
    }

    // Get whiteboards for the group with permissions - All group members can edit
    const result = await query<Whiteboard & { creator_name: string; permission: string }>(
      `SELECT w.*, u.name as creator_name,
              CASE 
                WHEN w.user_id = $2 THEN 'ADMIN'
                ELSE 'EDIT'
              END as permission
       FROM whiteboards w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN group_members gm ON gm.group_id = w.group_id AND gm.user_id = $2
       WHERE w.group_id = $1
       ORDER BY w.created_at DESC`,
      [groupId, userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting group whiteboards', { error, userId, groupId });
    throw error;
  }
}

/**
 * Get all whiteboards for a user with filtering and pagination
 */
export async function getWhiteboards(
  userId: string,
  params: WhiteboardQueryParams
): Promise<{ whiteboards: Whiteboard[]; total: number; page: number; limit: number }> {
  try {
    const {
      group_id,
      page = 1,
      limit = 50,
    } = params;

    // Build WHERE clause
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (group_id) {
      conditions.push(`group_id = $${paramIndex}`);
      values.push(group_id);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM whiteboards WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get whiteboards with pagination
    const offset = (page - 1) * limit;
    const whiteboardsResult = await query<Whiteboard>(
      `SELECT * FROM whiteboards 
       WHERE ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      whiteboards: whiteboardsResult.rows,
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Error getting whiteboards', { error, userId, params });
    throw error;
  }
}

/**
 * Get a single whiteboard by ID with pagination support for large whiteboards
 */
export async function getWhiteboardById(
  userId: string,
  whiteboardId: string,
  options?: { page?: number; limit?: number }
): Promise<Whiteboard | null> {
  try {
    const result = await query<Whiteboard>(
      'SELECT * FROM whiteboards WHERE id = $1 AND user_id = $2',
      [whiteboardId, userId]
    );

    const whiteboard = result.rows[0];
    if (!whiteboard) {
      return null;
    }

    // If pagination options are provided, paginate the elements
    if (options && (options.page !== undefined || options.limit !== undefined)) {
      const { page = 1, limit = 100 } = options;
      
      // Parse canvas data
      const canvasData = typeof whiteboard.canvas_data === 'string' 
        ? JSON.parse(whiteboard.canvas_data) 
        : whiteboard.canvas_data;

      // Paginate elements
      const elements = canvasData.elements || [];
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedElements = elements.slice(startIndex, endIndex);

      // Return whiteboard with paginated elements
      return {
        ...whiteboard,
        canvas_data: {
          ...canvasData,
          elements: paginatedElements,
          pagination: {
            page,
            limit,
            total: elements.length,
            totalPages: Math.ceil(elements.length / limit)
          }
        }
      };
    }

    return whiteboard;
  } catch (error) {
    logger.error('Error getting whiteboard by ID', { error, userId, whiteboardId });
    throw error;
  }
}

/**
 * Update a whiteboard
 */
export async function updateWhiteboard(
  userId: string,
  whiteboardId: string,
  updates: UpdateWhiteboardInput
): Promise<Whiteboard | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.canvas_data !== undefined) {
      updateFields.push(`canvas_data = $${paramIndex}`);
      values.push(JSON.stringify(updates.canvas_data));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return whiteboard;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    values.push(whiteboardId, userId);
    const result = await query<Whiteboard>(
      `UPDATE whiteboards 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    logger.info('Whiteboard updated', { whiteboardId, userId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating whiteboard', { error, userId, whiteboardId, updates });
    throw error;
  }
}

/**
 * Store canvas elements in whiteboard
 */
export async function storeCanvasElements(
  userId: string,
  whiteboardId: string,
  elements: any[]
): Promise<Whiteboard | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    // Parse existing canvas data
    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    // Update canvas data with new elements
    const updatedCanvasData = {
      ...canvasData,
      elements: elements,
      version: (canvasData.version || 1) + 1,
      lastModified: new Date().toISOString()
    };

    const result = await query<Whiteboard>(
      `UPDATE whiteboards 
       SET canvas_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(updatedCanvasData), whiteboardId, userId]
    );

    logger.info('Canvas elements stored', { whiteboardId, userId, elementCount: elements.length });
    return result.rows[0];
  } catch (error) {
    logger.error('Error storing canvas elements', { error, userId, whiteboardId });
    throw error;
  }
}

/**
 * Add a single element to whiteboard
 */
export async function addCanvasElement(
  userId: string,
  whiteboardId: string,
  element: any
): Promise<Whiteboard | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    // Parse existing canvas data
    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    // Add new element
    const updatedElements = [...(canvasData.elements || []), element];
    const updatedCanvasData = {
      ...canvasData,
      elements: updatedElements,
      version: (canvasData.version || 1) + 1,
      lastModified: new Date().toISOString()
    };

    const result = await query<Whiteboard>(
      `UPDATE whiteboards 
       SET canvas_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(updatedCanvasData), whiteboardId, userId]
    );

    logger.info('Canvas element added', { whiteboardId, userId, elementType: element.type });
    return result.rows[0];
  } catch (error) {
    logger.error('Error adding canvas element', { error, userId, whiteboardId });
    throw error;
  }
}

/**
 * Update a specific element in whiteboard
 */
export async function updateCanvasElement(
  userId: string,
  whiteboardId: string,
  elementId: string,
  elementData: any
): Promise<Whiteboard | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    // Parse existing canvas data
    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    // Update specific element
    const updatedElements = (canvasData.elements || []).map((element: any) =>
      element.id === elementId ? { ...element, ...elementData } : element
    );

    const updatedCanvasData = {
      ...canvasData,
      elements: updatedElements,
      version: (canvasData.version || 1) + 1,
      lastModified: new Date().toISOString()
    };

    const result = await query<Whiteboard>(
      `UPDATE whiteboards 
       SET canvas_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(updatedCanvasData), whiteboardId, userId]
    );

    logger.info('Canvas element updated', { whiteboardId, userId, elementId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating canvas element', { error, userId, whiteboardId, elementId });
    throw error;
  }
}

/**
 * Delete a specific element from whiteboard
 */
export async function deleteCanvasElement(
  userId: string,
  whiteboardId: string,
  elementId: string
): Promise<Whiteboard | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    // Parse existing canvas data
    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    // Remove specific element
    const updatedElements = (canvasData.elements || []).filter((element: any) =>
      element.id !== elementId
    );

    const updatedCanvasData = {
      ...canvasData,
      elements: updatedElements,
      version: (canvasData.version || 1) + 1,
      lastModified: new Date().toISOString()
    };

    const result = await query<Whiteboard>(
      `UPDATE whiteboards 
       SET canvas_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(updatedCanvasData), whiteboardId, userId]
    );

    logger.info('Canvas element deleted', { whiteboardId, userId, elementId });
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting canvas element', { error, userId, whiteboardId, elementId });
    throw error;
  }
}

/**
 * Export whiteboard to PNG or SVG
 */
export async function exportWhiteboard(
  userId: string,
  whiteboardId: string,
  format: 'png' | 'svg',
  options?: { width?: number; height?: number }
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    // Parse canvas data
    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    const elements = canvasData.elements || [];
    const { width = 1920, height = 1080 } = options || {};

    if (format === 'svg') {
      // Generate SVG
      const svgContent = generateSVG(elements, width, height, canvasData.background || '#ffffff');
      
      logger.info('Whiteboard exported as SVG', { whiteboardId, userId, elementCount: elements.length });
      
      return {
        data: svgContent,
        mimeType: 'image/svg+xml'
      };
    } else {
      // For PNG export, we would need a library like puppeteer or canvas
      // For now, return a base64 encoded placeholder or implement with a proper image library
      const pngData = generatePNGPlaceholder(elements, width, height);
      
      logger.info('Whiteboard exported as PNG', { whiteboardId, userId, elementCount: elements.length });
      
      return {
        data: pngData,
        mimeType: 'image/png'
      };
    }
  } catch (error) {
    logger.error('Error exporting whiteboard', { error, userId, whiteboardId, format });
    throw error;
  }
}

/**
 * Generate SVG content from whiteboard elements
 */
function generateSVG(elements: any[], width: number, height: number, background: string): string {
  let svgElements = '';

  elements.forEach(element => {
    const { type, data, position } = element;
    const { x, y } = position;

    switch (type) {
      case 'text':
        const textStyle = data.style || {};
        svgElements += `<text x="${x}" y="${y}" fill="${textStyle.color || '#000000'}" font-size="${textStyle.size || 16}" font-family="${textStyle.fontFamily || 'Arial'}">${escapeXml(data.content || '')}</text>\n`;
        break;
        
      case 'shape':
        if (data.shapeType === 'rectangle') {
          const rectStyle = data.style || {};
          svgElements += `<rect x="${x}" y="${y}" width="${data.width || 100}" height="${data.height || 100}" fill="${rectStyle.fillColor || 'transparent'}" stroke="${rectStyle.strokeColor || '#000000'}" stroke-width="${rectStyle.strokeWidth || 1}"/>\n`;
        } else if (data.shapeType === 'circle') {
          const circleStyle = data.style || {};
          svgElements += `<circle cx="${x}" cy="${y}" r="${data.radius || 50}" fill="${circleStyle.fillColor || 'transparent'}" stroke="${circleStyle.strokeColor || '#000000'}" stroke-width="${circleStyle.strokeWidth || 1}"/>\n`;
        } else if (data.shapeType === 'polygon' && data.points) {
          const polygonStyle = data.style || {};
          const points = data.points.map((p: any) => `${p.x + x},${p.y + y}`).join(' ');
          svgElements += `<polygon points="${points}" fill="${polygonStyle.fillColor || 'transparent'}" stroke="${polygonStyle.strokeColor || '#000000'}" stroke-width="${polygonStyle.strokeWidth || 1}"/>\n`;
        }
        break;
        
      case 'drawing':
        if (data.path) {
          const drawingStyle = data.style || {};
          svgElements += `<path d="${data.path}" fill="none" stroke="${drawingStyle.color || '#000000'}" stroke-width="${drawingStyle.size || 2}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
        }
        break;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${background}"/>
  ${svgElements}
</svg>`;
}

/**
 * Generate PNG placeholder (in a real implementation, use canvas or puppeteer)
 */
function generatePNGPlaceholder(elements: any[], width: number, height: number): string {
  // This is a placeholder implementation
  // In a real application, you would use a library like:
  // - node-canvas to generate actual PNG data
  // - puppeteer to render SVG to PNG
  // - sharp for image processing
  
  const metadata = {
    width,
    height,
    elementCount: elements.length,
    timestamp: new Date().toISOString()
  };
  
  // Return base64 encoded metadata as placeholder
  return Buffer.from(JSON.stringify(metadata)).toString('base64');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get whiteboard version history
 */
export async function getWhiteboardHistory(
  userId: string,
  whiteboardId: string,
  options?: { page?: number; limit?: number }
): Promise<{ versions: any[]; total: number; page: number; limit: number }> {
  try {
    // First verify user has access to the whiteboard
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      throw new Error('Whiteboard not found');
    }

    const { page = 1, limit = 20 } = options || {};

    // Get total count of versions
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM whiteboard_versions WHERE whiteboard_id = $1',
      [whiteboardId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get versions with pagination
    const offset = (page - 1) * limit;
    const versionsResult = await query(
      `SELECT * FROM whiteboard_versions 
       WHERE whiteboard_id = $1
       ORDER BY version_number DESC
       LIMIT $2 OFFSET $3`,
      [whiteboardId, limit, offset]
    );

    return {
      versions: versionsResult.rows,
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Error getting whiteboard history', { error, userId, whiteboardId });
    throw error;
  }
}

/**
 * Create a version snapshot of the whiteboard
 */
export async function createWhiteboardVersion(
  userId: string,
  whiteboardId: string,
  canvasData: object
): Promise<any> {
  try {
    // Get the next version number
    const versionResult = await query<{ max_version: number }>(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM whiteboard_versions WHERE whiteboard_id = $1',
      [whiteboardId]
    );
    const nextVersion = (versionResult.rows[0].max_version || 0) + 1;

    // Create version snapshot
    const result = await query(
      `INSERT INTO whiteboard_versions (whiteboard_id, version_number, canvas_data, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [whiteboardId, nextVersion, JSON.stringify(canvasData), userId]
    );

    logger.info('Whiteboard version created', { whiteboardId, userId, version: nextVersion });
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating whiteboard version', { error, userId, whiteboardId });
    throw error;
  }
}

/**
 * Restore whiteboard to a previous version
 */
export async function restoreWhiteboardVersion(
  userId: string,
  whiteboardId: string,
  versionNumber: number
): Promise<Whiteboard | null> {
  try {
    // First verify user has access to the whiteboard
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    // Get the version data
    const versionResult = await query(
      'SELECT * FROM whiteboard_versions WHERE whiteboard_id = $1 AND version_number = $2',
      [whiteboardId, versionNumber]
    );

    if (versionResult.rows.length === 0) {
      throw new Error('Version not found');
    }

    const version = versionResult.rows[0];
    const versionCanvasData = typeof version.canvas_data === 'string' 
      ? JSON.parse(version.canvas_data) 
      : version.canvas_data;

    // Create a new version snapshot of current state before restoring
    const currentCanvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;
    
    await createWhiteboardVersion(userId, whiteboardId, currentCanvasData);

    // Update whiteboard with the version data
    const updatedCanvasData = {
      ...versionCanvasData,
      version: (currentCanvasData.version || 1) + 1,
      lastModified: new Date().toISOString(),
      restoredFrom: versionNumber
    };

    const result = await query<Whiteboard>(
      `UPDATE whiteboards 
       SET canvas_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(updatedCanvasData), whiteboardId, userId]
    );

    logger.info('Whiteboard restored to version', { whiteboardId, userId, versionNumber });
    return result.rows[0];
  } catch (error) {
    logger.error('Error restoring whiteboard version', { error, userId, whiteboardId, versionNumber });
    throw error;
  }
}

/**
 * Auto-save whiteboard version (called periodically or on significant changes)
 */
export async function autoSaveWhiteboardVersion(
  userId: string,
  whiteboardId: string
): Promise<any | null> {
  try {
    const whiteboard = await getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      return null;
    }

    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    // Check if we should create a new version (e.g., if enough time has passed or significant changes)
    const lastVersionResult = await query(
      `SELECT * FROM whiteboard_versions 
       WHERE whiteboard_id = $1 
       ORDER BY version_number DESC 
       LIMIT 1`,
      [whiteboardId]
    );

    const shouldCreateVersion = lastVersionResult.rows.length === 0 || 
      (Date.now() - new Date(lastVersionResult.rows[0].created_at).getTime()) > 300000; // 5 minutes

    if (shouldCreateVersion) {
      return await createWhiteboardVersion(userId, whiteboardId, canvasData);
    }

    return null;
  } catch (error) {
    logger.error('Error auto-saving whiteboard version', { error, userId, whiteboardId });
    throw error;
  }
}

/**
 * Delete a whiteboard
 */
export async function deleteWhiteboard(
  userId: string,
  whiteboardId: string
): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM whiteboards WHERE id = $1 AND user_id = $2',
      [whiteboardId, userId]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info('Whiteboard deleted', { whiteboardId, userId });
    }
    return deleted;
  } catch (error) {
    logger.error('Error deleting whiteboard', { error, userId, whiteboardId });
    throw error;
  }
}