'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from '../company/CompanySettings.module.css';

interface NotificationSettings {
  defaultTemplates: {
    jobAssigned: {
      enabled: boolean;
      subject: string;
      message: string;
    };
    jobStarted: {
      enabled: boolean;
      subject: string;
      message: string;
    };
    jobCompleted: {
      enabled: boolean;
      subject: string;
      message: string;
    };
    estimateReady: {
      enabled: boolean;
      subject: string;
      message: string;
    };
    paymentReceived: {
      enabled: boolean;
      subject: string;
      message: string;
    };
  };
  deliverySettings: {
    email: {
      enabled: boolean;
      fromName: string;
      fromEmail: string;
    };
    sms: {
      enabled: boolean;
      fromNumber: string;
    };
    push: {
      enabled: boolean;
    };
  };
  slaSettings: {
    highPriority: number;
    normal: number;
    low: number;
  };
  retrySettings: {
    maxRetries: number;
    retryDelayMinutes: number;
    exponentialBackoff: boolean;
  };
  logging: {
    logAllNotifications: boolean;
    logFailuresOnly: boolean;
    retentionDays: number;
  };
}

export default function Notifications() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'delivery' | 'advanced'>('templates');

  const [formData, setFormData] = useState<NotificationSettings>({
    defaultTemplates: {
      jobAssigned: {
        enabled: true,
        subject: 'New Job Assignment',
        message: 'You have been assigned to job #{job_id} scheduled for {job_date}.',
      },
      jobStarted: {
        enabled: true,
        subject: 'Job Started',
        message: 'Your move is now in progress. Crew lead: {crew_lead}.',
      },
      jobCompleted: {
        enabled: true,
        subject: 'Job Completed',
        message: 'Your move has been completed. Thank you for choosing our services!',
      },
      estimateReady: {
        enabled: true,
        subject: 'Your Moving Estimate is Ready',
        message: 'Your estimate is ready for review. Total: ${total_cost}.',
      },
      paymentReceived: {
        enabled: true,
        subject: 'Payment Confirmation',
        message: 'We have received your payment of ${payment_amount}. Thank you!',
      },
    },
    deliverySettings: {
      email: {
        enabled: true,
        fromName: 'MoveCorp Notifications',
        fromEmail: 'noreply@movecorp.com',
      },
      sms: {
        enabled: true,
        fromNumber: '+15551234567',
      },
      push: {
        enabled: true,
      },
    },
    slaSettings: {
      highPriority: 5,
      normal: 30,
      low: 120,
    },
    retrySettings: {
      maxRetries: 3,
      retryDelayMinutes: 5,
      exponentialBackoff: true,
    },
    logging: {
      logAllNotifications: true,
      logFailuresOnly: false,
      retentionDays: 90,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/notifications'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to fetch notification settings');
      }

      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/notifications'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update settings');
      }

      setSuccess('Notification settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (path: string[], value: any) => {
    setFormData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className={styles.companySettings}>
      <div className={styles.header}>
        <h3>Notification Settings</h3>
        <p>Configure system notifications and delivery preferences</p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className={styles.closeSuccess}>×</button>
        </div>
      )}

      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'delivery' ? styles.active : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          Delivery
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'advanced' ? styles.active : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingMessage}>Loading notification settings...</div>
      ) : (
        <form className={styles.formSection} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {activeTab === 'templates' && (
            <>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Configure default notification templates. Use variables like {'{job_id}'}, {'{customer_name}'}, {'{total_cost}'}.
              </p>

              {Object.entries(formData.defaultTemplates).map(([key, template]) => (
                <div key={key} style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
                  <h4 style={{ textTransform: 'capitalize', marginBottom: '1rem' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>

                  <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={template.enabled}
                        onChange={(e) => updateFormData(['defaultTemplates', key, 'enabled'], e.target.checked)}
                      />
                      Enable this notification
                    </label>
                  </div>

                  {template.enabled && (
                    <>
                      <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                        <label>Subject</label>
                        <input
                          type="text"
                          value={template.subject}
                          onChange={(e) => updateFormData(['defaultTemplates', key, 'subject'], e.target.value)}
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Message</label>
                        <textarea
                          value={template.message}
                          onChange={(e) => updateFormData(['defaultTemplates', key, 'message'], e.target.value)}
                          className={styles.input}
                          rows={3}
                          style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          {activeTab === 'delivery' && (
            <>
              <h4>Email Delivery</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.deliverySettings.email.enabled}
                      onChange={(e) => updateFormData(['deliverySettings', 'email', 'enabled'], e.target.checked)}
                    />
                    Enable Email Notifications
                  </label>
                </div>

                {formData.deliverySettings.email.enabled && (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="fromName">From Name</label>
                      <input
                        id="fromName"
                        type="text"
                        value={formData.deliverySettings.email.fromName}
                        onChange={(e) => updateFormData(['deliverySettings', 'email', 'fromName'], e.target.value)}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="fromEmail">From Email</label>
                      <input
                        id="fromEmail"
                        type="email"
                        value={formData.deliverySettings.email.fromEmail}
                        onChange={(e) => updateFormData(['deliverySettings', 'email', 'fromEmail'], e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  </>
                )}
              </div>

              <h4>SMS Delivery</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.deliverySettings.sms.enabled}
                      onChange={(e) => updateFormData(['deliverySettings', 'sms', 'enabled'], e.target.checked)}
                    />
                    Enable SMS Notifications
                  </label>
                </div>

                {formData.deliverySettings.sms.enabled && (
                  <div className={styles.formGroup}>
                    <label htmlFor="fromNumber">From Number</label>
                    <input
                      id="fromNumber"
                      type="tel"
                      value={formData.deliverySettings.sms.fromNumber}
                      onChange={(e) => updateFormData(['deliverySettings', 'sms', 'fromNumber'], e.target.value)}
                      className={styles.input}
                      placeholder="+15551234567"
                    />
                  </div>
                )}
              </div>

              <h4>Push Notifications</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.deliverySettings.push.enabled}
                      onChange={(e) => updateFormData(['deliverySettings', 'push', 'enabled'], e.target.checked)}
                    />
                    Enable Push Notifications (Mobile App)
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              <h4>Delivery SLA (minutes)</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="highPriority">High Priority</label>
                  <input
                    id="highPriority"
                    type="number"
                    min="1"
                    value={formData.slaSettings.highPriority}
                    onChange={(e) => updateFormData(['slaSettings', 'highPriority'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="normal">Normal Priority</label>
                  <input
                    id="normal"
                    type="number"
                    min="1"
                    value={formData.slaSettings.normal}
                    onChange={(e) => updateFormData(['slaSettings', 'normal'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="low">Low Priority</label>
                  <input
                    id="low"
                    type="number"
                    min="1"
                    value={formData.slaSettings.low}
                    onChange={(e) => updateFormData(['slaSettings', 'low'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </div>

              <h4>Retry Settings</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="maxRetries">Max Retries</label>
                  <input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.retrySettings.maxRetries}
                    onChange={(e) => updateFormData(['retrySettings', 'maxRetries'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="retryDelayMinutes">Retry Delay (minutes)</label>
                  <input
                    id="retryDelayMinutes"
                    type="number"
                    min="1"
                    value={formData.retrySettings.retryDelayMinutes}
                    onChange={(e) => updateFormData(['retrySettings', 'retryDelayMinutes'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.retrySettings.exponentialBackoff}
                      onChange={(e) => updateFormData(['retrySettings', 'exponentialBackoff'], e.target.checked)}
                    />
                    Exponential Backoff
                  </label>
                </div>
              </div>

              <h4>Logging Settings</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.logging.logAllNotifications}
                      onChange={(e) => updateFormData(['logging', 'logAllNotifications'], e.target.checked)}
                    />
                    Log All Notifications
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.logging.logFailuresOnly}
                      onChange={(e) => updateFormData(['logging', 'logFailuresOnly'], e.target.checked)}
                      disabled={formData.logging.logAllNotifications}
                    />
                    Log Failures Only
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="retentionDays">Log Retention (days)</label>
                  <input
                    id="retentionDays"
                    type="number"
                    min="1"
                    value={formData.logging.retentionDays}
                    onChange={(e) => updateFormData(['logging', 'retentionDays'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </div>
            </>
          )}

          <div className={styles.footer}>
            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
