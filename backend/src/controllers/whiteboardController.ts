import { Request, Response, NextFunction } from 'express';
import * as whiteboardService from '../services/whiteboardService';
import { CreateWhiteboardInput, UpdateWhiteboardInput, WhiteboardQueryParams } from '../types/whiteboard';

/**
 * Create a new whiteboard
 * POST /api/whiteboards
 */
export async function createWhiteboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardData: CreateWhiteboardInput = req.body;

    const whiteboard = await whiteboardService.createWhiteboard(userId, whiteboardData);

    res.status(201).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get whiteboards for a specific group
 * GET /api/whiteboards/group/:groupId
 */
export async function getGroupWhiteboards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.groupId;

    const whiteboards = await whiteboardService.getGroupWhiteboards(userId, groupId);

    res.status(200).json({
      success: true,
      whiteboards,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all whiteboards with filtering and pagination
 * GET /api/whiteboards
 */
export async function getWhiteboards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const params: WhiteboardQueryParams = {
      group_id: req.query.group_id as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await whiteboardService.getWhiteboards(userId, params);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single whiteboard by ID
 * GET /api/whiteboards/:id
 */
export async function getWhiteboardById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    
    // Parse pagination parameters
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    
    const options = (page !== undefined || limit !== undefined) ? { page, limit } : undefined;

    const whiteboard = await whiteboardService.getWhiteboardById(userId, whiteboardId, options);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a whiteboard
 * PUT /api/whiteboards/:id
 */
export async function updateWhiteboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const updates: UpdateWhiteboardInput = req.body;

    const whiteboard = await whiteboardService.updateWhiteboard(userId, whiteboardId, updates);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Store canvas elements
 * PUT /api/whiteboards/:id/elements
 */
export async function storeCanvasElements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const { elements } = req.body;

    if (!Array.isArray(elements)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ELEMENTS',
          message: 'Elements must be an array',
        },
      });
      return;
    }

    const whiteboard = await whiteboardService.storeCanvasElements(userId, whiteboardId, elements);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a single canvas element
 * POST /api/whiteboards/:id/elements
 */
export async function addCanvasElement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const element = req.body;

    const whiteboard = await whiteboardService.addCanvasElement(userId, whiteboardId, element);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a canvas element
 * PUT /api/whiteboards/:id/elements/:elementId
 */
export async function updateCanvasElement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const elementId = req.params.elementId;
    const elementData = req.body;

    const whiteboard = await whiteboardService.updateCanvasElement(userId, whiteboardId, elementId, elementData);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a canvas element
 * DELETE /api/whiteboards/:id/elements/:elementId
 */
export async function deleteCanvasElement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const elementId = req.params.elementId;

    const whiteboard = await whiteboardService.deleteCanvasElement(userId, whiteboardId, elementId);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get whiteboard version history
 * GET /api/whiteboards/:id/history
 */
export async function getWhiteboardHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await whiteboardService.getWhiteboardHistory(userId, whiteboardId, { page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Restore whiteboard to a previous version
 * POST /api/whiteboards/:id/restore
 */
export async function restoreWhiteboardVersion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const { versionNumber } = req.body;

    if (!versionNumber || typeof versionNumber !== 'number') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VERSION',
          message: 'Version number is required and must be a number',
        },
      });
      return;
    }

    const whiteboard = await whiteboardService.restoreWhiteboardVersion(userId, whiteboardId, versionNumber);

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      whiteboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a manual version snapshot
 * POST /api/whiteboards/:id/versions
 */
export async function createWhiteboardVersion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;

    // Get current whiteboard data
    const whiteboard = await whiteboardService.getWhiteboardById(userId, whiteboardId);
    if (!whiteboard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    const canvasData = typeof whiteboard.canvas_data === 'string' 
      ? JSON.parse(whiteboard.canvas_data) 
      : whiteboard.canvas_data;

    const version = await whiteboardService.createWhiteboardVersion(userId, whiteboardId, canvasData);

    res.status(201).json({
      success: true,
      version,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export whiteboard
 * POST /api/whiteboards/:id/export
 */
export async function exportWhiteboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;
    const { format = 'png', width, height } = req.body;

    if (!['png', 'svg'].includes(format)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Format must be either "png" or "svg"',
        },
      });
      return;
    }

    const exportResult = await whiteboardService.exportWhiteboard(
      userId,
      whiteboardId,
      format,
      { width, height }
    );

    if (!exportResult) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    // Set appropriate headers for file download
    const filename = `whiteboard-${whiteboardId}.${format}`;
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'svg') {
      // Send SVG as text
      res.status(200).send(exportResult.data);
    } else {
      // Send PNG as base64 decoded buffer
      const buffer = Buffer.from(exportResult.data, 'base64');
      res.status(200).send(buffer);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a whiteboard
 * DELETE /api/whiteboards/:id
 */
export async function deleteWhiteboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const whiteboardId = req.params.id;

    const deleted = await whiteboardService.deleteWhiteboard(userId, whiteboardId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WHITEBOARD_NOT_FOUND',
          message: 'Whiteboard not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Whiteboard deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}