import { body, param } from 'express-validator';

export const createWhiteboardValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Whiteboard name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Whiteboard name must be between 1 and 255 characters'),
  
  body('group_id')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
];

export const updateWhiteboardValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Whiteboard name cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Whiteboard name must be between 1 and 255 characters'),
  
  body('canvas_data')
    .optional()
    .isObject()
    .withMessage('Canvas data must be a valid object'),
];

export const whiteboardIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Whiteboard ID must be a valid UUID'),
];