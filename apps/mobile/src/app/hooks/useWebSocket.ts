import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  jobId?: string;
}

export interface StatusUpdate {
  status: 'available' | 'busy' | 'break' | 'offline';
  message?: string;
  jobId?: string;
}

export interface ChatMessage {
  to: 'job' | 'crew' | 'user' | 'broadcast';
  targetId?: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface EmergencyAlert {
  type: 'accident' | 'injury' | 'property_damage' | 'security' | 'weather' | 'other';
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  jobId?: string;
}

export const useWebSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useNetworkStatus();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!isAuthenticated || !user || !isOnline) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        return;
      }

      // Disconnect existing connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Create new connection
      const socket = io(`${API_BASE_URL}/realtime`, {
        auth: {
          token,
        },
        transports: ['websocket'],
        upgrade: true,
        autoConnect: true,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket:', reason);
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          setTimeout(() => {
            socket.connect();
          }, 1000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Message handlers
      socket.on('connected', (data) => {
        console.log('WebSocket connection confirmed:', data);
      });

      socket.on('newMessage', (data) => {
        const message: WebSocketMessage = {
          id: data.id,
          type: 'chat',
          data,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, message]);
      });

      socket.on('notification', (data) => {
        setNotifications(prev => [...prev, data]);
      });

      socket.on('jobUpdate', (data) => {
        const message: WebSocketMessage = {
          id: `job_update_${Date.now()}`,
          type: 'jobUpdate',
          data,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, message]);
      });

      socket.on('jobStatusChanged', (data) => {
        const message: WebSocketMessage = {
          id: `job_status_${Date.now()}`,
          type: 'jobStatusChanged',
          data,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, message]);
      });

      socket.on('jobAssigned', (data) => {
        const message: WebSocketMessage = {
          id: `job_assigned_${Date.now()}`,
          type: 'jobAssigned',
          data,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, message]);

        // Show notification for job assignment
        setNotifications(prev => [...prev, {
          id: `assignment_${Date.now()}`,
          type: 'success',
          title: 'New Job Assigned',
          message: `You have been assigned to job ${data.jobId}`,
          priority: 'high',
        }]);
      });

      socket.on('emergencyAlert', (data) => {
        const message: WebSocketMessage = {
          id: `emergency_${Date.now()}`,
          type: 'emergency',
          data,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, message]);

        // Show urgent notification for emergency
        setNotifications(prev => [...prev, {
          id: `emergency_${Date.now()}`,
          type: 'error',
          title: 'EMERGENCY ALERT',
          message: data.message,
          priority: 'urgent',
          persistent: true,
        }]);
      });

      socket.on('crewStatusUpdate', (data) => {
        const message: WebSocketMessage = {
          id: `crew_status_${Date.now()}`,
          type: 'crewStatus',
          data,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, message]);
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        setConnectionError(error.message);
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError('Failed to connect');
    }
  }, [isAuthenticated, user, isOnline, API_BASE_URL]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Subscribe to job updates
  const subscribeToJob = useCallback((jobId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribeToJob', { jobId });
    }
  }, [isConnected]);

  // Unsubscribe from job updates
  const unsubscribeFromJob = useCallback((jobId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribeFromJob', { jobId });
    }
  }, [isConnected]);

  // Send location update
  const sendLocationUpdate = useCallback((location: LocationUpdate) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('locationUpdate', location);
    }
  }, [isConnected]);

  // Send status update
  const sendStatusUpdate = useCallback((status: StatusUpdate) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('statusUpdate', status);
    }
  }, [isConnected]);

  // Send chat message
  const sendMessage = useCallback((message: ChatMessage) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('sendMessage', message);
    }
  }, [isConnected]);

  // Send emergency alert
  const sendEmergencyAlert = useCallback((alert: EmergencyAlert) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('emergencyAlert', alert);
    }
  }, [isConnected]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Auto-connect/disconnect based on auth and network status
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, isOnline, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    connectionError,

    // Data
    messages,
    notifications,

    // Actions
    connect,
    disconnect,
    subscribeToJob,
    unsubscribeFromJob,
    sendLocationUpdate,
    sendStatusUpdate,
    sendMessage,
    sendEmergencyAlert,
    clearMessages,
    clearNotifications,
    removeNotification,

    // Helpers
    getLatestMessages: (type?: string, limit = 10) => {
      const filtered = type ? messages.filter(m => m.type === type) : messages;
      return filtered.slice(-limit);
    },

    getUnreadNotifications: () => {
      return notifications.filter(n => !n.read);
    },
  };
};