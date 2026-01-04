import { body, query } from 'express-validator';

/**
 * Validation for universal search endpoint
 */
export const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters')
    .trim(),

  query('content_type')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const types = value.split(',');
        const validTypes = ['task', 'note', 'resource', 'file'];
        return types.every(type => validTypes.includes(type.trim()));
      } else if (Array.isArray(value)) {
        const validTypes = ['task', 'note', 'resource', 'file'];
        return value.every(type => validTypes.includes(type));
      }
      return false;
    })
    .withMessage('Content type must be one or more of: task, note, resource, file'),

  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('date_from must be a valid ISO 8601 date'),

  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('date_to must be a valid ISO 8601 date'),

  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return value.split(',').every(tag => tag.trim().length > 0);
      } else if (Array.isArray(value)) {
        return value.every(tag => typeof tag === 'string' && tag.trim().length > 0);
      }
      return false;
    })
    .withMessage('Tags must be a comma-separated string or array of non-empty strings'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

/**
 * Validation for multi-keyword search endpoint
 */
export const multiKeywordSearchValidation = [
  body('keywords')
    .isArray({ min: 1, max: 10 })
    .withMessage('Keywords must be an array with 1-10 items')
    .custom((keywords) => {
      return keywords.every((keyword: any) => 
        typeof keyword === 'string' && 
        keyword.trim().length > 0 && 
        keyword.trim().length <= 100
      );
    })
    .withMessage('Each keyword must be a non-empty string with max 100 characters'),

  body('content_type')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        const validTypes = ['task', 'note', 'resource', 'file'];
        return value.every(type => validTypes.includes(type));
      } else if (typeof value === 'string') {
        const validTypes = ['task', 'note', 'resource', 'file'];
        return validTypes.includes(value);
      }
      return false;
    })
    .withMessage('Content type must be one or more of: task, note, resource, file'),

  body('date_from')
    .optional()
    .isISO8601()
    .withMessage('date_from must be a valid ISO 8601 date'),

  body('date_to')
    .optional()
    .isISO8601()
    .withMessage('date_to must be a valid ISO 8601 date'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      return tags.every((tag: any) => typeof tag === 'string' && tag.trim().length > 0);
    })
    .withMessage('Each tag must be a non-empty string'),
];