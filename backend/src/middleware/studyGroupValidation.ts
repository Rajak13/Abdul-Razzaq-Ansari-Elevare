import { body, param, query } from 'express-validator';

export const createStudyGroupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Group name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('is_private')
    .optional()
    .isBoolean()
    .withMessage('is_private must be a boolean'),
  
  body('max_members')
    .optional()
    .isInt({ min: 2, max: 1000 })
    .withMessage('max_members must be an integer between 2 and 1000'),
];

export const updateStudyGroupValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Group name cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Group name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('is_private')
    .optional()
    .isBoolean()
    .withMessage('is_private must be a boolean'),
  
  body('max_members')
    .optional()
    .isInt({ min: 2, max: 1000 })
    .withMessage('max_members must be an integer between 2 and 1000'),
];

export const groupIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID'),
];

export const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID'),
];

export const approveRejectValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID'),
  
  body('user_id')
    .isUUID()
    .withMessage('Invalid user ID'),
];

export const sendMessageValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
];

export const getMessagesValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const getGroupsValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must not exceed 255 characters'),
  
  query('is_private')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('is_private must be true or false'),
  
  query('member_of')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('member_of must be true or false'),
  
  query('owned_by_me')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('owned_by_me must be true or false'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];