import express, { Application } from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import config from './config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/securityHeaders';
import { sanitizeInput, checkSqlInjection } from './middleware/inputValidation';
import { checkBlockedIP, ddosProtection, standardRateLimiter } from './middleware/advancedRateLimiter';
import { enforceHttps, tlsSecurityHeaders } from './middleware/encryption';

const app: Application = express();

// Trust proxy - required for Render, Heroku, and other platforms behind reverse proxies
app.set('trust proxy', 1);

// CORS configuration (must be before other middleware)
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600, // 10 minutes
  })
);

// Enforce HTTPS/TLS in production
app.use(enforceHttps);
app.use(tlsSecurityHeaders);

// Check for blocked IPs first
app.use(checkBlockedIP);

// DDoS protection
app.use(ddosProtection);

// Comprehensive security headers (OWASP best practices)
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization and SQL injection prevention
app.use(sanitizeInput);
app.use(checkSqlInjection);

// Standard rate limiting for all API endpoints
app.use('/api', standardRateLimiter);

// Compression middleware
app.use(compression());

// Request logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import categoryRoutes from './routes/categoryRoutes';
import noteRoutes from './routes/noteRoutes';
import noteFolderRoutes from './routes/noteFolderRoutes';
import studyGroupRoutes from './routes/studyGroupRoutes';
import notificationRoutes from './routes/notificationRoutes';
import whiteboardRoutes from './routes/whiteboardRoutes';
import searchRoutes from './routes/searchRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import resourceRoutes from './routes/resourceRoutes';
import fileRoutes from './routes/fileRoutes';
import adminRoutes from './routes/adminRoutes';
import suspensionAppealRoutes from './routes/suspensionAppealRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/task-categories', categoryRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/note-folders', noteFolderRoutes);
app.use('/api/groups', studyGroupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', dashboardRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/suspension-appeals', suspensionAppealRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
