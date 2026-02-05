import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { query } from '../db/connection';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token provided',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Middleware to check if user is suspended
 * Should be used after authenticate middleware
 */
export async function checkSuspension(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Check if user is suspended
    const suspensionCheck = await query(
      `SELECT us.id, us.reason, us.expires_at, us.suspension_type
       FROM user_suspensions us
       WHERE us.user_id = $1 
         AND us.is_active = TRUE 
         AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [req.user.userId]
    );

    if (suspensionCheck.rows.length > 0) {
      const suspension = suspensionCheck.rows[0];
      const expiryMessage = suspension.expires_at 
        ? ` until ${new Date(suspension.expires_at).toLocaleDateString()}`
        : ' permanently';
      
      logger.warn('Suspended user attempted access', { 
        userId: req.user.userId, 
        suspension: suspension.reason 
      });

      res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: `Your account has been suspended${expiryMessage}. Reason: ${suspension.reason}`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Check account status
    const userCheck = await query(
      'SELECT account_status FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const accountStatus = userCheck.rows[0].account_status;

    if (accountStatus === 'suspended') {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact support.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (accountStatus === 'deleted') {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_DELETED',
          message: 'This account has been deleted.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  } catch (error: any) {
    logger.error('Suspension check error', { error: error.message });
    res.status(500).json({
      error: {
        code: 'SUSPENSION_CHECK_FAILED',
        message: 'Failed to verify account status',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
