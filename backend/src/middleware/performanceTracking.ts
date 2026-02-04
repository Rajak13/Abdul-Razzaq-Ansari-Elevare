import { Request, Response, NextFunction } from 'express';
import { AdminPerformanceService } from '../services/adminPerformanceService';
import logger from '../utils/logger';

/**
 * Performance tracking middleware
 * Records API request metrics for admin dashboard monitoring
 * Does NOT expose request content - only timing and status information
 */
export const performanceTrackingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEndFunc = res.end.bind(res);
  res.end = function (this: Response, chunk?: any, encoding?: any, cb?: any): Response {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Normalize endpoint path (remove IDs and dynamic segments)
    const endpoint = normalizeEndpoint(req.path);
    const method = req.method;

    // Record performance metrics asynchronously (don't block response)
    setImmediate(() => {
      try {
        AdminPerformanceService.recordApiRequest(
          endpoint,
          method,
          responseTime,
          statusCode
        );
      } catch (error) {
        // Log error but don't impact request handling
        logger.warn('Failed to record performance metrics', { endpoint, method, error });
      }
    });

    // Call the original end function
    return originalEndFunc(chunk, encoding, cb);
  };

  next();
};

/**
 * Normalize endpoint path by removing dynamic segments
 * Examples:
 *   /api/users/123 -> /api/users/:id
 *   /api/tasks/abc-def-ghi -> /api/tasks/:id
 *   /api/notes/456/comments -> /api/notes/:id/comments
 */
function normalizeEndpoint(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace alphanumeric IDs (at least 8 chars)
    .replace(/\/[a-zA-Z0-9_-]{8,}/g, '/:id')
    // Remove trailing slashes
    .replace(/\/$/, '');
}

export default performanceTrackingMiddleware;
