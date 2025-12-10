import { Request, Response, NextFunction } from 'express';
import * as noteService from '../services/noteService';
import { 
  CreateNoteInput, 
  UpdateNoteInput, 
  NoteQueryParams, 
  CreateNoteFolderInput,
  UpdateNoteFolderInput
} from '../types/note';

/**
 * Create a new note
 * POST /api/notes
 */
export async function createNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const noteData: CreateNoteInput = req.body;

    const note = await noteService.createNote(userId, noteData);

    res.status(201).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all notes with filtering and pagination
 * GET /api/notes
 */
export async function getNotes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const params: NoteQueryParams = {
      folder_id: req.query.folder_id as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      is_collaborative: req.query.is_collaborative === 'true' ? true : 
                       req.query.is_collaborative === 'false' ? false : undefined,
      search: req.query.search as string,
      sort_by: req.query.sort_by as any,
      order: req.query.order as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await noteService.getNotes(userId, params);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single note by ID
 * GET /api/notes/:id
 */
export async function getNoteById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const noteId = req.params.id;

    const note = await noteService.getNoteById(userId, noteId);

    if (!note) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a note
 * PUT /api/notes/:id
 */
export async function updateNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const noteId = req.params.id;
    const updates: UpdateNoteInput = req.body;

    const note = await noteService.updateNote(userId, noteId, updates);

    if (!note) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a note
 * DELETE /api/notes/:id
 */
export async function deleteNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const noteId = req.params.id;

    const deleted = await noteService.deleteNote(userId, noteId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Auto-save note content
 * PUT /api/notes/:id/autosave
 */
export async function autoSaveNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const noteId = req.params.id;
    const { content } = req.body;

    if (!content && content !== '') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CONTENT',
          message: 'Content is required for auto-save',
        },
      });
      return;
    }

    const result = await noteService.autoSaveNote(userId, noteId, content);

    res.status(200).json({
      success: true,
      message: 'Note auto-saved successfully',
      timestamp: result.timestamp,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search notes by keyword
 * GET /api/notes/search
 */
export async function searchNotes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const keyword = req.query.q as string;

    if (!keyword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_KEYWORD',
          message: 'Search keyword is required',
        },
      });
      return;
    }

    const notes = await noteService.searchNotes(userId, keyword);

    res.status(200).json({
      success: true,
      notes,
      count: notes.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a note folder
 * POST /api/note-folders
 */
export async function createNoteFolder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const folderData: CreateNoteFolderInput = req.body;

    const folder = await noteService.createNoteFolder(userId, folderData);

    res.status(201).json({
      success: true,
      folder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all note folders for a user
 * GET /api/note-folders
 */
export async function getNoteFolders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const folders = await noteService.getNoteFolders(userId);

    res.status(200).json({
      success: true,
      folders,
      count: folders.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a note folder
 * PUT /api/note-folders/:id
 */
export async function updateNoteFolder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const folderId = req.params.id;
    const updates: UpdateNoteFolderInput = req.body;

    const folder = await noteService.updateNoteFolder(userId, folderId, updates);

    if (!folder) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Note folder not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      folder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a note folder
 * DELETE /api/note-folders/:id
 */
export async function deleteNoteFolder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const folderId = req.params.id;

    const deleted = await noteService.deleteNoteFolder(userId, folderId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Note folder not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Note folder deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export a note to various formats
 * POST /api/notes/:id/export
 */
export async function exportNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const noteId = req.params.id;
    const { format, include_summary = false } = req.body;

    if (!['pdf', 'markdown', 'html'].includes(format)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Format must be one of: pdf, markdown, html',
        },
      });
      return;
    }

    const exportResult = await noteService.exportNote(userId, noteId, {
      format,
      include_summary
    });

    if (!exportResult) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
      return;
    }

    // Set appropriate content type and headers
    let contentType = 'text/plain';
    let fileExtension = 'txt';
    
    switch (format) {
      case 'pdf':
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;
      case 'markdown':
        contentType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'html':
        contentType = 'text/html';
        fileExtension = 'html';
        break;
    }

    const filename = `${exportResult.title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'pdf') {
      // For PDF, we would need to convert HTML to PDF using a library like puppeteer
      // For now, return the content as text with a note about PDF conversion
      res.status(200).send(`PDF Export - ${exportResult.title}\n\n${exportResult.content}`);
    } else {
      res.status(200).send(exportResult.content);
    }
  } catch (error) {
    next(error);
  }
}