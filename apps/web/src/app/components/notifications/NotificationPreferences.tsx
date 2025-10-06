'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import styles from './NotificationPreferences.module.css';

type NotificationType =
  | 'job_assigned'
  | 'shift_reminder'
  | 'customer_inquiry'
  | 'quote_request'
  | 'job_completed'
  | 'payment_received'
  | 'system_alert';
type ChannelType = 'inApp' | 'email' | 'sms' | 'push';

interface NotificationPreferences {
  id?: string;
  userId?: string;
  channels: {
    [key in NotificationType]: {
      [channel in ChannelType]: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  digestSettings: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
    time?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const NOTIFICATION_TYPES: {
  type: NotificationType;
  label: string;
  description: string;
}[] = [
  {
    type: 'job_assigned',
    label: 'Job Assigned',
    description: 'When a new job is assigned to you',
  },
  {
    type: 'shift_reminder',
    label: 'Shift Reminder',
    description: 'Reminders about upcoming shifts',
  },
  {
    type: 'customer_inquiry',
    label: 'Customer Inquiry',
    description: 'New customer messages or inquiries',
  },
  {
    type: 'quote_request',
    label: 'Quote Request',
    description: 'New quote requests from customers',
  },
  {
    type: 'job_completed',
    label: 'Job Completed',
    description: 'When a job is marked as completed',
  },
  {
    type: 'payment_received',
    label: 'Payment Received',
    description: 'Payment confirmation notifications',
  },
  {
    type: 'system_alert',
    label: 'System Alert',
    description: 'Important system notifications and alerts',
  },
];

const CHANNELS: { channel: ChannelType; label: string; icon: string }[] = [
  { channel: 'inApp', label: 'In-App', icon: '🔔' },
  { channel: 'email', label: 'Email', icon: '📧' },
  { channel: 'sms', label: 'SMS', icon: '📱' },
  { channel: 'push', label: 'Push', icon: '📲' },
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: {
    job_assigned: { inApp: true, email: true, sms: false, push: true },
    shift_reminder: { inApp: true, email: true, sms: true, push: true },
    customer_inquiry: { inApp: true, email: true, sms: false, push: true },
    quote_request: { inApp: true, email: true, sms: false, push: true },
    job_completed: { inApp: true, email: false, sms: false, push: true },
    payment_received: { inApp: true, email: true, sms: false, push: true },
    system_alert: { inApp: true, email: true, sms: true, push: true },
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
  },
  digestSettings: {
    enabled: false,
    frequency: 'immediate',
    time: '09:00',
  },
};

export function NotificationPreferences() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(getApiUrl('notifications/preferences'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setPreferences(result.data);
          }
        } else if (response.status === 404) {
          // No preferences yet, use defaults
          setPreferences(DEFAULT_PREFERENCES);
        } else {
          throw new Error('Failed to fetch preferences');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load preferences',
        );
        console.error('Error fetching preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(getApiUrl('notifications/preferences'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const result = await response.json();
      setPreferences(result.data);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preferences',
      );
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle channel for notification type
  const toggleChannel = (
    notificationType: NotificationType,
    channel: ChannelType,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [notificationType]: {
          ...prev.channels[notificationType],
          [channel]: !prev.channels[notificationType][channel],
        },
      },
    }));
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      await fetch(getApiUrl('notifications/test'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert('Test notification sent! Check your notification center.');
    } catch (err) {
      console.error('Error sending test notification:', err);
      alert('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notification Preferences</h1>
        <p className={styles.subtitle}>Manage how you receive notifications</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {success && (
        <div className={styles.success}>Preferences saved successfully!</div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notification Channels</h2>
        <p className={styles.sectionDescription}>
          Choose how you want to be notified for each type of event
        </p>

        <div className={styles.channelTable}>
          <div className={styles.tableHeader}>
            <div className={styles.tableHeaderCell}>Notification Type</div>
            {CHANNELS.map(({ channel, label, icon }) => (
              <div key={channel} className={styles.tableHeaderCell}>
                <span className={styles.channelIcon}>{icon}</span>
                <span className={styles.channelLabel}>{label}</span>
              </div>
            ))}
          </div>

          {NOTIFICATION_TYPES.map(({ type, label, description }) => (
            <div key={type} className={styles.tableRow}>
              <div className={styles.notificationTypeCell}>
                <div className={styles.notificationTypeLabel}>{label}</div>
                <div className={styles.notificationTypeDescription}>
                  {description}
                </div>
              </div>
              {CHANNELS.map(({ channel }) => (
                <div key={channel} className={styles.tableCell}>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={preferences.channels[type][channel]}
                      onChange={() => toggleChannel(type, channel)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quiet Hours</h2>
        <p className={styles.sectionDescription}>
          Disable notifications during specific hours
        </p>

        <div className={styles.settingGroup}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={preferences.quietHours.enabled}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  quietHours: { ...prev.quietHours, enabled: e.target.checked },
                }))
              }
              className={styles.checkbox}
            />
            <span>Enable Quiet Hours</span>
          </label>

          {preferences.quietHours.enabled && (
            <div className={styles.timeRange}>
              <div className={styles.timeInput}>
                <label>Start Time</label>
                <input
                  type="time"
                  value={preferences.quietHours.startTime}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quietHours: {
                        ...prev.quietHours,
                        startTime: e.target.value,
                      },
                    }))
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.timeInput}>
                <label>End Time</label>
                <input
                  type="time"
                  value={preferences.quietHours.endTime}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quietHours: {
                        ...prev.quietHours,
                        endTime: e.target.value,
                      },
                    }))
                  }
                  className={styles.input}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Digest Settings</h2>
        <p className={styles.sectionDescription}>
          Group notifications into a digest
        </p>

        <div className={styles.settingGroup}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={preferences.digestSettings.enabled}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  digestSettings: {
                    ...prev.digestSettings,
                    enabled: e.target.checked,
                  },
                }))
              }
              className={styles.checkbox}
            />
            <span>Enable Digest Mode</span>
          </label>

          {preferences.digestSettings.enabled && (
            <div className={styles.digestOptions}>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="immediate"
                    checked={
                      preferences.digestSettings.frequency === 'immediate'
                    }
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        digestSettings: {
                          ...prev.digestSettings,
                          frequency: e.target.value as 'immediate',
                        },
                      }))
                    }
                    className={styles.radio}
                  />
                  <span>Immediate (No digest)</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="hourly"
                    checked={preferences.digestSettings.frequency === 'hourly'}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        digestSettings: {
                          ...prev.digestSettings,
                          frequency: e.target.value as 'hourly',
                        },
                      }))
                    }
                    className={styles.radio}
                  />
                  <span>Hourly</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={preferences.digestSettings.frequency === 'daily'}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        digestSettings: {
                          ...prev.digestSettings,
                          frequency: e.target.value as 'daily',
                        },
                      }))
                    }
                    className={styles.radio}
                  />
                  <span>Daily</span>
                </label>
              </div>

              {preferences.digestSettings.frequency === 'daily' && (
                <div className={styles.timeInput}>
                  <label>Delivery Time</label>
                  <input
                    type="time"
                    value={preferences.digestSettings.time || '09:00'}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        digestSettings: {
                          ...prev.digestSettings,
                          time: e.target.value,
                        },
                      }))
                    }
                    className={styles.input}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.testButton}
          onClick={sendTestNotification}
          type="button"
        >
          Send Test Notification
        </button>
        <button
          className={styles.saveButton}
          onClick={savePreferences}
          disabled={saving}
          type="button"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
