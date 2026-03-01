import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import logger from '../utils/logger';

/**
 * Middleware to check if the system is in maintenance mode
 * Blocks regular users but allows admin users to access
 */
export const checkMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Skip maintenance check for admin routes
    if (req.path.startsWith('/api/admin')) {
      return next();
    }

    // Skip maintenance check for health endpoint
    if (req.path === '/health') {
      return next();
    }

    // Check if maintenance mode is enabled
    const result = await query(
      `SELECT value FROM system_config WHERE key = 'maintenance_mode'`
    );

    if (result.rows.length > 0) {
      const maintenanceConfig = result.rows[0].value;
      
      if (maintenanceConfig && maintenanceConfig.enabled === true) {
        logger.warn('Maintenance mode active - blocking user request', {
          path: req.path,
          ip: req.ip
        });

        return res.status(503).json({
          error: {
            code: 'MAINTENANCE_MODE',
            message: maintenanceConfig.message || 'System is currently under maintenance. Please try again later.',
            enabled_at: maintenanceConfig.enabled_at,
            estimated_duration: maintenanceConfig.estimated_duration
          }
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Maintenance mode check error', { error });
    // On error, allow the request to proceed (fail open)
    next();
  }
};
