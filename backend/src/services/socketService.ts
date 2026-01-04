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
            
            // Send current call status for this group
            const callId = `group-${groupId}-call`;
            const callParticipants = await this.getCallParticipants(callId);
            if (callParticipants.length > 0) {
              socket.emit('group_call_status', {
                groupId,
                callId,
                isActive: true,
                participants: callParticipants,
                startedBy: callParticipants[0]?.user || null
              });
            }
            
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

      // Handle getting current call status
      socket.on('get_call_status', async (data: { groupId: string }) => {
        try {
          const { groupId } = data;
          
          // Verify user is a member of the group
          const memberCheck = await query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, socket.userId]
          );

          if (memberCheck.rows[0]) {
            const callId = `group-${groupId}-call`;
            const callParticipants = await this.getCallParticipants(callId);
            
            socket.emit('group_call_status', {
              groupId,
              callId,
              isActive: callParticipants.length > 0,
              participants: callParticipants,
              startedBy: callParticipants[0]?.user || null
            });
          }
        } catch (error) {
          logger.error('Error getting call status', { error, userId: socket.userId, groupId: data.groupId });
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

      // Whiteboard events
      socket.on('whiteboard_join', async (whiteboardId: string) => {
        try {
          // Verify user has access to the whiteboard
          const accessCheck = await query(
            `SELECT w.id, w.canvas_data FROM whiteboards w 
             LEFT JOIN study_groups sg ON w.group_id = sg.id 
             LEFT JOIN group_members gm ON sg.id = gm.group_id 
             WHERE w.id = $1 AND (w.user_id = $2 OR gm.user_id = $2)`,
            [whiteboardId, socket.userId]
          );

          if (accessCheck.rows[0]) {
            socket.join(`whiteboard:${whiteboardId}`);
            
            // Get current participants
            const participants = await this.getWhiteboardParticipants(whiteboardId);
            
            // Get whiteboard data
            const whiteboardData = accessCheck.rows[0];
            const canvasData = typeof whiteboardData.canvas_data === 'string' 
              ? JSON.parse(whiteboardData.canvas_data) 
              : whiteboardData.canvas_data;

            // Send join confirmation with current state
            socket.emit('whiteboard_joined', { 
              whiteboardId,
              elements: canvasData.elements || [],
              users: participants.map(p => p.user.name || 'Unknown User')
            });
            
            // Notify other users about new participant
            socket.to(`whiteboard:${whiteboardId}`).emit('user_joined_whiteboard', {
              whiteboardId,
              userId: socket.userId,
              userName: socket.user?.name || 'Unknown User',
              user: socket.user
            });

            logger.info('User joined whiteboard', { userId: socket.userId, whiteboardId });
          } else {
            socket.emit('error', { message: 'Not authorized to access this whiteboard' });
          }
        } catch (error) {
          logger.error('Error joining whiteboard', { error, userId: socket.userId, whiteboardId });
          socket.emit('error', { message: 'Failed to join whiteboard' });
        }
      });

      socket.on('whiteboard_leave', (whiteboardId: string) => {
        socket.leave(`whiteboard:${whiteboardId}`);
        socket.to(`whiteboard:${whiteboardId}`).emit('user_left_whiteboard', {
          whiteboardId,
          userId: socket.userId,
          userName: socket.user?.name || 'Unknown User',
          user: socket.user
        });
        logger.info('User left whiteboard', { userId: socket.userId, whiteboardId });
      });

      // Drawing events
      socket.on('draw_start', (data: { whiteboardId: string; x: number; y: number; tool: string; color: string; size: number }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('draw_start', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      socket.on('draw_move', (data: { whiteboardId: string; x: number; y: number }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('draw_move', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      socket.on('draw_end', (data: { whiteboardId: string }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('draw_end', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      // Element manipulation events
      socket.on('add_element', (data: { whiteboardId: string; element: any }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('add_element', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      socket.on('update_element', (data: { whiteboardId: string; elementId: string; updates: any }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('update_element', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      socket.on('delete_element', (data: { whiteboardId: string; elementId: string }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('delete_element', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      socket.on('clear_canvas', (data: { whiteboardId: string }) => {
        socket.to(`whiteboard:${data.whiteboardId}`).emit('clear_canvas', {
          ...data,
          userId: socket.userId,
          timestamp: Date.now()
        });
      });

      // Notification events
      socket.on('mark_notification_read', async (notificationId: string) => {
        try {
          // Update notification read status in database
          await query(
            'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
            [notificationId, socket.userId]
          );

          // Broadcast read status to user's other sessions
          socket.to(`user:${socket.userId}`).emit('notification_read', {
            notificationId,
            readAt: new Date().toISOString()
          });

          logger.info('Notification marked as read', { userId: socket.userId, notificationId });
        } catch (error) {
          logger.error('Error marking notification as read', { error, userId: socket.userId, notificationId });
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });

      socket.on('mark_all_notifications_read', async () => {
        try {
          // Mark all unread notifications as read
          await query(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
            [socket.userId]
          );

          // Broadcast to user's other sessions
          socket.to(`user:${socket.userId}`).emit('all_notifications_read', {
            readAt: new Date().toISOString()
          });

          logger.info('All notifications marked as read', { userId: socket.userId });
        } catch (error) {
          logger.error('Error marking all notifications as read', { error, userId: socket.userId });
          socket.emit('error', { message: 'Failed to mark all notifications as read' });
        }
      });

      // Dashboard events
      socket.on('join_dashboard', () => {
        // User joins their personal dashboard room for real-time updates
        socket.join(`dashboard:${socket.userId}`);
        socket.emit('dashboard_joined');
        logger.info('User joined dashboard room', { userId: socket.userId });
      });

      socket.on('leave_dashboard', () => {
        socket.leave(`dashboard:${socket.userId}`);
        logger.info('User left dashboard room', { userId: socket.userId });
      });

      // WebRTC Video Call Signaling Events
      socket.on('join_call', async (data: { callId: string; groupId?: string }) => {
        try {
          const { callId, groupId } = data;
          
          // If it's a group call, verify user is a member
          if (groupId) {
            const memberCheck = await query(
              'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
              [groupId, socket.userId]
            );

            if (!memberCheck.rows[0]) {
              socket.emit('error', { message: 'Not authorized to join this call' });
              return;
            }
          }

          // Check if this is the first person joining (call starter)
          const existingParticipants = await this.getCallParticipants(callId);
          const isCallStarter = existingParticipants.length === 0;

          // Join the call room
          socket.join(`call:${callId}`);
          
          // If this is a group call and the first person, notify all group members
          if (groupId && isCallStarter) {
            socket.to(`group:${groupId}`).emit('group_call_started', {
              callId,
              groupId,
              startedBy: socket.user,
              startedAt: new Date().toISOString()
            });

            // Create proper notifications in database for all group members
            const groupMembers = await query(
              'SELECT user_id, users.name as user_name FROM group_members JOIN users ON group_members.user_id = users.id WHERE group_id = $1 AND user_id != $2',
              [groupId, socket.userId]
            );

            // Get group name for notification
            const groupResult = await query(
              'SELECT name FROM study_groups WHERE id = $1',
              [groupId]
            );
            const groupName = groupResult.rows[0]?.name || 'Study Group';

            for (const member of groupMembers.rows) {
              // Create notification in database
              await query(
                `INSERT INTO notifications (user_id, type, title, content, link, created_at) 
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                  member.user_id,
                  'video_call_started',
                  'Video Call Started',
                  `${socket.user?.name} started a video call in ${groupName}`,
                  `/groups/${groupId}/video-call`
                ]
              );

              // Send real-time notification through socket
              this.sendNotification(member.user_id, {
                id: `call-started-${callId}-${member.user_id}`,
                type: 'video_call_started',
                title: 'Video Call Started',
                message: `${socket.user?.name} started a video call in ${groupName}`,
                data: { callId, groupId, startedBy: socket.user, groupName },
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Notify existing participants about new user
          socket.to(`call:${callId}`).emit('user_joined_call', {
            userId: socket.userId,
            user: socket.user,
            callId
          });

          // Send list of existing participants to new user
          const participants = await this.getCallParticipants(callId);
          socket.emit('call_joined', {
            callId,
            participants: participants.filter(p => p.userId !== socket.userId),
            isStarter: isCallStarter
          });

          // Update group call status
          if (groupId) {
            const updatedParticipants = await this.getCallParticipants(callId);
            socket.to(`group:${groupId}`).emit('group_call_status', {
              groupId,
              callId,
              isActive: true,
              participants: updatedParticipants,
              startedBy: updatedParticipants[0]?.user || socket.user
            });
          }

          logger.info('User joined call', { userId: socket.userId, callId, groupId, isStarter: isCallStarter });
        } catch (error) {
          logger.error('Error joining call', { error, userId: socket.userId, callId: data.callId });
          socket.emit('error', { message: 'Failed to join call' });
        }
      });

      socket.on('leave_call', async (callId: string) => {
        socket.leave(`call:${callId}`);
        socket.to(`call:${callId}`).emit('user_left_call', {
          userId: socket.userId,
          user: socket.user,
          callId
        });

        // Check if call is now empty and update group status
        const remainingParticipants = await this.getCallParticipants(callId);
        
        // Extract groupId from callId (format: group-{groupId}-call)
        const groupIdMatch = callId.match(/^group-(.+)-call$/);
        if (groupIdMatch) {
          const groupId = groupIdMatch[1];
          
          if (remainingParticipants.length === 0) {
            // Call ended - notify group members
            socket.to(`group:${groupId}`).emit('group_call_ended', {
              callId,
              groupId,
              endedAt: new Date().toISOString()
            });

            socket.to(`group:${groupId}`).emit('group_call_status', {
              groupId,
              callId,
              isActive: false,
              participants: [],
              startedBy: null
            });
          } else {
            // Update participant count
            socket.to(`group:${groupId}`).emit('group_call_status', {
              groupId,
              callId,
              isActive: true,
              participants: remainingParticipants,
              startedBy: remainingParticipants[0]?.user || null
            });
          }
        }

        logger.info('User left call', { userId: socket.userId, callId });
      });

      // WebRTC Offer/Answer Exchange
      socket.on('webrtc_offer', (data: { callId: string; targetUserId: string; offer: any }) => {
        const { callId, targetUserId, offer } = data;
        
        // Forward offer to target user
        this.io.to(`call:${callId}`).emit('webrtc_offer', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user,
          targetUserId,
          offer
        });

        logger.info('WebRTC offer forwarded', { 
          callId, 
          fromUserId: socket.userId, 
          targetUserId 
        });
      });

      socket.on('webrtc_answer', (data: { callId: string; targetUserId: string; answer: any }) => {
        const { callId, targetUserId, answer } = data;
        
        // Forward answer to target user
        this.io.to(`call:${callId}`).emit('webrtc_answer', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user,
          targetUserId,
          answer
        });

        logger.info('WebRTC answer forwarded', { 
          callId, 
          fromUserId: socket.userId, 
          targetUserId 
        });
      });

      // ICE Candidate Exchange
      socket.on('webrtc_ice_candidate', (data: { callId: string; targetUserId: string; candidate: any }) => {
        const { callId, targetUserId, candidate } = data;
        
        // Forward ICE candidate to target user
        this.io.to(`call:${callId}`).emit('webrtc_ice_candidate', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user,
          targetUserId,
          candidate
        });

        logger.info('ICE candidate forwarded', { 
          callId, 
          fromUserId: socket.userId, 
          targetUserId 
        });
      });

      // Screen Sharing Events
      socket.on('screen_share_started', (data: { callId: string; userId: string; user: any }) => {
        const { callId, userId, user } = data;
        
        // Broadcast to all participants in the call
        socket.to(`call:${callId}`).emit('screen_share_started', {
          callId,
          userId,
          user
        });

        logger.info('Screen sharing started', { 
          callId, 
          userId 
        });
      });

      socket.on('screen_share_stopped', (data: { callId: string; userId: string; user: any }) => {
        const { callId, userId, user } = data;
        
        // Broadcast to all participants in the call
        socket.to(`call:${callId}`).emit('screen_share_stopped', {
          callId,
          userId,
          user
        });

        logger.info('Screen sharing stopped', { 
          callId, 
          userId 
        });
      });

      // Screen Sharing Signaling
      socket.on('screen_share_offer', (data: { callId: string; offer: any }) => {
        const { callId, offer } = data;
        
        // Broadcast screen share offer to all participants
        socket.to(`call:${callId}`).emit('screen_share_offer', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user,
          offer
        });

        logger.info('Screen share offer broadcasted', { 
          callId, 
          fromUserId: socket.userId 
        });
      });

      socket.on('screen_share_answer', (data: { callId: string; targetUserId: string; answer: any }) => {
        const { callId, targetUserId, answer } = data;
        
        // Forward screen share answer to target user
        this.io.to(`call:${callId}`).emit('screen_share_answer', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user,
          targetUserId,
          answer
        });

        logger.info('Screen share answer forwarded', { 
          callId, 
          fromUserId: socket.userId, 
          targetUserId 
        });
      });

      socket.on('screen_share_ice_candidate', (data: { callId: string; targetUserId: string; candidate: any }) => {
        const { callId, targetUserId, candidate } = data;
        
        // Forward screen share ICE candidate to target user
        this.io.to(`call:${callId}`).emit('screen_share_ice_candidate', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user,
          targetUserId,
          candidate
        });

        logger.info('Screen share ICE candidate forwarded', { 
          callId, 
          fromUserId: socket.userId, 
          targetUserId 
        });
      });

      socket.on('stop_screen_share', (callId: string) => {
        // Notify all participants that screen sharing stopped
        socket.to(`call:${callId}`).emit('screen_share_stopped', {
          callId,
          fromUserId: socket.userId,
          fromUser: socket.user
        });

        logger.info('Screen sharing stopped', { 
          callId, 
          fromUserId: socket.userId 
        });
      });

      // Audio/Video Control State
      socket.on('audio_state_change', (data: { callId: string; muted: boolean }) => {
        const { callId, muted } = data;
        
        // Broadcast audio state change to all participants
        socket.to(`call:${callId}`).emit('participant_audio_change', {
          callId,
          userId: socket.userId,
          user: socket.user,
          muted
        });

        logger.info('Audio state changed', { 
          callId, 
          userId: socket.userId, 
          muted 
        });
      });

      socket.on('video_state_change', (data: { callId: string; enabled: boolean }) => {
        const { callId, enabled } = data;
        
        // Broadcast video state change to all participants
        socket.to(`call:${callId}`).emit('participant_video_change', {
          callId,
          userId: socket.userId,
          user: socket.user,
          enabled
        });

        logger.info('Video state changed', { 
          callId, 
          userId: socket.userId, 
          enabled 
        });
      });

      // Breakout Rooms
      socket.on('create_breakout_room', async (data: { callId: string; roomName: string; participants: string[] }) => {
        try {
          const { callId, roomName, participants } = data;
          const breakoutRoomId = `${callId}_breakout_${Date.now()}`;
          
          // Create breakout room and move participants
          for (const participantId of participants) {
            // Find participant socket and move to breakout room
            const participantSockets = await this.io.in(`call:${callId}`).fetchSockets();
            const participantSocket = participantSockets.find((s: any) => s.userId === participantId);
            
            if (participantSocket) {
              participantSocket.leave(`call:${callId}`);
              participantSocket.join(`call:${breakoutRoomId}`);
              
              participantSocket.emit('moved_to_breakout', {
                callId,
                breakoutRoomId,
                roomName,
                participants
              });
            }
          }

          // Notify main room about breakout room creation
          socket.to(`call:${callId}`).emit('breakout_room_created', {
            callId,
            breakoutRoomId,
            roomName,
            participants,
            createdBy: socket.userId
          });

          logger.info('Breakout room created', { 
            callId, 
            breakoutRoomId, 
            roomName, 
            participants 
          });
        } catch (error) {
          logger.error('Error creating breakout room', { error, userId: socket.userId });
          socket.emit('error', { message: 'Failed to create breakout room' });
        }
      });

      socket.on('return_to_main_room', (data: { callId: string; breakoutRoomId: string }) => {
        const { callId, breakoutRoomId } = data;
        
        // Move user back to main call room
        socket.leave(`call:${breakoutRoomId}`);
        socket.join(`call:${callId}`);
        
        // Notify both rooms
        socket.to(`call:${breakoutRoomId}`).emit('participant_returned_to_main', {
          userId: socket.userId,
          user: socket.user
        });
        
        socket.to(`call:${callId}`).emit('participant_returned_from_breakout', {
          userId: socket.userId,
          user: socket.user,
          breakoutRoomId
        });

        logger.info('User returned to main room', { 
          callId, 
          breakoutRoomId, 
          userId: socket.userId 
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

  // Method to send task deadline notifications
  public sendTaskDeadlineNotification(userId: string, task: any) {
    const notification = {
      id: `task-deadline-${task.id}`,
      type: 'task_deadline',
      title: 'Task Deadline Approaching',
      message: `Your task "${task.title}" is due soon`,
      data: { taskId: task.id },
      timestamp: new Date().toISOString()
    };
    this.sendNotification(userId, notification);
  }

  // Method to send group join approval notifications
  public sendJoinApprovalNotification(userId: string, group: any) {
    const notification = {
      id: `join-approved-${group.id}-${userId}`,
      type: 'join_approved',
      title: 'Join Request Approved',
      message: `You have been accepted to join "${group.name}"`,
      data: { groupId: group.id },
      timestamp: new Date().toISOString()
    };
    this.sendNotification(userId, notification);
  }

  // Method to send mention notifications
  public sendMentionNotification(userId: string, mention: any) {
    const notification = {
      id: `mention-${mention.id}`,
      type: 'mention',
      title: 'You were mentioned',
      message: `${mention.mentionedBy} mentioned you in ${mention.context}`,
      data: { 
        mentionId: mention.id,
        link: mention.link 
      },
      timestamp: new Date().toISOString()
    };
    this.sendNotification(userId, notification);
  }

  // Method to broadcast dashboard updates
  public broadcastDashboardUpdate(userId: string, update: any) {
    this.io.to(`user:${userId}`).emit('dashboard_update', {
      ...update,
      timestamp: Date.now()
    });
    logger.info('Dashboard update broadcasted', { userId, updateType: update.type });
  }

  // Method to broadcast group activity updates to all members
  public broadcastGroupActivityUpdate(groupId: string, activity: any) {
    this.io.to(`group:${groupId}`).emit('group_activity_update', {
      ...activity,
      timestamp: Date.now()
    });
    logger.info('Group activity update broadcasted', { groupId, activityType: activity.type });
  }

  // Method to broadcast whiteboard drawing actions
  public broadcastDrawingAction(whiteboardId: string, action: string, data: any) {
    this.io.to(`whiteboard:${whiteboardId}`).emit(action, {
      ...data,
      timestamp: Date.now()
    });
    logger.info('Drawing action broadcasted', { whiteboardId, action });
  }

  // Method to broadcast whiteboard element updates
  public broadcastElementUpdate(whiteboardId: string, action: string, data: any) {
    this.io.to(`whiteboard:${whiteboardId}`).emit(action, {
      ...data,
      timestamp: Date.now()
    });
    logger.info('Element update broadcasted', { whiteboardId, action });
  }

  // Helper method to get whiteboard participants
  private async getWhiteboardParticipants(whiteboardId: string): Promise<Array<{ userId: string; user: any }>> {
    try {
      const sockets = await this.io.in(`whiteboard:${whiteboardId}`).fetchSockets();
      return sockets.map((socket: any) => ({
        userId: socket.userId,
        user: socket.user
      }));
    } catch (error) {
      logger.error('Error getting whiteboard participants', { error, whiteboardId });
      return [];
    }
  }

  // Helper method to get call participants
  private async getCallParticipants(callId: string): Promise<Array<{ userId: string; user: any }>> {
    try {
      const sockets = await this.io.in(`call:${callId}`).fetchSockets();
      return sockets.map((socket: any) => ({
        userId: socket.userId,
        user: socket.user
      }));
    } catch (error) {
      logger.error('Error getting call participants', { error, callId });
      return [];
    }
  }

  // Method to broadcast call events
  public broadcastCallEvent(callId: string, event: string, data: any) {
    this.io.to(`call:${callId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    });
    logger.info('Call event broadcasted', { callId, event });
  }

  // Method to send call invitation
  public sendCallInvitation(userId: string, invitation: any) {
    this.io.to(`user:${userId}`).emit('call_invitation', {
      ...invitation,
      timestamp: Date.now()
    });
    logger.info('Call invitation sent', { userId, callId: invitation.callId });
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