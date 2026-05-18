/**
 * ZALEGRAM Socket.IO Service Layer
 * Wrapper functions cho tất cả Socket.IO events
 */

import { SOCKET_CONFIG, CONVERSATION_TYPES } from './config.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.listeners = {};
    this.activeRoomId = null;
  }

  /**
   * Initialize Socket.IO connection
   */
  init() {
    try {
      this.socket = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);
      
      this.setupBaseListeners();
      console.log('Socket.IO service initialized');
      
      return this.socket;
    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
      throw error;
    }
  }

  /**
   * Setup base event listeners
   */
  setupBaseListeners() {
    // Connection events
    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnecting = false;
      console.log('✅ Connected to WebSocket');
      this.emit('onConnected');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('❌ Disconnected from WebSocket');
      this.emit('onDisconnected');
    });

    this.socket.on('reconnecting', () => {
      this.reconnecting = true;
      console.log('🔄 Reconnecting to WebSocket...');
      this.emit('onReconnecting');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('onError', error);
    });

    // Message events
    this.socket.on('new-message', (message) => {
      console.log('📨 New message:', message);
      this.emit('onNewMessage', message);
    });

    // Presence events
    this.socket.on('user-joined', (data) => {
      console.log('👋 User joined:', data.username);
      this.emit('onUserJoined', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('👋 User left:', data.username);
      this.emit('onUserLeft', data);
    });

    this.socket.on('user-typing', (data) => {
      this.emit('onUserTyping', data);
    });
  }

  /**
   * Register custom event listener
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  /**
   * Emit custom event
   */
  emit(eventName, data = null) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * ROOM EVENTS
   */

  // Join conversation
  joinRoom(conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.activeRoomId = conversationId;
      
      this.socket.emit('join-room', 
        { conversationId },
        (response) => {
          if (response?.success) {
            console.log('✅ Joined room:', conversationId);
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to join room'));
          }
        }
      );
    });
  }

  // Leave conversation
  leaveRoom(conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('leave-room', { conversationId }, (response) => {
        if (response?.success) {
          console.log('👋 Left room:', conversationId);
          this.activeRoomId = null;
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to leave room'));
        }
      });
    });
  }

  /**
   * MESSAGE EVENTS
   */

  // Send message
  sendMessage(conversationId, content) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      if (!content || content.trim().length === 0) {
        reject(new Error('Message cannot be empty'));
        return;
      }

      this.socket.emit('send-message',
        { 
          conversationId,
          content: content.trim()
        },
        (response) => {
          if (response?.success) {
            console.log('📤 Message sent:', response.messageId);
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to send message'));
          }
        }
      );
    });
  }

  // Get message history
  getMessageHistory(conversationId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('get-message-history',
        { conversationId, limit, offset },
        (response) => {
          if (response?.success) {
            console.log(`📚 Loaded ${response.messages?.length || 0} messages`);
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to load messages'));
          }
        }
      );
    });
  }

  /**
   * PRESENCE EVENTS
   */

  // Broadcast typing indicator
  setTyping(conversationId, isTyping = true) {
    if (!this.isConnected()) return;

    this.socket.emit('typing', {
      conversationId,
      isTyping
    });
  }

  // Get active users in room
  getActiveUsers(conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('get-active-users',
        { conversationId },
        (response) => {
          if (response?.success) {
            resolve(response.users || []);
          } else {
            reject(new Error(response?.error || 'Failed to get active users'));
          }
        }
      );
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      console.log('🔌 Socket disconnected');
    }
  }

  /**
   * Reconnect to server
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();