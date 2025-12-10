import { body, query, param } from 'express-validator';

export const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('priority')
    .notEmpty()
    .withMessage('Priority is required')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('category_id')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      if (tags && tags.some((tag: any) => typeof tag !== 'string' || tag.length > 50)) {
        throw new Error('Each tag must be a string with maximum 50 characters');
      }
      return true;
    }),
];

export const updateTaskValidation = [
  param('id')
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('status')
    .optional()
    .isIn(['pending', 'completed'])
    .withMessage('Status must be one of: pending, completed'),
  body('category_id')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      if (tags && tags.some((tag: any) => typeof tag !== 'string' || tag.length > 50)) {
        throw new Error('Each tag must be a string with maximum 50 characters');
      }
      return true;
    }),
];

export const taskIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
];

export const searchTasksValidation = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search keyword is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Search keyword must be between 1 and 200 characters'),
];

export const calendarValidation = [
  query('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
];

export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name must not exceed 100 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code (e.g., #FF5733)'),
];

export const categoryIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
];
