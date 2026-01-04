import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadResource, handleUploadError } from '../middleware/uploadMiddleware';
import {
  uploadResource as uploadResourceController,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  searchResources,
  downloadResource,
  rateResource,
  getResourceComments,
  addResourceComment
} from '../controllers/resourceController';

const router = Router();

// Resource CRUD operations
router.post('/', authenticate, uploadResource, handleUploadError, uploadResourceController);
router.get('/', getResources);
router.get('/search', searchResources);
router.get('/:id', getResourceById);
router.put('/:id', authenticate, updateResource);
router.delete('/:id', authenticate, deleteResource);

// Resource interactions
router.get('/:id/download', downloadResource);
router.post('/:id/rate', authenticate, rateResource);

// Resource comments
router.get('/:id/comments', getResourceComments);
router.post('/:id/comments', authenticate, addResourceComment);

export default router;