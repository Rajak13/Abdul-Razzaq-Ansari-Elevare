import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body, param } from 'express-validator';
import * as noteController from '../controllers/noteController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Note folder validation rules
const createFolderValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Folder name must be between 1 and 255 characters'),
  body('parent_id')
    .optional()
    .isUUID()
    .withMessage('Parent ID must be a valid UUID'),
];

const updateFolderValidation = [
  param('id')
    .isUUID()
    .withMessage('Folder ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Folder name must be between 1 and 255 characters'),
  body('parent_id')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    })
    .withMessage('Parent ID must be a valid UUID or null'),
];

// Note folder routes
router.post('/', createFolderValidation, validate, noteController.createNoteFolder);
router.get('/', noteController.getNoteFolders);
router.put('/:id', updateFolderValidation, validate, noteController.updateNoteFolder);
router.delete('/:id',
  param('id').isUUID().withMessage('Folder ID must be a valid UUID'),
  validate,
  noteController.deleteNoteFolder
);

export default router;