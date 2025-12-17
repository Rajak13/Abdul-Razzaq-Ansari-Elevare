import { Request, Response, NextFunction } from 'express';
import * as studyGroupService from '../services/studyGroupService';
import { CreateStudyGroupInput, UpdateStudyGroupInput, StudyGroupQueryParams, CreateMessageInput } from '../types/studyGroup';

/**
 * Create a new study group
 * POST /api/groups
 */
export async function createStudyGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupData: CreateStudyGroupInput = req.body;

    const group = await studyGroupService.createStudyGroup(userId, groupData);

    res.status(201).json({
      success: true,
      group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all study groups with filtering and pagination
 * GET /api/groups
 */
export async function getStudyGroups(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const params: StudyGroupQueryParams = {
      search: req.query.search as string,
      is_private: req.query.is_private === 'true' ? true : req.query.is_private === 'false' ? false : undefined,
      member_of: req.query.member_of === 'true',
      owned_by_me: req.query.owned_by_me === 'true',
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await studyGroupService.getStudyGroups(userId, params);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single study group by ID
 * GET /api/groups/:id
 */
export async function getStudyGroupById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const group = await studyGroupService.getStudyGroupById(userId, groupId);

    if (!group) {
      res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Study group not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a study group
 * PUT /api/groups/:id
 */
export async function updateStudyGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const updates: UpdateStudyGroupInput = req.body;

    const group = await studyGroupService.updateStudyGroup(userId, groupId, updates);

    if (!group) {
      res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Study group not found or you are not authorized to update it',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a study group
 * DELETE /api/groups/:id
 */
export async function deleteStudyGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const deleted = await studyGroupService.deleteStudyGroup(userId, groupId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Study group not found or you are not authorized to delete it',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Study group deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request to join a study group
 * POST /api/groups/:id/join
 */
export async function requestToJoinGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const joinRequest = await studyGroupService.requestToJoinGroup(userId, groupId);

    if (!joinRequest) {
      res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Study group not found',
        },
      });
      return;
    }

    res.status(201).json({
      success: true,
      joinRequest,
      message: 'Join request sent successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User is already a member of this group') {
        res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_MEMBER',
            message: error.message,
          },
        });
        return;
      }
      if (error.message === 'Join request already pending') {
        res.status(400).json({
          success: false,
          error: {
            code: 'REQUEST_PENDING',
            message: error.message,
          },
        });
        return;
      }
    }
    next(error);
  }
}

/**
 * Get group members
 * GET /api/groups/:id/members
 */
export async function getGroupMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const members = await studyGroupService.getGroupMembers(userId, groupId);

    res.status(200).json({
      success: true,
      members,
      count: members.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get pending join requests for a group
 * GET /api/groups/:id/join-requests
 */
export async function getJoinRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const requests = await studyGroupService.getJoinRequests(userId, groupId);

    res.status(200).json({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve a join request
 * POST /api/groups/:id/approve
 */
export async function approveJoinRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const { user_id: requestUserId } = req.body;

    if (!requestUserId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
        },
      });
      return;
    }

    const success = await studyGroupService.handleJoinRequest(userId, groupId, requestUserId, true);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Join request not found or you are not authorized',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Join request approved successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject a join request
 * POST /api/groups/:id/reject
 */
export async function rejectJoinRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const { user_id: requestUserId } = req.body;

    if (!requestUserId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
        },
      });
      return;
    }

    const success = await studyGroupService.handleJoinRequest(userId, groupId, requestUserId, false);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Join request not found or you are not authorized',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Join request rejected successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a member from the group
 * DELETE /api/groups/:id/members/:userId
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const memberUserId = req.params.userId;

    const success = await studyGroupService.removeMember(userId, groupId, memberUserId);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found or you are not authorized to remove them',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send a message to the group
 * POST /api/groups/:id/messages
 */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const messageData: CreateMessageInput = req.body;

    const message = await studyGroupService.sendMessage(userId, groupId, messageData);

    if (!message) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NOT_MEMBER',
          message: 'You are not a member of this group',
        },
      });
      return;
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get messages for a group
 * GET /api/groups/:id/messages
 */
export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const result = await studyGroupService.getMessages(userId, groupId, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}