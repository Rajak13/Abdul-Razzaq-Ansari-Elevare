import { createServer } from 'http';
import app from './app';
import config from './config';
import logger from './utils/logger';
import { checkConnection } from './db/connection';
import { initializeSocketService } from './services/socketService';
import { getNotificationScheduler } from './services/notificationScheduler';

const PORT = config.port;

// Check database connection before starting server
async function startServer() {
  try {
    // Check database connection
    const dbConnected = await checkConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Create HTTP server
    const server = createServer(app);
    
    // Initialize Socket.io
    initializeSocketService(server);
    
    // Initialize notification scheduler
    const notificationScheduler = getNotificationScheduler();
    notificationScheduler.start(15); // Check every 15 minutes
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Elevare Backend Server started`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API URL: ${config.apiUrl}`);
      logger.info(`Health check: ${config.apiUrl}/health`);
      logger.info(`Database: Connected`);
      logger.info(`WebSocket: Enabled`);
      logger.info(`Notification Scheduler: Started`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

const serverPromise = startServer();

serverPromise.then((server) => {
  if (!server) return;

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Stop notification scheduler
    const notificationScheduler = getNotificationScheduler();
    notificationScheduler.stop();
    
    server.close(() => {
      logger.info('Server closed. Exiting process.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Promise Rejection:', reason);
    gracefulShutdown('unhandledRejection');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });
});

export default serverPromise;
