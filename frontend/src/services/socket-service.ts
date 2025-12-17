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
      console.error('🔴 Socket error:', error);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('🔴 Connection error:', error);
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

  onGroupUpdate(callback: (update: any) => void) {
    if (this.socket) {
      this.socket.on('group_update', callback);
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