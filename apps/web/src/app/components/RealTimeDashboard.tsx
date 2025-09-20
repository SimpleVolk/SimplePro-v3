'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import styles from './RealTimeDashboard.module.css';

interface ConnectedUser {
  socketId: string;
  userId: string;
  userRole: string;
  crewId?: string;
  connectedAt: string;
}

interface JobUpdate {
  jobId: string;
  status?: string;
  message?: string;
  timestamp: string;
}

interface CrewStatus {
  userId: string;
  crewId?: string;
  status: string;
  message?: string;
  timestamp: string;
}

interface LocationUpdate {
  userId: string;
  crewId?: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  jobId?: string;
  timestamp: string;
}

interface SystemStats {
  activeJobs: number;
  onlineCrews: number;
  pendingEstimates: number;
  dailyRevenue: number;
  timestamp: string;
}

export const RealTimeDashboard: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [recentJobUpdates, setRecentJobUpdates] = useState<JobUpdate[]>([]);
  const [crewStatuses, setCrewStatuses] = useState<CrewStatus[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('http://localhost:3001/realtime', {
      auth: {
        token: localStorage.getItem('access_token'), // Assume token is stored in localStorage
      },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Real-time event handlers
    newSocket.on('userOnline', (data) => {
      setConnectedUsers(prev => [
        ...prev.filter(user => user.userId !== data.userId),
        {
          socketId: 'unknown',
          userId: data.userId,
          userRole: data.role,
          crewId: data.crewId,
          connectedAt: data.timestamp,
        }
      ]);
    });

    newSocket.on('userOffline', (data) => {
      setConnectedUsers(prev => prev.filter(user => user.userId !== data.userId));
    });

    newSocket.on('jobStatusChanged', (data) => {
      setRecentJobUpdates(prev => [
        {
          jobId: data.jobId,
          status: data.status,
          message: data.message || `Job status changed to ${data.status}`,
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 9) // Keep only latest 10
      ]);
    });

    newSocket.on('crewStatusUpdate', (data) => {
      setCrewStatuses(prev => [
        {
          userId: data.userId,
          crewId: data.crewId,
          status: data.status,
          message: data.message,
          timestamp: data.timestamp,
        },
        ...prev.filter(status => status.userId !== data.userId).slice(0, 9)
      ]);
    });

    newSocket.on('crewLocationUpdate', (data) => {
      setLocationUpdates(prev => [
        {
          userId: data.userId,
          crewId: data.crewId,
          location: data.location,
          jobId: data.jobId,
          timestamp: data.timestamp,
        },
        ...prev.filter(update => update.userId !== data.userId).slice(0, 19) // Keep latest 20
      ]);
    });

    newSocket.on('liveStats', (data) => {
      setSystemStats(data);
    });

    newSocket.on('notification', (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 9)]);
    });

    newSocket.on('emergencyAlert', (data) => {
      setNotifications(prev => [
        {
          ...data,
          type: 'emergency',
          priority: 'urgent',
        },
        ...prev.slice(0, 9)
      ]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#10b981'; // green
      case 'busy':
        return '#f59e0b'; // yellow
      case 'break':
        return '#3b82f6'; // blue
      case 'offline':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>SimplePro Live Dashboard</h1>
        <div className={styles.connectionStatus}>
          <div
            className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* System Stats */}
      {systemStats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Active Jobs</h3>
            <div className={styles.statNumber}>{systemStats.activeJobs}</div>
          </div>
          <div className={styles.statCard}>
            <h3>Online Crews</h3>
            <div className={styles.statNumber}>{systemStats.onlineCrews}</div>
          </div>
          <div className={styles.statCard}>
            <h3>Pending Estimates</h3>
            <div className={styles.statNumber}>{systemStats.pendingEstimates}</div>
          </div>
          <div className={styles.statCard}>
            <h3>Daily Revenue</h3>
            <div className={styles.statNumber}>${systemStats.dailyRevenue.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {/* Connected Users */}
        <div className={styles.panel}>
          <h2>Connected Users ({connectedUsers.length})</h2>
          <div className={styles.userList}>
            {connectedUsers.map((user) => (
              <div key={user.userId} className={styles.userItem}>
                <div className={styles.userInfo}>
                  <span className={styles.userId}>User {user.userId}</span>
                  <span className={styles.userRole}>{user.userRole}</span>
                  {user.crewId && <span className={styles.crewId}>Crew {user.crewId}</span>}
                </div>
                <span className={styles.connectTime}>
                  {formatTime(user.connectedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Job Updates */}
        <div className={styles.panel}>
          <h2>Recent Job Updates</h2>
          <div className={styles.updatesList}>
            {recentJobUpdates.map((update, index) => (
              <div key={index} className={styles.updateItem}>
                <div className={styles.updateInfo}>
                  <span className={styles.jobId}>Job {update.jobId}</span>
                  <span className={styles.updateMessage}>{update.message}</span>
                  {update.status && (
                    <span className={`${styles.status} ${styles[update.status]}`}>
                      {update.status}
                    </span>
                  )}
                </div>
                <span className={styles.updateTime}>
                  {formatTime(update.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Crew Status */}
        <div className={styles.panel}>
          <h2>Crew Status</h2>
          <div className={styles.crewList}>
            {crewStatuses.map((crew, index) => (
              <div key={index} className={styles.crewItem}>
                <div className={styles.crewInfo}>
                  <span className={styles.crewId}>
                    User {crew.userId}
                    {crew.crewId && ` (Crew ${crew.crewId})`}
                  </span>
                  <div
                    className={styles.statusIndicator}
                    style={{ backgroundColor: getStatusColor(crew.status) }}
                  />
                  <span className={styles.statusText}>{crew.status}</span>
                  {crew.message && (
                    <span className={styles.statusMessage}>{crew.message}</span>
                  )}
                </div>
                <span className={styles.updateTime}>
                  {formatTime(crew.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Location Updates */}
        <div className={styles.panel}>
          <h2>Location Updates</h2>
          <div className={styles.locationList}>
            {locationUpdates.slice(0, 5).map((location, index) => (
              <div key={index} className={styles.locationItem}>
                <div className={styles.locationInfo}>
                  <span className={styles.userId}>User {location.userId}</span>
                  <span className={styles.coordinates}>
                    {location.location.latitude.toFixed(4)}, {location.location.longitude.toFixed(4)}
                  </span>
                  {location.location.accuracy && (
                    <span className={styles.accuracy}>
                      ±{Math.round(location.location.accuracy)}m
                    </span>
                  )}
                  {location.jobId && (
                    <span className={styles.jobId}>Job {location.jobId}</span>
                  )}
                </div>
                <span className={styles.updateTime}>
                  {formatTime(location.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className={styles.panel}>
          <h2>Live Notifications</h2>
          <div className={styles.notificationsList}>
            {notifications.map((notification, index) => (
              <div
                key={index}
                className={`${styles.notification} ${styles[notification.type || 'info']}`}
              >
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <span className={styles.notificationTitle}>
                      {notification.title || 'Notification'}
                    </span>
                    <button
                      className={styles.closeButton}
                      onClick={() => removeNotification(index)}
                    >
                      ×
                    </button>
                  </div>
                  <span className={styles.notificationMessage}>
                    {notification.message}
                  </span>
                  <span className={styles.notificationTime}>
                    {formatTime(notification.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};