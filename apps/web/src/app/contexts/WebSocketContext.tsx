'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../../lib/config';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToAnalytics: (dashboardType?: string) => void;
  unsubscribeFromAnalytics: (dashboardType?: string) => void;
  lastUpdate: number;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Create socket connection
    const newSocket = io(getWebSocketUrl(), {
      auth: {
        token: token,
      },
      transports: ['websocket'],
      upgrade: true,
      rememberUpgrade: true,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('SimplePro WebSocket connected:', data);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Analytics-specific event handlers
    newSocket.on('analyticsUpdate', (data) => {
      console.log('Analytics update received:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('analyticsUpdate', { detail: data }));
    });

    newSocket.on('metricsUpdate', (data) => {
      console.log('Metrics update received:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('metricsUpdate', { detail: data }));
    });

    newSocket.on('reportUpdate', (data) => {
      console.log('Report update received:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('reportUpdate', { detail: data }));
    });

    newSocket.on('analyticsSubscribed', (data) => {
      console.log('Subscribed to analytics:', data);
    });

    newSocket.on('analyticsUnsubscribed', (data) => {
      console.log('Unsubscribed from analytics:', data);
    });

    // Job update handlers (for real-time dashboard)
    newSocket.on('jobUpdate', (data) => {
      console.log('Job update received:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('jobUpdate', { detail: data }));
    });

    // Notification event handlers (for real-time notifications)
    newSocket.on('notification.created', (data) => {
      console.log('Notification created:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('notificationCreated', { detail: data }));
    });

    newSocket.on('notification.updated', (data) => {
      console.log('Notification updated:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('notificationUpdated', { detail: data }));
    });

    // Message event handlers (for real-time messaging)
    newSocket.on('message.created', (data) => {
      console.log('Message created:', data);
      setLastUpdate(Date.now());

      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('messageCreated', { detail: data }));
    });

    newSocket.on('user.typing', (data) => {
      // Dispatch custom event for typing indicators
      window.dispatchEvent(new CustomEvent('userTyping', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, [user]);

  const subscribeToAnalytics = (dashboardType?: string) => {
    if (socket && isConnected) {
      console.log('Subscribing to analytics:', dashboardType);
      socket.emit('subscribeToAnalytics', { dashboardType });
    }
  };

  const unsubscribeFromAnalytics = (dashboardType?: string) => {
    if (socket && isConnected) {
      console.log('Unsubscribing from analytics:', dashboardType);
      socket.emit('unsubscribeFromAnalytics', { dashboardType });
    }
  };

  const value = {
    socket,
    isConnected,
    subscribeToAnalytics,
    unsubscribeFromAnalytics,
    lastUpdate,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}