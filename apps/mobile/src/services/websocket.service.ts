/**
 * WebSocket Service
 *
 * Real-time communication for job updates and notifications
 */

import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { updateJobLocally } from '../store/slices/jobsSlice';
import { addNotification } from '../store/slices/notificationsSlice';
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

    // Dispatcher messages
    this.socket.on('message.new', (message) => {
      console.log('New message:', message);

      this.showLocalNotification({
        title: 'New Message from Dispatcher',
        message: message.content,
      });
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
