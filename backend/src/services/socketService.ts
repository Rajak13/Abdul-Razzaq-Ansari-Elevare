import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';
import logger from '../utils/logger';
import config from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export class SocketService {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        
        // Get user details from database
        const userResult = await query(
          'SELECT id, name, email FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (!userResult.rows[0]) {
          return next(new Error('User not found'));
        }

        socket.userId = decoded.userId;
        socket.user = userResult.rows[0];
        
        logger.info('Socket authenticated', { userId: decoded.userId, socketId: socket.id });
        next();
      } catch (error) {
        logger.error('Socket authentication failed', { error });
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('User connected', { userId: socket.userId, socketId: socket.id });

      // Join user to their personal room for notifications
      socket.join(`user:${socket.userId}`);

      // Handle joining study group rooms
      socket.on('join_group', async (groupId: string) => {
        try {
          // Verify user is a member of the group
          const memberCheck = await query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, socket.userId]
          );

          if (memberCheck.rows[0]) {
            socket.join(`group:${groupId}`);
            socket.emit('joined_group', { groupId });
            
            // Notify other group members
            socket.to(`group:${groupId}`).emit('user_joined', {
              userId: socket.userId,
              user: socket.user
            });

            logger.info('User joined group room', { userId: socket.userId, groupId });
          } else {
            socket.emit('error', { message: 'Not authorized to join this group' });
          }
        } catch (error) {
          logger.error('Error joining group', { error, userId: socket.userId, groupId });
          socket.emit('error', { message: 'Failed to join group' });
        }
      });

      // Handle leaving study group rooms
      socket.on('leave_group', (groupId: string) => {
        socket.leave(`group:${groupId}`);
        socket.to(`group:${groupId}`).emit('user_left', {
          userId: socket.userId,
          user: socket.user
        });
        logger.info('User left group room', { userId: socket.userId, groupId });
      });

      // Handle typing indicators
      socket.on('typing_start', (groupId: string) => {
        socket.to(`group:${groupId}`).emit('user_typing', {
          userId: socket.userId,
          user: socket.user
        });
      });

      socket.on('typing_stop', (groupId: string) => {
        socket.to(`group:${groupId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          user: socket.user
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info('User disconnected', { userId: socket.userId, socketId: socket.id });
      });
    });
  }

  // Method to broadcast new messages to group members
  public broadcastMessage(groupId: string, message: any) {
    this.io.to(`group:${groupId}`).emit('new_message', message);
    logger.info('Message broadcasted', { groupId, messageId: message.id });
  }

  // Method to send notifications to specific users
  public sendNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
    logger.info('Notification sent', { userId, notificationId: notification.id });
  }

  // Method to broadcast group updates
  public broadcastGroupUpdate(groupId: string, update: any) {
    this.io.to(`group:${groupId}`).emit('group_update', update);
    logger.info('Group update broadcasted', { groupId, updateType: update.type });
  }

  public getIO() {
    return this.io;
  }
}

export let socketService: SocketService;

export function initializeSocketService(server: HTTPServer) {
  socketService = new SocketService(server);
  return socketService;
}