/**
 * WebSocket Service
 *
 * Real-time communication for job updates and notifications
 */

import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { updateJobLocally } from '../store/slices/jobsSlice';
import { addNotification } from '../store/slices/notificationsSlice';
import {
  addMessageToThread,
  setTypingIndicator,
  updateThreadLocally,
} from '../store/slices/messagesSlice';
import PushNotification from 'react-native-push-notification';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  connect(token: string) {
    const WS_URL = __DEV__
      ? 'http://localhost:3001'
      : 'https://api.simplepro.com';

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
      }
    });

    // Job updates
    this.socket.on('job.updated', (data) => {
      console.log('Job updated:', data);
      store.dispatch(updateJobLocally(data));

      // Show local notification
      this.showLocalNotification({
        title: 'Job Updated',
        message: `Job #${data.jobNumber} has been updated`,
      });
    });

    // Job assigned
    this.socket.on('job.assigned', (data) => {
      console.log('Job assigned:', data);

      store.dispatch(
        addNotification({
          id: Date.now().toString(),
          title: 'New Job Assigned',
          message: `You've been assigned to job #${data.jobNumber}`,
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
          data,
        }),
      );

      this.showLocalNotification({
        title: 'New Job Assigned',
        message: `Job #${data.jobNumber} - ${data.customerName}`,
      });
    });

    // Job status changed
    this.socket.on('job.status_changed', (data) => {
      console.log('Job status changed:', data);

      store.dispatch(
        addNotification({
          id: Date.now().toString(),
          title: 'Job Status Changed',
          message: `Job #${data.jobNumber} is now ${data.status}`,
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
          data,
        }),
      );
    });

    // General notifications
    this.socket.on('notification.new', (notification) => {
      console.log('New notification:', notification);

      store.dispatch(
        addNotification({
          id: notification.id || Date.now().toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          timestamp: new Date().toISOString(),
          read: false,
          data: notification.data,
        }),
      );

      this.showLocalNotification({
        title: notification.title,
        message: notification.message,
      });
    });

    // New message received
    this.socket.on('message.new', (message) => {
      console.log('New message:', message);

      // Add message to Redux store
      store.dispatch(
        addMessageToThread({
          threadId: message.threadId,
          message,
        }),
      );

      // Show push notification if not in the conversation
      const currentThreadId = store.getState().messages.currentThreadId;
      if (currentThreadId !== message.threadId) {
        this.showLocalNotification({
          title: `New Message: ${message.senderName}`,
          message: message.content,
        });
      }

      // Add to notifications list
      store.dispatch(
        addNotification({
          id: message.id || Date.now().toString(),
          title: `Message from ${message.senderName}`,
          message: message.content,
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
          data: message,
        }),
      );
    });

    // Message thread updated (read status, etc.)
    this.socket.on('message.updated', (data) => {
      console.log('Message updated:', data);

      if (data.threadId && data.message) {
        store.dispatch(
          addMessageToThread({
            threadId: data.threadId,
            message: data.message,
          }),
        );
      }
    });

    // Thread updated (new participant, subject change, etc.)
    this.socket.on('thread.updated', (thread) => {
      console.log('Thread updated:', thread);

      store.dispatch(updateThreadLocally(thread));
    });

    // Typing indicators
    this.socket.on('typing.start', (data) => {
      console.log('User started typing:', data);

      store.dispatch(
        setTypingIndicator({
          threadId: data.threadId,
          userId: data.userId,
          userName: data.userName,
          isTyping: true,
        }),
      );
    });

    this.socket.on('typing.stop', (data) => {
      console.log('User stopped typing:', data);

      store.dispatch(
        setTypingIndicator({
          threadId: data.threadId,
          userId: data.userId,
          userName: data.userName,
          isTyping: false,
        }),
      );
    });
  }

  /**
   * Show local push notification
   */
  private showLocalNotification({
    title,
    message,
  }: {
    title: string;
    message: string;
  }) {
    PushNotification.localNotification({
      channelId: 'job-updates',
      title,
      message,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Emit event to server
   */
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new WebSocketService();
