import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as whiteboardController from '../controllers/whiteboardController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Whiteboard CRUD routes
router.post('/', whiteboardController.createWhiteboard);
router.get('/', whiteboardController.getWhiteboards);
router.get('/group/:groupId', whiteboardController.getGroupWhiteboards);
router.get('/:id', whiteboardController.getWhiteboardById);
router.put('/:id', whiteboardController.updateWhiteboard);
router.delete('/:id', whiteboardController.deleteWhiteboard);

// Element management routes
router.put('/:id/elements', whiteboardController.storeCanvasElements);
router.post('/:id/elements', whiteboardController.addCanvasElement);
router.put('/:id/elements/:elementId', whiteboardController.updateCanvasElement);
router.delete('/:id/elements/:elementId', whiteboardController.deleteCanvasElement);

// Version and history routes
router.get('/:id/history', whiteboardController.getWhiteboardHistory);
router.post('/:id/restore', whiteboardController.restoreWhiteboardVersion);
router.post('/:id/versions', whiteboardController.createWhiteboardVersion);
router.post('/:id/export', whiteboardController.exportWhiteboard);

export default router;