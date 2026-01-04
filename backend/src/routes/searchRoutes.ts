import { Router } from 'express';
import * as searchController from '../controllers/searchController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { searchValidation, multiKeywordSearchValidation } from '../middleware/searchValidation';

const router = Router();

// All search routes require authentication
router.use(authenticate);

// Search routes
router.get('/', searchValidation, validate, searchController.search);
router.post('/multi-keyword', multiKeywordSearchValidation, validate, searchController.multiKeywordSearchEndpoint);
router.get('/suggestions', searchController.getSearchSuggestions);

export default router;