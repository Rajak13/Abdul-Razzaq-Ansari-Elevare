import { Router } from 'express';
import { authenticate, checkSuspension } from '../middleware/auth';
import { uploadFile, handleUploadError } from '../middleware/uploadMiddleware';
import {
  uploadFile as uploadFileController,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  downloadFile,
  shareFile,
  searchFiles,
  createFileFolder,
  getFileFolders,
  getFileFolderById,
  updateFileFolder,
  deleteFileFolder
} from '../controllers/fileController';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(checkSuspension);

// File folder management routes (must be before /:id routes)
router.post('/folders', createFileFolder);
router.get('/folders', getFileFolders);
router.get('/folders/:id', getFileFolderById);
router.put('/folders/:id', updateFileFolder);
router.delete('/folders/:id', deleteFileFolder);

// File management routes
router.post('/', uploadFile, handleUploadError, uploadFileController);
router.get('/', getFiles);
router.get('/search', searchFiles);
router.get('/:id', getFileById);
router.put('/:id', updateFile);
router.delete('/:id', deleteFile);
router.get('/:id/download', downloadFile);
router.post('/:id/share', shareFile);

export default router;