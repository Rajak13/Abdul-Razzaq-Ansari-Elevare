import { Router } from 'express';
import passport from '../config/passport';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { uploadAvatar, handleUploadError } from '../middleware/uploadMiddleware';
import {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetConfirmValidation,
  profileUpdateValidation,
  verifyOTPValidation,
  resendOTPValidation,
  languagePreferenceValidation,
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

// OAuth routes - Google
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login?error=oauth_failed` : 'http://localhost:3001/login?error=oauth_failed'
  }),
  authController.oauthCallback
);

// OAuth routes - Facebook (temporarily disabled)
/*
router.get(
  '/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'],
    session: false 
  })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { 
    session: false,
    failureRedirect: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login?error=oauth_failed` : 'http://localhost:3001/login?error=oauth_failed'
  }),
  authController.oauthCallback
);
*/

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser);

router.put(
  '/profile',
  authenticate,
  profileUpdateValidation,
  authController.updateProfile
);

router.post(
  '/avatar',
  authenticate,
  uploadAvatar,
  handleUploadError,
  authController.uploadAvatar
);

router.patch(
  '/language',
  authenticate,
  languagePreferenceValidation,
  authController.updateLanguagePreference
);

router.patch(
  '/walkthrough',
  authenticate,
  authController.completeWalkthrough
);

router.post(
  '/walkthrough/reset',
  authenticate,
  authController.resetWalkthrough
);

export default router;
