'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import styles from './NotificationToast.module.css';

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
  actionUrl?: string;
  createdAt: string;
}

interface ToastNotification extends Notification {
  toastId: string;
  dismissed: boolean;
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

const AUTO_DISMISS_DELAY = 5000; // 5 seconds
const MAX_TOASTS = 3;

interface NotificationToastProps {
  onNavigate?: (path: string) => void;
}

export function NotificationToast({ onNavigate }: NotificationToastProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const { socket, isConnected } = useWebSocket();

  // Add new toast
  const addToast = useCallback((notification: Notification) => {
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastNotification = {
      ...notification,
      toastId,
      dismissed: false,
    };

    setToasts((prev) => {
      // Remove oldest toast if we have too many
      const newToasts = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
      return [...newToasts, toast];
    });

    // Auto-dismiss after delay (except urgent notifications)
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        dismissToast(toastId);
      }, AUTO_DISMISS_DELAY);
    }

    // Play sound for urgent notifications
    if (notification.priority === 'urgent') {
      playNotificationSound();
    }
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.toastId === toastId ? { ...toast, dismissed: true } : toast,
      ),
    );

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.toastId !== toastId));
    }, 300);
  }, []);

  // Handle toast click
  const handleToastClick = useCallback(
    (toast: ToastNotification) => {
      if (toast.actionUrl && onNavigate) {
        onNavigate(toast.actionUrl);
      }
      dismissToast(toast.toastId);
    },
    [onNavigate, dismissToast],
  );

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch((err) => console.error('Audio play error:', err));
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  // WebSocket listener for new notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotificationCreated = (notification: Notification) => {
      // Only show toasts for high priority or urgent notifications
      if (
        notification.priority === 'high' ||
        notification.priority === 'urgent'
      ) {
        addToast(notification);
      }
    };

    socket.on('notification.created', handleNotificationCreated);

    return () => {
      socket.off('notification.created', handleNotificationCreated);
    };
  }, [socket, isConnected, addToast]);

  // Get priority-based styles
  const getPriorityClass = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return styles.urgent;
      case 'high':
        return styles.high;
      case 'normal':
        return styles.normal;
      default:
        return styles.low;
    }
  };

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className={`${styles.toast} ${getPriorityClass(toast.priority)} ${toast.dismissed ? styles.dismissed : ''}`}
          onClick={() => handleToastClick(toast)}
          role="alert"
          aria-live={toast.priority === 'urgent' ? 'assertive' : 'polite'}
        >
          <div className={styles.toastIcon}>
            {NOTIFICATION_TYPE_ICONS[toast.type]}
          </div>
          <div className={styles.toastContent}>
            <div className={styles.toastTitle}>{toast.title}</div>
            <div className={styles.toastMessage}>{toast.message}</div>
          </div>
          <button
            className={styles.dismissButton}
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(toast.toastId);
            }}
            aria-label="Dismiss notification"
            type="button"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
