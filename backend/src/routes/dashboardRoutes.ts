import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getDashboard,
  getPreferences,
  updatePreferences,
  getAnalytics
} from '../controllers/dashboardController';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard - Get dashboard data
router.get('/', getDashboard);

// GET /api/dashboard/preferences - Get dashboard preferences
router.get('/preferences', getPreferences);

// PUT /api/dashboard/preferences - Update dashboard preferences
router.put('/preferences', updatePreferences);

// GET /api/analytics - Get productivity analytics
router.get('/analytics', getAnalytics);

export default router;