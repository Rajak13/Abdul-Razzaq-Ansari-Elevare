import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AccessToken } from 'livekit-server-sdk';
import { query } from '../db/connection';
import logger from '../utils/logger';

const router = Router();

/**
 * Generate LiveKit token for video call access
 * GET /api/livekit/token?roomName=group-{groupId}-call
 * ✅ SECURITY: Added group membership verification before issuing token
 */
router.get('/token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { roomName } = req.query;

    if (!roomName || typeof roomName !== 'string') {
      res.status(400).json({ 
        error: 'roomName query param required',
        code: 'MISSING_ROOM_NAME'
      });
      return;
    }

    // ✅ SECURITY: Extract and validate groupId from roomName
    // Expected format: group-{uuid}-call
    const roomPattern = /^group-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-call$/i;
    const match = roomName.match(roomPattern);

    if (!match) {
      res.status(400).json({ 
        error: 'Invalid room name format. Expected: group-{groupId}-call',
        code: 'INVALID_ROOM_FORMAT'
      });
      return;
    }

    const groupId = match[1];

    // ✅ SECURITY: Verify user is an active member of the group
    const membershipCheck = await query(
      `SELECT gm.role, sg.name as group_name
       FROM group_members gm
       JOIN study_groups sg ON gm.group_id = sg.id
       WHERE gm.group_id = $1 AND gm.user_id = $2 AND gm.status = 'active'`,
      [groupId, userId]
    );

    if (membershipCheck.rows.length === 0) {
      logger.warn('Unauthorized LiveKit token request', { 
        userId, 
        roomName, 
        groupId,
        reason: 'Not a group member'
      });
      
      res.status(403).json({ 
        error: 'You are not authorized to join this call. You must be a member of the group.',
        code: 'NOT_GROUP_MEMBER'
      });
      return;
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      res.status(503).json({ 
        error: 'LiveKit not configured',
        code: 'LIVEKIT_NOT_CONFIGURED'
      });
      return;
    }

    // Fetch user name from DB for display in the call
    const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.name || 'User';
    const groupName = membershipCheck.rows[0].group_name;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    logger.info('LiveKit token generated', { 
      userId, 
      userName,
      roomName, 
      groupId,
      groupName,
      memberRole: membershipCheck.rows[0].role
    });
    
    res.json({ 
      token, 
      url: process.env.LIVEKIT_URL,
      roomName,
      groupName
    });
  } catch (error: any) {
    logger.error('LiveKit token error', { 
      error: error.message,
      userId: req.user?.userId,
      roomName: req.query.roomName
    });
    res.status(500).json({ 
      error: 'Failed to generate token',
      code: 'TOKEN_GENERATION_FAILED'
    });
  }
});

export default router;
