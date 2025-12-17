import { Router } from 'express';
import * as studyGroupController from '../controllers/studyGroupController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createStudyGroupValidation,
  updateStudyGroupValidation,
  groupIdValidation,
  userIdValidation,
  approveRejectValidation,
  sendMessageValidation,
  getMessagesValidation,
  getGroupsValidation,
} from '../middleware/studyGroupValidation';

const router = Router();

// All study group routes require authentication
router.use(authenticate);

// Study group routes
router.post('/', createStudyGroupValidation, validate, studyGroupController.createStudyGroup);
router.get('/', getGroupsValidation, validate, studyGroupController.getStudyGroups);
router.get('/:id', groupIdValidation, validate, studyGroupController.getStudyGroupById);
router.put('/:id', updateStudyGroupValidation, validate, studyGroupController.updateStudyGroup);
router.delete('/:id', groupIdValidation, validate, studyGroupController.deleteStudyGroup);

// Join request routes
router.post('/:id/join', groupIdValidation, validate, studyGroupController.requestToJoinGroup);
router.get('/:id/join-requests', groupIdValidation, validate, studyGroupController.getJoinRequests);
router.post('/:id/approve', approveRejectValidation, validate, studyGroupController.approveJoinRequest);
router.post('/:id/reject', approveRejectValidation, validate, studyGroupController.rejectJoinRequest);

// Member management routes
router.get('/:id/members', groupIdValidation, validate, studyGroupController.getGroupMembers);
router.delete('/:id/members/:userId', groupIdValidation, userIdValidation, validate, studyGroupController.removeMember);

// Message routes
router.post('/:id/messages', sendMessageValidation, validate, studyGroupController.sendMessage);
router.get('/:id/messages', getMessagesValidation, validate, studyGroupController.getMessages);

export default router;