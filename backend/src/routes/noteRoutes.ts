import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body, param } from 'express-validator';
import * as noteController from '../controllers/noteController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Note validation rules
const createNoteValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('content')
    .custom((value) => {
      // Accept both string and object (JSON) content
      return typeof value === 'string' || typeof value === 'object';
    })
    .withMessage('Content must be a string or object'),
  body('folder_id')
    .optional()
    .isUUID()
    .withMessage('Folder ID must be a valid UUID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('is_collaborative')
    .optional()
    .isBoolean()
    .withMessage('is_collaborative must be a boolean'),
];

const updateNoteValidation = [
  param('id')
    .isUUID()
    .withMessage('Note ID must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('content')
    .optional()
    .custom((value) => {
      // Accept both string and object (JSON) content
      return value === undefined || typeof value === 'string' || typeof value === 'object';
    })
    .withMessage('Content must be a string or object'),
  body('folder_id')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    })
    .withMessage('Folder ID must be a valid UUID or null'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('is_collaborative')
    .optional()
    .isBoolean()
    .withMessage('is_collaborative must be a boolean'),
];

const autoSaveValidation = [
  param('id')
    .isUUID()
    .withMessage('Note ID must be a valid UUID'),
  body('content')
    .custom((value) => {
      // Accept both string and object (JSON) content
      return typeof value === 'string' || typeof value === 'object';
    })
    .withMessage('Content must be a string or object'),
];

const exportNoteValidation = [
  param('id')
    .isUUID()
    .withMessage('Note ID must be a valid UUID'),
  body('format')
    .isIn(['pdf', 'markdown', 'html'])
    .withMessage('Format must be one of: pdf, markdown, html'),
  body('include_summary')
    .optional()
    .isBoolean()
    .withMessage('include_summary must be a boolean'),
];



// Note routes
router.post('/', createNoteValidation, validate, noteController.createNote);
router.get('/', noteController.getNotes);
router.get('/search', noteController.searchNotes);
router.get('/:id', 
  param('id').isUUID().withMessage('Note ID must be a valid UUID'),
  validate,
  noteController.getNoteById
);
router.put('/:id', updateNoteValidation, validate, noteController.updateNote);
router.put('/:id/autosave', autoSaveValidation, validate, noteController.autoSaveNote);
router.post('/:id/export', exportNoteValidation, validate, noteController.exportNote);
router.delete('/:id',
  param('id').isUUID().withMessage('Note ID must be a valid UUID'),
  validate,
  noteController.deleteNote
);

export default router;