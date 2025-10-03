'use client';

import { useEffect, useState } from 'react';
import styles from './RateLimitNotification.module.css';

interface RateLimitNotificationProps {
  retryAfter: string | null;
  onDismiss?: () => void;
}

export function RateLimitNotification({
  retryAfter,
  onDismiss,
}: RateLimitNotificationProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    // Parse retry-after header (can be seconds or HTTP date)
    let retrySeconds = 60; // Default to 60 seconds

    if (retryAfter) {
      // Try parsing as number (seconds)
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed)) {
        retrySeconds = parsed;
      } else {
        // Try parsing as HTTP date
        const retryDate = new Date(retryAfter);
        const now = new Date();
        if (!isNaN(retryDate.getTime())) {
          retrySeconds = Math.max(
            0,
            Math.ceil((retryDate.getTime() - now.getTime()) / 1000)
          );
        }
      }
    }

    setRemainingSeconds(retrySeconds);

    // Countdown timer
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-dismiss when time is up
          if (onDismiss) {
            setTimeout(onDismiss, 500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter, onDismiss]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (remainingSecs === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes}:${remainingSecs.toString().padStart(2, '0')} minutes`;
  };

  return (
    <div className={styles.notification} role="alert" aria-live="assertive">
      <div className={styles.iconWrapper}>
        <span className={styles.icon} aria-hidden="true">⏱️</span>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>Too Many Attempts</h3>
        <p className={styles.message}>
          You have made too many password attempts. For security reasons, please
          wait before trying again.
        </p>
        {remainingSeconds > 0 && (
          <div className={styles.countdown}>
            <div className={styles.progressBar}>
              <div
                className={styles.progress}
                style={{
                  width: `${100 - (remainingSeconds / (parseInt(retryAfter || '60', 10) || 60)) * 100}%`,
                }}
              />
            </div>
            <p className={styles.timeRemaining}>
              Please try again in <strong>{formatTime(remainingSeconds)}</strong>
            </p>
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={styles.closeButton}
          aria-label="Close notification"
        >
          ✕
        </button>
      )}
    </div>
  );
}
