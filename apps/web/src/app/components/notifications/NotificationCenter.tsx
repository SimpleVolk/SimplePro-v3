'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getApiUrl } from '../../../lib/config';
import styles from './NotificationCenter.module.css';

interface Notification {
  id: string;
  userId: string;
  type: 'job_assigned' | 'shift_reminder' | 'customer_inquiry' | 'quote_request' | 'job_completed' | 'payment_received' | 'system_alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

type FilterType = 'all' | 'unread' | 'job_updates' | 'customer_inquiries' | 'system';

const NOTIFICATION_TYPE_ICONS: Record<Notification['type'], string> = {
  job_assigned: '📋',
  shift_reminder: '⏰',
  customer_inquiry: '💬',
  quote_request: '📄',
  job_completed: '✅',
  payment_received: '💰',
  system_alert: '⚠️',
};

const NOTIFICATION_TYPE_LABELS: Record<Notification['type'], string> = {
  job_assigned: 'Job Assigned',
  shift_reminder: 'Shift Reminder',
  customer_inquiry: 'Customer Inquiry',
  quote_request: 'Quote Request',
  job_completed: 'Job Completed',
  payment_received: 'Payment Received',
  system_alert: 'System Alert',
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ unread: 0, today: 0 });
  const { socket, isConnected } = useWebSocket();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum: number, resetList = false) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
      });

      if (filter !== 'all') {
        if (filter === 'unread') {
          params.append('read', 'false');
        } else if (filter === 'job_updates') {
          params.append('type', 'job_assigned,shift_reminder,job_completed');
        } else if (filter === 'customer_inquiries') {
          params.append('type', 'customer_inquiry,quote_request');
        } else if (filter === 'system') {
          params.append('type', 'system_alert');
        }
      }

      const response = await fetch(getApiUrl(`notifications?${params.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const result = await response.json();
      const newNotifications = result.data.notifications || [];

      setNotifications(prev => resetList ? newNotifications : [...prev, ...newNotifications]);
      setHasMore(result.data.hasMore || false);

      // Update stats
      const unreadCount = result.data.unreadCount || 0;
      const todayCount = newNotifications.filter((n: Notification) => {
        const today = new Date();
        const notifDate = new Date(n.createdAt);
        return notifDate.toDateString() === today.toDateString();
      }).length;

      setStats({ unread: unreadCount, today: todayCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial load
  useEffect(() => {
    setPage(1);
    setNotifications([]);
    fetchNotifications(1, true);
  }, [filter, fetchNotifications]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotificationCreated = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setStats(prev => ({ ...prev, unread: prev.unread + 1 }));
    };

    const handleNotificationUpdated = (updatedNotification: Notification) => {
      setNotifications(prev =>
        prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
      );
      if (updatedNotification.read) {
        setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      }
    };

    socket.on('notification.created', handleNotificationCreated);
    socket.on('notification.updated', handleNotificationUpdated);

    return () => {
      socket.off('notification.created', handleNotificationCreated);
      socket.off('notification.updated', handleNotificationUpdated);
    };
  }, [socket, isConnected]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchNotifications(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, page, fetchNotifications]);

  // Mark notification as read/unread
  const toggleRead = async (notificationId: string, currentReadState: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(getApiUrl(`notifications/${notificationId}/read`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: !currentReadState }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: !currentReadState } : n)
        );
        setStats(prev => ({
          ...prev,
          unread: currentReadState ? prev.unread + 1 : Math.max(0, prev.unread - 1),
        }));
      }
    } catch (err) {
      console.error('Error toggling notification read state:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(getApiUrl(`notifications/${notificationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.read) {
          setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(getApiUrl('notifications/read-all'), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setStats(prev => ({ ...prev, unread: 0 }));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Delete all read notifications
  const deleteAllRead = async () => {
    const readNotifications = notifications.filter(n => n.read);
    for (const notification of readNotifications) {
      await deleteNotification(notification.id);
    }
  };

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = notifications;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        <div className={styles.stats}>
          <span className={styles.statBadge}>
            {stats.unread} Unread
          </span>
          <span className={styles.statBadge}>
            {stats.today} Today
          </span>
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.activeTab : ''}`}
          onClick={() => setFilter('all')}
          type="button"
        >
          All
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'unread' ? styles.activeTab : ''}`}
          onClick={() => setFilter('unread')}
          type="button"
        >
          Unread
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'job_updates' ? styles.activeTab : ''}`}
          onClick={() => setFilter('job_updates')}
          type="button"
        >
          Job Updates
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'customer_inquiries' ? styles.activeTab : ''}`}
          onClick={() => setFilter('customer_inquiries')}
          type="button"
        >
          Customer Inquiries
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'system' ? styles.activeTab : ''}`}
          onClick={() => setFilter('system')}
          type="button"
        >
          System
        </button>
      </div>

      <div className={styles.bulkActions}>
        <button
          className={styles.bulkActionButton}
          onClick={markAllAsRead}
          disabled={stats.unread === 0}
          type="button"
        >
          Mark All as Read
        </button>
        <button
          className={styles.bulkActionButton}
          onClick={deleteAllRead}
          disabled={notifications.filter(n => n.read).length === 0}
          type="button"
        >
          Delete All Read
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.notificationList}>
        {filteredNotifications.map(notification => (
          <div
            key={notification.id}
            className={`${styles.notificationCard} ${!notification.read ? styles.unread : ''} ${styles[`priority-${notification.priority}`]}`}
          >
            <div className={styles.notificationIcon}>
              {NOTIFICATION_TYPE_ICONS[notification.type]}
            </div>
            <div className={styles.notificationContent}>
              <div className={styles.notificationHeader}>
                <h3 className={styles.notificationTitle}>{notification.title}</h3>
                <span className={styles.notificationType}>
                  {NOTIFICATION_TYPE_LABELS[notification.type]}
                </span>
              </div>
              <p className={styles.notificationMessage}>{notification.message}</p>
              <div className={styles.notificationFooter}>
                <span className={styles.timestamp}>{formatTimestamp(notification.createdAt)}</span>
                {notification.priority !== 'normal' && notification.priority !== 'low' && (
                  <span className={`${styles.priorityBadge} ${styles[`priority-${notification.priority}`]}`}>
                    {notification.priority.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.notificationActions}>
              <button
                className={styles.actionButton}
                onClick={() => toggleRead(notification.id, notification.read)}
                title={notification.read ? 'Mark as unread' : 'Mark as read'}
                type="button"
              >
                {notification.read ? '📭' : '📬'}
              </button>
              <button
                className={styles.actionButton}
                onClick={() => deleteNotification(notification.id)}
                title="Delete notification"
                type="button"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {loading && page === 1 && (
          <div className={styles.loading}>Loading notifications...</div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔔</div>
            <p className={styles.emptyText}>No notifications</p>
          </div>
        )}

        {hasMore && !loading && (
          <div ref={loadMoreRef} className={styles.loadMore}>
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}
