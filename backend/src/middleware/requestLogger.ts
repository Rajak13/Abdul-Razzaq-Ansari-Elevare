import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Comprehensive request logger middleware
 * Logs all incoming requests including CORS preflight (OPTIONS)
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming Request', {
    method: req.method,
    path: req.path,
    url: req.url,
    origin: req.headers.origin,
    referer: req.headers.referer,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    authorization: req.headers.authorization ? 'Present' : 'None',
    ip: req.ip,
    ips: req.ips,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Log CORS-specific headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    logger.info('CORS Preflight Request', {
      origin: req.headers.origin,
      accessControlRequestMethod: req.headers['access-control-request-method'],
      accessControlRequestHeaders: req.headers['access-control-request-headers'],
    });
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Response Sent', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentType: res.getHeader('content-type'),
      accessControlAllowOrigin: res.getHeader('access-control-allow-origin'),
      accessControlAllowMethods: res.getHeader('access-control-allow-methods'),
      accessControlAllowHeaders: res.getHeader('access-control-allow-headers'),
    });

    return originalSend.call(this, data);
  };

  next();
};
