import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetConfirmValidation,
  profileUpdateValidation,
  verifyOTPValidation,
  resendOTPValidation,
} from '../middleware/validation';

const router = Router();

// Public routes with rate limiting
router.post(
  '/register',
  authLimiter,
  registerValidation,
  authController.register
);

router.post('/login', authLimiter, loginValidation, authController.login);

router.post(
  '/verify-otp',
  authLimiter,
  verifyOTPValidation,
  authController.verifyOTP
);

router.post(
  '/resend-otp',
  authLimiter,
  resendOTPValidation,
  authController.resendOTP
);

router.post(
  '/forgot-password',
  authLimiter,
  passwordResetRequestValidation,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  passwordResetConfirmValidation,
  authController.resetPassword
);

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser);

router.put(
  '/profile',
  authenticate,
  profileUpdateValidation,
  authController.updateProfile
);

export default router;
