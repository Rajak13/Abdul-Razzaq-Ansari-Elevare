import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = token;
    
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    this.socket.on('error', (error: any) => {
      // Handle empty error objects
      if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
        console.error('🔴 Socket error: Empty error object - possible server disconnection');
        return;
      }
      
      const errorMessage = error.message || error.toString() || 'Unknown socket error';
      console.error('🔴 Socket error:', errorMessage);
    });

    this.socket.on('connect_error', (error: any) => {
      const errorMessage = error?.message || error?.toString() || 'Connection failed - check server status';
      console.error('🔴 Connection error:', errorMessage);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Group-related methods
  joinGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('join_group', groupId);
    }
  }

  leaveGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('leave_group', groupId);
    }
  }

  // Typing indicators
  startTyping(groupId: string) {
    if (this.socket) {
      this.socket.emit('typing_start', groupId);
    }
  }

  stopTyping(groupId: string) {
    if (this.socket) {
      this.socket.emit('typing_stop', groupId);
    }
  }

  // Event listeners
  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onUserJoined(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_joined', callback);
    }
  }

  onUserLeft(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_left', callback);
    }
  }

  onUserTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStoppedTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_stopped_typing', callback);
    }
  }

  onNotification(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  offNotification(callback?: (notification: any) => void) {
    if (this.socket) {
      this.socket.off('notification', callback);
    }
  }

  // Notification management
  markNotificationRead(notificationId: string) {
    if (this.socket) {
      this.socket.emit('mark_notification_read', notificationId);
    }
  }

  markAllNotificationsRead() {
    if (this.socket) {
      this.socket.emit('mark_all_notifications_read');
    }
  }

  onNotificationRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('notification_read', callback);
    }
  }

  onAllNotificationsRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('all_notifications_read', callback);
    }
  }

  // Dashboard methods
  joinDashboard() {
    if (this.socket) {
      this.socket.emit('join_dashboard');
    }
  }

  leaveDashboard() {
    if (this.socket) {
      this.socket.emit('leave_dashboard');
    }
  }

  onDashboardUpdate(callback: (update: any) => void) {
    if (this.socket) {
      this.socket.on('dashboard_update', callback);
    }
  }

  onGroupActivityUpdate(callback: (activity: any) => void) {
    if (this.socket) {
      this.socket.on('group_activity_update', callback);
    }
  }

  offDashboardUpdate(callback?: (update: any) => void) {
    if (this.socket) {
      this.socket.off('dashboard_update', callback);
    }
  }

  offGroupActivityUpdate(callback?: (activity: any) => void) {
    if (this.socket) {
      this.socket.off('group_activity_update', callback);
    }
  }

  onGroupUpdate(callback: (update: any) => void) {
    if (this.socket) {
      this.socket.on('group_update', callback);
    }
  }

  // Whiteboard methods with improved synchronization
  joinWhiteboard(whiteboardId: string) {
    if (this.socket) {
      this.socket.emit('whiteboard_join', whiteboardId);
    }
  }

  leaveWhiteboard(whiteboardId: string) {
    if (this.socket) {
      this.socket.emit('whiteboard_leave', whiteboardId);
    }
  }

  // Drawing events with operation ordering
  emitDrawStart(whiteboardId: string, x: number, y: number, tool: string, color: string, size: number) {
    if (this.socket) {
      this.socket.emit('draw_start', { 
        whiteboardId, 
        x, 
        y, 
        tool, 
        color, 
        size, 
        timestamp: Date.now(),
        operationId: `${Date.now()}-${Math.random()}`
      });
    }
  }

  emitDrawMove(whiteboardId: string, x: number, y: number, operationId?: string) {
    if (this.socket) {
      this.socket.emit('draw_move', { 
        whiteboardId, 
        x, 
        y, 
        timestamp: Date.now(),
        operationId
      });
    }
  }

  emitDrawEnd(whiteboardId: string, operationId?: string) {
    if (this.socket) {
      this.socket.emit('draw_end', { 
        whiteboardId, 
        timestamp: Date.now(),
        operationId
      });
    }
  }

  // Element manipulation events with conflict resolution
  emitAddElement(whiteboardId: string, element: any) {
    if (this.socket) {
      this.socket.emit('add_element', { 
        whiteboardId, 
        element: {
          ...element,
          timestamp: Date.now(),
          version: 1
        },
        operationId: `add-${element.id}`,
        timestamp: Date.now()
      });
    }
  }

  emitUpdateElement(whiteboardId: string, elementId: string, updates: any) {
    if (this.socket) {
      this.socket.emit('update_element', { 
        whiteboardId, 
        elementId, 
        updates: {
          ...updates,
          lastModified: Date.now()
        },
        operationId: `update-${elementId}-${Date.now()}`,
        timestamp: Date.now()
      });
    }
  }

  emitDeleteElement(whiteboardId: string, elementId: string) {
    if (this.socket) {
      this.socket.emit('delete_element', { 
        whiteboardId, 
        elementId,
        operationId: `delete-${elementId}`,
        timestamp: Date.now()
      });
    }
  }

  emitClearCanvas(whiteboardId: string) {
    if (this.socket) {
      this.socket.emit('clear_canvas', { 
        whiteboardId,
        operationId: `clear-${Date.now()}`,
        timestamp: Date.now()
      });
    }
  }

  // Batch operations for better performance
  emitBatchOperations(whiteboardId: string, operations: any[]) {
    if (this.socket) {
      this.socket.emit('batch_operations', {
        whiteboardId,
        operations: operations.map(op => ({
          ...op,
          timestamp: Date.now()
        })),
        batchId: `batch-${Date.now()}-${Math.random()}`,
        timestamp: Date.now()
      });
    }
  }

  // Cursor tracking with throttling
  private cursorThrottle: { [key: string]: number } = {};
  
  emitCursorMove(whiteboardId: string, x: number, y: number, userId: string, userName: string, color: string) {
    if (this.socket) {
      const now = Date.now();
      const throttleKey = `${whiteboardId}-${userId}`;
      
      // Throttle cursor updates to 60fps (16ms)
      if (this.cursorThrottle[throttleKey] && now - this.cursorThrottle[throttleKey] < 16) {
        return;
      }
      
      this.cursorThrottle[throttleKey] = now;
      
      this.socket.emit('cursor_move', {
        whiteboardId,
        x,
        y,
        userId,
        userName,
        color,
        timestamp: now
      });
    }
  }

  emitCursorLeave(whiteboardId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('cursor_leave', {
        whiteboardId,
        userId,
        timestamp: Date.now()
      });
    }
  }

  // Whiteboard event listeners
  onWhiteboardJoined(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('whiteboard_joined', callback);
    }
  }

  onUserJoinedWhiteboard(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_joined_whiteboard', callback);
    }
  }

  onUserLeftWhiteboard(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_left_whiteboard', callback);
    }
  }

  onDrawStart(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('draw_start', callback);
    }
  }

  onDrawMove(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('draw_move', callback);
    }
  }

  onDrawEnd(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('draw_end', callback);
    }
  }

  onAddElement(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('add_element', callback);
    }
  }

  onUpdateElement(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('update_element', callback);
    }
  }

  onDeleteElement(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('delete_element', callback);
    }
  }

  onClearCanvas(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('clear_canvas', callback);
    }
  }

  // Batch operations
  onBatchOperations(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('batch_operations', callback);
    }
  }

  offBatchOperations(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('batch_operations', callback);
    }
  }

  // Cursor events
  onCursorMove(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('cursor_move', callback);
    }
  }

  onCursorLeave(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('cursor_leave', callback);
    }
  }

  offCursorMove(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('cursor_move', callback);
    }
  }

  offCursorLeave(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('cursor_leave', callback);
    }
  }

  // Synchronization events
  onSyncRequest(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('sync_request', callback);
    }
  }

  onSyncResponse(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('sync_response', callback);
    }
  }

  emitSyncRequest(whiteboardId: string) {
    if (this.socket) {
      this.socket.emit('sync_request', { whiteboardId, timestamp: Date.now() });
    }
  }

  emitSyncResponse(whiteboardId: string, elements: any[]) {
    if (this.socket) {
      this.socket.emit('sync_response', { 
        whiteboardId, 
        elements, 
        timestamp: Date.now() 
      });
    }
  }

  // Remove whiteboard event listeners
  offDrawStart(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('draw_start', callback);
    }
  }

  offDrawMove(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('draw_move', callback);
    }
  }

  offDrawEnd(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('draw_end', callback);
    }
  }

  offAddElement(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('add_element', callback);
    }
  }

  offUpdateElement(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('update_element', callback);
    }
  }

  offDeleteElement(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('delete_element', callback);
    }
  }

  offClearCanvas(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('clear_canvas', callback);
    }
  }

  // Remove event listeners
  offNewMessage(callback?: (message: any) => void) {
    if (this.socket) {
      this.socket.off('new_message', callback);
    }
  }

  offUserJoined(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('user_joined', callback);
    }
  }

  offUserLeft(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('user_left', callback);
    }
  }

  offUserTyping(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('user_typing', callback);
    }
  }

  offUserStoppedTyping(callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off('user_stopped_typing', callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;