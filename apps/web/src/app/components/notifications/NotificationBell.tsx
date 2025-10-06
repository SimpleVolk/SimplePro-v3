'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getApiUrl } from '../../../lib/config';
import styles from './NotificationBell.module.css';

interface Notification {
  id: string;
  type:
    | 'job_assigned'
    | 'shift_reminder'
    | 'customer_inquiry'
    | 'quote_request'
    | 'job_completed'
    | 'payment_received'
    | 'system_alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

const NOTIFICATION_TYPE_ICONS: Record<Notification['type'], string> = {
  job_assigned: '📋',
  shift_reminder: '⏰',
  customer_inquiry: '💬',
  quote_request: '📄',
  job_completed: '✅',
  payment_received: '💰',
  system_alert: '⚠️',
};

interface NotificationBellProps {
  onNavigate?: (path: string) => void;
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { socket, isConnected } = useWebSocket();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch recent notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(getApiUrl('notifications?limit=5&page=1'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setNotifications(result.data.notifications || []);
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotificationCreated = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev.slice(0, 4)]);
      setUnreadCount((prev) => prev + 1);

      // Play sound for urgent notifications
      if (notification.priority === 'urgent' && audioRef.current) {
        audioRef.current
          .play()
          .catch((err) => console.error('Audio play error:', err));
      }

      // Show browser notification if permitted
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    };

    const handleNotificationUpdated = (updatedNotification: Notification) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === updatedNotification.id ? updatedNotification : n,
        ),
      );
      if (updatedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    socket.on('notification.created', handleNotificationCreated);
    socket.on('notification.updated', handleNotificationUpdated);

    return () => {
      socket.off('notification.created', handleNotificationCreated);
      socket.off('notification.updated', handleNotificationUpdated);
    };
  }, [socket, isConnected]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Request notification permission on mount
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(
        getApiUrl(`notifications/${notificationId}/read`),
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ read: true }),
        },
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        type="button"
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount} new</span>
            )}
          </div>

          <div className={styles.notificationList}>
            {loading && <div className={styles.loading}>Loading...</div>}

            {!loading && notifications.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔕</span>
                <p className={styles.emptyText}>No notifications</p>
              </div>
            )}

            {!loading &&
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  type="button"
                >
                  <div className={styles.notificationIcon}>
                    {NOTIFICATION_TYPE_ICONS[notification.type]}
                  </div>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {notification.title}
                    </div>
                    <div className={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div className={styles.notificationTime}>
                      {formatTimestamp(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className={styles.unreadDot}></div>
                  )}
                </button>
              ))}
          </div>

          <div className={styles.dropdownFooter}>
            <button
              className={styles.viewAllButton}
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/notifications');
                }
                setIsOpen(false);
              }}
              type="button"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio element for notification sound */}
      <audio
        ref={audioRef}
        src="/notification-sound.mp3"
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  );
}
