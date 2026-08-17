import { Router } from 'express';
import { authenticate, checkSuspension } from '../middleware/auth';
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
router.post('/', authenticate, checkSuspension, uploadResource, handleUploadError, uploadResourceController);
router.get('/', getResources);
router.get('/search', searchResources);
router.get('/:id', getResourceById);
router.put('/:id', authenticate, checkSuspension, updateResource);
router.delete('/:id', authenticate, checkSuspension, deleteResource);

// Resource interactions
// ✅ DESIGN DECISION: Download is intentionally public for the educational resource library
// Resources are meant to be discoverable and accessible to all users (like a public library)
// If this needs to be changed in the future, add: authenticate, checkSuspension before downloadResource
router.get('/:id/download', downloadResource);
router.post('/:id/rate', authenticate, checkSuspension, rateResource);

// Resource comments
router.get('/:id/comments', getResourceComments);
router.post('/:id/comments', authenticate, checkSuspension, addResourceComment);

export default router;