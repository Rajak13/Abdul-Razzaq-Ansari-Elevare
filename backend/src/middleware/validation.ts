import { body, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation rules for user registration
 */
export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
];

/**
 * Validation rules for user login
 */
export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for password reset request
 */
export const passwordResetRequestValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Validation rules for password reset confirmation
 */
export const passwordResetConfirmValidation: ValidationChain[] = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
];

/**
 * Validation rules for profile update
 */
export const profileUpdateValidation: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
  body('avatar_url')
    .optional()
    .trim()
    .custom((value) => {
      // Allow empty strings, relative paths, or full URLs
      if (!value || value === '') return true;
      if (value.startsWith('/')) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('Avatar URL must be a valid URL or path'),
  body('university')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('University must be between 2 and 255 characters'),
  body('major')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Major must be between 2 and 255 characters'),
  body('graduation_date')
    .optional()
    .custom((value) => {
      // Allow empty strings or valid ISO dates
      if (!value || value === '') return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .withMessage('Graduation date must be a valid date'),
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      // Allow empty strings or valid phone numbers
      if (!value || value === '') return true;
      return value.length <= 20;
    })
    .withMessage('Phone must not exceed 20 characters'),
  body('date_of_birth')
    .optional()
    .custom((value) => {
      // Allow empty strings or valid ISO dates
      if (!value || value === '') return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be one of: male, female, other, prefer_not_to_say'),
  body('age')
    .optional()
    .custom((value) => {
      // Allow null, undefined, or valid age numbers
      if (value === null || value === undefined || value === '') return true;
      const age = parseInt(value);
      return !isNaN(age) && age >= 13 && age <= 120;
    })
    .withMessage('Age must be between 13 and 120'),
  body('account_type')
    .optional()
    .isIn(['student', 'educator', 'professional', 'researcher', 'other'])
    .withMessage('Account type must be one of: student, educator, professional, researcher, other'),
  body('institution')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Institution must be between 2 and 255 characters'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timezone must not exceed 100 characters'),
];

/**
 * Validation rules for OTP verification
 */
export const verifyOTPValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
];

/**
 * Validation rules for resending OTP
 */
export const resendOTPValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Middleware to check validation results and return errors if any
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Validation rules for language preference update
 */
export const languagePreferenceValidation: ValidationChain[] = [
  body('preferred_language')
    .notEmpty()
    .withMessage('Language preference is required')
    .isIn(['en', 'ne', 'ko'])
    .withMessage('Language must be one of: en, ne, ko'),
];
