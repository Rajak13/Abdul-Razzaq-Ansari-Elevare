import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AccessToken } from 'livekit-server-sdk';
import logger from '../utils/logger';

const router = Router();

router.get('/token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { roomName } = req.query;

    if (!roomName || typeof roomName !== 'string') {
      res.status(400).json({ error: 'roomName query param required' });
      return;
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      res.status(503).json({ error: 'LiveKit not configured' });
      return;
    }

    // Fetch user name from DB for display in the call
    const { query } = await import('../db/connection');
    const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.name || 'User';

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

    logger.info('LiveKit token generated', { userId, roomName });
    res.json({ token, url: process.env.LIVEKIT_URL });
  } catch (error) {
    logger.error('LiveKit token error', { error });
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
