import express from 'express';
import { authenticateToken } from '../middleware/auth';
import * as noteShareService from '../services/noteShareService';

const router = express.Router();

/**
 * Create a share link for a note (authenticated)
 * POST /api/notes/:noteId/share
 */
router.post('/:noteId/share', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user!.userId;
    const { expiresInDays } = req.body;
    
    const share = await noteShareService.createNoteShare(
      noteId,
      userId,
      expiresInDays
    );
    
    res.status(201).json({
      success: true,
      data: share,
    });
  } catch (error) {
    console.error('Error creating note share:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create share link',
    });
  }
});

/**
 * Get all shares for a note (authenticated)
 * GET /api/notes/:noteId/shares
 */
router.get('/:noteId/shares', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user!.userId;
    
    const shares = await noteShareService.getNoteShares(noteId, userId);
    
    res.json({
      success: true,
      data: shares,
    });
  } catch (error) {
    console.error('Error fetching note shares:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch share links',
    });
  }
});

/**
 * Deactivate a share link (authenticated)
 * PATCH /api/shares/:shareId/deactivate
 */
router.patch('/shares/:shareId/deactivate', authenticateToken, async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user!.userId;
    
    const success = await noteShareService.deactivateShare(shareId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Share link not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Share link deactivated',
    });
  } catch (error) {
    console.error('Error deactivating share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate share link',
    });
  }
});

/**
 * Delete a share link (authenticated)
 * DELETE /api/shares/:shareId
 */
router.delete('/shares/:shareId', authenticateToken, async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user!.userId;
    
    const success = await noteShareService.deleteShare(shareId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Share link not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Share link deleted',
    });
  } catch (error) {
    console.error('Error deleting share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete share link',
    });
  }
});

/**
 * Get share statistics (authenticated)
 * GET /api/shares/stats
 */
router.get('/shares/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    const stats = await noteShareService.getShareStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching share stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch share statistics',
    });
  }
});

/**
 * Get a shared note by token (PUBLIC - no auth required)
 * GET /api/shared/:token
 */
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const note = await noteShareService.getSharedNote(token);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Shared note not found or link has expired',
      });
    }
    
    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error('Error fetching shared note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared note',
    });
  }
});

export default router;
