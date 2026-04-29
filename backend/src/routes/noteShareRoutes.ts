import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import * as noteShareService from '../services/noteShareService';

/**
 * Routes mounted at /api/notes/:noteId
 * - POST  /api/notes/:noteId/share
 * - GET   /api/notes/:noteId/shares
 */
export const noteShareNoteRoutes = express.Router({ mergeParams: true });

noteShareNoteRoutes.post('/share', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId } = req.params;
    const userId = req.user!.userId;
    const { expiresInDays } = req.body;

    const share = await noteShareService.createNoteShare(noteId, userId, expiresInDays);
    res.status(201).json({ success: true, data: share });
  } catch (error) {
    console.error('Error creating note share:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create share link',
    });
  }
});

noteShareNoteRoutes.get('/shares', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId } = req.params;
    const userId = req.user!.userId;

    const shares = await noteShareService.getNoteShares(noteId, userId);
    res.json({ success: true, data: shares });
  } catch (error) {
    console.error('Error fetching note shares:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch share links' });
  }
});

/**
 * Routes mounted at /api
 * - PATCH  /api/shares/:shareId/deactivate
 * - DELETE /api/shares/:shareId
 * - GET    /api/shares/stats
 * - GET    /api/shared/:token  (public)
 */
export const noteShareGlobalRoutes = express.Router();

noteShareGlobalRoutes.patch('/shares/:shareId/deactivate', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareId } = req.params;
    const userId = req.user!.userId;

    const success = await noteShareService.deactivateShare(shareId, userId);
    if (!success) {
      res.status(404).json({ success: false, message: 'Share link not found' });
      return;
    }
    res.json({ success: true, message: 'Share link deactivated' });
  } catch (error) {
    console.error('Error deactivating share:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate share link' });
  }
});

noteShareGlobalRoutes.delete('/shares/:shareId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareId } = req.params;
    const userId = req.user!.userId;

    const success = await noteShareService.deleteShare(shareId, userId);
    if (!success) {
      res.status(404).json({ success: false, message: 'Share link not found' });
      return;
    }
    res.json({ success: true, message: 'Share link deleted' });
  } catch (error) {
    console.error('Error deleting share:', error);
    res.status(500).json({ success: false, message: 'Failed to delete share link' });
  }
});

noteShareGlobalRoutes.get('/shares/stats', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const stats = await noteShareService.getShareStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching share stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch share statistics' });
  }
});

// PUBLIC — no auth required
noteShareGlobalRoutes.get('/shared/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const note = await noteShareService.getSharedNote(token);

    if (!note) {
      res.status(404).json({ success: false, message: 'Shared note not found or link has expired' });
      return;
    }
    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error fetching shared note:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shared note' });
  }
});
