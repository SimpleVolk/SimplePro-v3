'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import styles from './UpcomingFollowUps.module.css';

interface UpcomingActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'quote_sent' | 'follow_up';
  opportunityId: string;
  customerId?: string;
  customerName?: string;
  subject: string;
  description?: string;
  scheduledDate?: string;
  dueDate?: string;
  assignedTo: string;
  assignedToName?: string;
  status: 'scheduled' | 'overdue';
  priority?: 'low' | 'medium' | 'high';
}

interface UpcomingFollowUpsProps {
  onActivityUpdate: () => void;
}

export function UpcomingFollowUps({
  onActivityUpdate,
}: UpcomingFollowUpsProps) {
  const [activities, setActivities] = useState<UpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchUpcomingActivities();
  }, []);

  const fetchUpcomingActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${getApiUrl()}/api/lead-activities/upcoming`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming activities');
      }

      const data = await response.json();
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${getApiUrl()}/api/lead-activities/${activityId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'completed',
            outcome: 'successful',
            completedDate: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to complete activity');
      }

      // Optimistic update
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      onActivityUpdate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete activity',
      );
      await fetchUpcomingActivities();
    }
  };

  const handleSnoozeActivity = async (activityId: string, hours: number) => {
    try {
      const newDueDate = new Date();
      newDueDate.setHours(newDueDate.getHours() + hours);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${getApiUrl()}/api/lead-activities/${activityId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dueDate: newDueDate.toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to snooze activity');
      }

      await fetchUpcomingActivities();
      onActivityUpdate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to snooze activity',
      );
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return '📞';
      case 'email':
        return '✉️';
      case 'meeting':
        return '🤝';
      case 'quote_sent':
        return '📋';
      case 'follow_up':
        return '🔔';
      default:
        return '📌';
    }
  };

  const getPriorityClass = (status: string) => {
    if (status === 'overdue') return styles.priorityHigh;
    return styles.priorityNormal;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 0) return 'Overdue';
    if (diffMins < 60) return `In ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24)
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const sortedActivities = [...activities].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.dueDate || a.scheduledDate || 0).getTime();
      const dateB = new Date(b.dueDate || b.scheduledDate || 0).getTime();
      return dateA - dateB;
    } else {
      // Priority sort (overdue first)
      const priorityOrder = { overdue: 0, scheduled: 1 };
      return priorityOrder[a.status] - priorityOrder[b.status];
    }
  });

  if (loading) {
    return (
      <div className={styles.upcomingFollowUps}>
        <div className={styles.widgetHeader}>
          <h3>Upcoming Follow-ups</h3>
        </div>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.upcomingFollowUps}>
      <div className={styles.widgetHeader}>
        <div className={styles.headerLeft}>
          <h3>Upcoming Follow-ups (Next 7 Days)</h3>
          <span className={styles.activityCount}>{activities.length}</span>
        </div>
        <div className={styles.headerRight}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'priority')}
            className={styles.sortSelect}
          >
            <option value="date">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
          </select>
          <button
            onClick={() => setExpanded(!expanded)}
            className={styles.toggleButton}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {expanded && (
        <div className={styles.widgetContent}>
          {sortedActivities.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No upcoming follow-ups scheduled</p>
            </div>
          ) : (
            <div className={styles.activityList}>
              {sortedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`${styles.activityItem} ${getPriorityClass(activity.status)}`}
                >
                  <div className={styles.activityIconWrapper}>
                    <span className={styles.activityIcon}>
                      {getActivityIcon(activity.type)}
                    </span>
                  </div>

                  <div className={styles.activityInfo}>
                    <div className={styles.activitySubject}>
                      {activity.subject}
                    </div>
                    {activity.customerName && (
                      <div className={styles.activityCustomer}>
                        {activity.customerName}
                      </div>
                    )}
                    <div className={styles.activityTime}>
                      {activity.dueDate
                        ? getRelativeTime(activity.dueDate)
                        : 'No due date'}
                      {' • '}
                      {activity.dueDate &&
                        new Date(activity.dueDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                    </div>
                  </div>

                  <div className={styles.activityActions}>
                    <button
                      onClick={() => handleCompleteActivity(activity.id)}
                      className={styles.completeButton}
                      title="Mark as complete"
                    >
                      ✓
                    </button>
                    <div className={styles.snoozeDropdown}>
                      <button className={styles.snoozeButton} title="Snooze">
                        ⏰
                      </button>
                      <div className={styles.snoozeMenu}>
                        <button
                          onClick={() => handleSnoozeActivity(activity.id, 1)}
                        >
                          1 hour
                        </button>
                        <button
                          onClick={() => handleSnoozeActivity(activity.id, 4)}
                        >
                          4 hours
                        </button>
                        <button
                          onClick={() => handleSnoozeActivity(activity.id, 24)}
                        >
                          1 day
                        </button>
                        <button
                          onClick={() => handleSnoozeActivity(activity.id, 72)}
                        >
                          3 days
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
