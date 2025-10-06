import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';

interface WebSocketContextType {
  isConnected: boolean;
  connectionError: string | null;
  messages: WebSocketMessage[];
  notifications: any[];
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
  sendLocationUpdate: (location: any) => void;
  sendStatusUpdate: (status: any) => void;
  sendMessage: (message: any) => void;
  sendEmergencyAlert: (alert: any) => void;
  clearMessages: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  getLatestMessages: (type?: string, limit?: number) => WebSocketMessage[];
  getUnreadNotifications: () => any[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const webSocket = useWebSocket();
  const [lastKnownLocation, setLastKnownLocation] = useState<any>(null);

  // Auto-send location updates for crew members
  useEffect(() => {
    if (!isAuthenticated || !webSocket.isConnected) {
      return;
    }

    const sendPeriodicLocationUpdate = () => {
      if (lastKnownLocation) {
        webSocket.sendLocationUpdate(lastKnownLocation);
      }
    };

    // Send location every 30 seconds for crew members
    const locationInterval = setInterval(sendPeriodicLocationUpdate, 30000);

    return () => {
      clearInterval(locationInterval);
    };
  }, [isAuthenticated, webSocket.isConnected, lastKnownLocation, webSocket]);

  // Location tracking for crew members
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let watchId: number | null = null;

    const startLocationTracking = () => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
            };
            setLastKnownLocation(location);
          },
          (error) => {
            console.warn('Location tracking error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000, // 1 minute
          },
        );
      }
    };

    startLocationTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isAuthenticated]);

  const value = {
    isConnected: webSocket.isConnected,
    connectionError: webSocket.connectionError,
    messages: webSocket.messages,
    notifications: webSocket.notifications,
    subscribeToJob: webSocket.subscribeToJob,
    unsubscribeFromJob: webSocket.unsubscribeFromJob,
    sendLocationUpdate: webSocket.sendLocationUpdate,
    sendStatusUpdate: webSocket.sendStatusUpdate,
    sendMessage: webSocket.sendMessage,
    sendEmergencyAlert: webSocket.sendEmergencyAlert,
    clearMessages: webSocket.clearMessages,
    clearNotifications: webSocket.clearNotifications,
    removeNotification: webSocket.removeNotification,
    getLatestMessages: webSocket.getLatestMessages,
    getUnreadNotifications: webSocket.getUnreadNotifications,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider',
    );
  }
  return context;
};
