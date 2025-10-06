'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../../lib/config';
import { ActivityForm } from './ActivityForm';
import { UpcomingFollowUps } from './UpcomingFollowUps';
import styles from './LeadActivities.module.css';

export interface LeadActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'quote_sent' | 'follow_up';
  opportunityId: string;
  customerId?: string;
  customerName?: string;
  subject: string;
  description?: string;
  outcome?:
    | 'successful'
    | 'no_answer'
    | 'voicemail'
    | 'scheduled'
    | 'not_interested'
    | 'callback_requested';
  scheduledDate?: string;
  completedDate?: string;
  dueDate?: string;
  assignedTo: string;
  assignedToName?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;
  emailTemplate?: string;
  automationRuleId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ActivityStats {
  total: number;
  overdue: number;
  completedThisWeek: number;
  upcomingCount: number;
  byType: {
    call: number;
    email: number;
    meeting: number;
    quote_sent: number;
    follow_up: number;
  };
  byOutcome: {
    successful: number;
    no_answer: number;
    voicemail: number;
    scheduled: number;
    not_interested: number;
    callback_requested: number;
  };
}

export function LeadActivities() {
  const { user: _user } = useAuth();
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<LeadActivity | null>(
    null,
  );

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

  // Statistics
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    overdue: 0,
    completedThisWeek: 0,
    upcomingCount: 0,
    byType: { call: 0, email: 0, meeting: 0, quote_sent: 0, follow_up: 0 },
    byOutcome: {
      successful: 0,
      no_answer: 0,
      voicemail: 0,
      scheduled: 0,
      not_interested: 0,
      callback_requested: 0,
    },
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/api/lead-activities`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data);
      calculateStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (activities: LeadActivity[]) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newStats: ActivityStats = {
      total: activities.length,
      overdue: activities.filter((a) => a.status === 'overdue').length,
      completedThisWeek: activities.filter(
        (a) =>
          a.status === 'completed' &&
          a.completedDate &&
          new Date(a.completedDate) >= weekAgo,
      ).length,
      upcomingCount: activities.filter(
        (a) =>
          a.status === 'scheduled' &&
          a.scheduledDate &&
          new Date(a.scheduledDate) > now,
      ).length,
      byType: {
        call: activities.filter((a) => a.type === 'call').length,
        email: activities.filter((a) => a.type === 'email').length,
        meeting: activities.filter((a) => a.type === 'meeting').length,
        quote_sent: activities.filter((a) => a.type === 'quote_sent').length,
        follow_up: activities.filter((a) => a.type === 'follow_up').length,
      },
      byOutcome: {
        successful: activities.filter((a) => a.outcome === 'successful').length,
        no_answer: activities.filter((a) => a.outcome === 'no_answer').length,
        voicemail: activities.filter((a) => a.outcome === 'voicemail').length,
        scheduled: activities.filter((a) => a.outcome === 'scheduled').length,
        not_interested: activities.filter((a) => a.outcome === 'not_interested')
          .length,
        callback_requested: activities.filter(
          (a) => a.outcome === 'callback_requested',
        ).length,
      },
    };

    setStats(newStats);
  };

  const handleCreateActivity = () => {
    setEditingActivity(null);
    setShowCreateForm(true);
  };

  const handleEditActivity = (activity: LeadActivity) => {
    setEditingActivity(activity);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingActivity(null);
  };

  const handleSaveActivity = async () => {
    await fetchActivities();
    handleCloseForm();
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${getApiUrl()}/api/lead-activities/${activityId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      await fetchActivities();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete activity',
      );
    }
  };

  const handleCompleteActivity = async (
    activityId: string,
    outcome: string,
  ) => {
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
            outcome,
            completedDate: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to complete activity');
      }

      await fetchActivities();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete activity',
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'overdue':
        return styles.statusOverdue;
      case 'scheduled':
        return styles.statusScheduled;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const getOutcomeBadgeClass = (outcome: string | undefined) => {
    if (!outcome) return '';
    switch (outcome) {
      case 'successful':
        return styles.outcomeSuccess;
      case 'not_interested':
        return styles.outcomeFailure;
      case 'callback_requested':
        return styles.outcomeWarning;
      default:
        return styles.outcomeNeutral;
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
    if (outcomeFilter !== 'all' && activity.outcome !== outcomeFilter)
      return false;
    if (statusFilter !== 'all' && activity.status !== statusFilter)
      return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        activity.subject.toLowerCase().includes(term) ||
        activity.customerName?.toLowerCase().includes(term) ||
        activity.description?.toLowerCase().includes(term)
      );
    }

    if (dateRangeFilter !== 'all') {
      const activityDate = new Date(
        activity.scheduledDate || activity.createdAt,
      );
      const now = new Date();

      switch (dateRangeFilter) {
        case 'today':
          return activityDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return activityDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return activityDate >= monthAgo;
        }
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className={styles.leadActivities}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.leadActivities}>
      <div className={styles.header}>
        <h2>Lead Activities</h2>
        <div className={styles.headerActions}>
          <button
            onClick={handleCreateActivity}
            className={styles.primaryButton}
          >
            + New Activity
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Statistics Dashboard */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Activities</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statIcon}>⚠️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.overdue}</div>
            <div className={styles.statLabel}>Overdue</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completedThisWeek}</div>
            <div className={styles.statLabel}>Completed This Week</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardInfo}`}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.upcomingCount}</div>
            <div className={styles.statLabel}>Upcoming</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          onClick={() => {
            setTypeFilter('call');
            handleCreateActivity();
          }}
          className={styles.quickActionButton}
        >
          📞 Log Call
        </button>
        <button
          onClick={() => {
            setTypeFilter('email');
            handleCreateActivity();
          }}
          className={styles.quickActionButton}
        >
          ✉️ Send Email
        </button>
        <button
          onClick={() => {
            setTypeFilter('follow_up');
            handleCreateActivity();
          }}
          className={styles.quickActionButton}
        >
          🔔 Schedule Follow-up
        </button>
      </div>

      {/* Upcoming Follow-ups Widget */}
      <UpcomingFollowUps onActivityUpdate={fetchActivities} />

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="call">Calls</option>
          <option value="email">Emails</option>
          <option value="meeting">Meetings</option>
          <option value="quote_sent">Quotes Sent</option>
          <option value="follow_up">Follow-ups</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Outcomes</option>
          <option value="successful">Successful</option>
          <option value="no_answer">No Answer</option>
          <option value="voicemail">Voicemail</option>
          <option value="scheduled">Scheduled</option>
          <option value="not_interested">Not Interested</option>
          <option value="callback_requested">Callback Requested</option>
        </select>
        <select
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Activity Timeline */}
      <div className={styles.activityTimeline}>
        {filteredActivities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No activities found</p>
            <button
              onClick={handleCreateActivity}
              className={styles.primaryButton}
            >
              Create Your First Activity
            </button>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className={styles.activityCard}>
              <div className={styles.activityHeader}>
                <div className={styles.activityType}>
                  <span className={styles.activityIcon}>
                    {getActivityIcon(activity.type)}
                  </span>
                  <span className={styles.activityTypeLabel}>
                    {activity.type.replace('_', ' ')}
                  </span>
                </div>
                <div className={styles.activityBadges}>
                  <span
                    className={`${styles.statusBadge} ${getStatusBadgeClass(activity.status)}`}
                  >
                    {activity.status}
                  </span>
                  {activity.outcome && (
                    <span
                      className={`${styles.outcomeBadge} ${getOutcomeBadgeClass(activity.outcome)}`}
                    >
                      {activity.outcome.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.activityContent}>
                <h3 className={styles.activitySubject}>{activity.subject}</h3>
                {activity.customerName && (
                  <p className={styles.activityCustomer}>
                    Customer: {activity.customerName}
                  </p>
                )}
                {activity.description && (
                  <p className={styles.activityDescription}>
                    {activity.description}
                  </p>
                )}
                {activity.notes && (
                  <div className={styles.activityNotes}>
                    <strong>Notes:</strong> {activity.notes}
                  </div>
                )}
              </div>

              <div className={styles.activityMeta}>
                <div className={styles.activityDates}>
                  {activity.scheduledDate && (
                    <span>
                      Scheduled:{' '}
                      {new Date(activity.scheduledDate).toLocaleString()}
                    </span>
                  )}
                  {activity.completedDate && (
                    <span>
                      Completed:{' '}
                      {new Date(activity.completedDate).toLocaleString()}
                    </span>
                  )}
                  {activity.dueDate && !activity.completedDate && (
                    <span
                      className={
                        activity.status === 'overdue'
                          ? styles.dueDateOverdue
                          : ''
                      }
                    >
                      Due: {new Date(activity.dueDate).toLocaleString()}
                    </span>
                  )}
                </div>
                {activity.assignedToName && (
                  <span className={styles.activityAssignee}>
                    Assigned to: {activity.assignedToName}
                  </span>
                )}
              </div>

              <div className={styles.activityActions}>
                {activity.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() =>
                        handleCompleteActivity(activity.id, 'successful')
                      }
                      className={styles.completeButton}
                    >
                      ✓ Complete
                    </button>
                    <button
                      onClick={() => handleEditActivity(activity)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                  </>
                )}
                {activity.status === 'completed' && (
                  <button
                    onClick={() => handleEditActivity(activity)}
                    className={styles.viewButton}
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => handleDeleteActivity(activity.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Activity Form Modal */}
      {showCreateForm && (
        <ActivityForm
          activity={editingActivity}
          onClose={handleCloseForm}
          onSave={handleSaveActivity}
        />
      )}
    </div>
  );
}
