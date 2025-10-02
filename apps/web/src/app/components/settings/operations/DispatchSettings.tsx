'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from '../company/CompanySettings.module.css';

interface DispatchSettings {
  autoDispatch: {
    enabled: boolean;
    criteriaWeight: {
      proximity: number;
      availability: number;
      performance: number;
      specialization: number;
    };
  };
  priorityRules: {
    highValueThreshold: number;
    rushJobMultiplier: number;
    corporateClientPriority: boolean;
  };
  conflictResolution: {
    allowDoubleBooking: boolean;
    autoReassignOnConflict: boolean;
    notifyDispatcherOnConflict: boolean;
  };
  calendarSettings: {
    defaultView: 'month' | 'week' | 'day';
    startDayOfWeek: 'sunday' | 'monday';
    showWeekends: boolean;
    colorCodeByStatus: boolean;
  };
  timezone: string;
}

export default function DispatchSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<DispatchSettings>({
    autoDispatch: {
      enabled: false,
      criteriaWeight: {
        proximity: 40,
        availability: 30,
        performance: 20,
        specialization: 10,
      },
    },
    priorityRules: {
      highValueThreshold: 5000,
      rushJobMultiplier: 1.5,
      corporateClientPriority: true,
    },
    conflictResolution: {
      allowDoubleBooking: false,
      autoReassignOnConflict: true,
      notifyDispatcherOnConflict: true,
    },
    calendarSettings: {
      defaultView: 'week',
      startDayOfWeek: 'monday',
      showWeekends: true,
      colorCodeByStatus: true,
    },
    timezone: 'America/Chicago',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/dispatch'), {
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
        throw new Error('Failed to fetch dispatch settings');
      }

      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (err) {
      console.error('Error fetching dispatch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate criteria weights sum to 100
    const totalWeight = Object.values(formData.autoDispatch.criteriaWeight).reduce((a, b) => a + b, 0);
    if (formData.autoDispatch.enabled && totalWeight !== 100) {
      setError('Auto-dispatch criteria weights must sum to 100%');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/dispatch'), {
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

      setSuccess('Dispatch settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving dispatch settings:', err);
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
        <h3>Dispatch Settings</h3>
        <p>Configure dispatch automation and calendar preferences</p>
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

      {loading ? (
        <div className={styles.loadingMessage}>Loading dispatch settings...</div>
      ) : (
        <form className={styles.formSection} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <h4>Auto-Dispatch Configuration</h4>
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.autoDispatch.enabled}
                onChange={(e) => updateFormData(['autoDispatch', 'enabled'], e.target.checked)}
              />
              Enable Auto-Dispatch
            </label>
          </div>

          {formData.autoDispatch.enabled && (
            <>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Configure how jobs are automatically assigned to crews. Weights must sum to 100%.
              </p>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="proximity">Proximity Weight (%)</label>
                  <input
                    id="proximity"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.autoDispatch.criteriaWeight.proximity}
                    onChange={(e) => updateFormData(['autoDispatch', 'criteriaWeight', 'proximity'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="availability">Availability Weight (%)</label>
                  <input
                    id="availability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.autoDispatch.criteriaWeight.availability}
                    onChange={(e) => updateFormData(['autoDispatch', 'criteriaWeight', 'availability'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="performance">Performance Weight (%)</label>
                  <input
                    id="performance"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.autoDispatch.criteriaWeight.performance}
                    onChange={(e) => updateFormData(['autoDispatch', 'criteriaWeight', 'performance'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="specialization">Specialization Weight (%)</label>
                  <input
                    id="specialization"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.autoDispatch.criteriaWeight.specialization}
                    onChange={(e) => updateFormData(['autoDispatch', 'criteriaWeight', 'specialization'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </div>

              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                Total: {Object.values(formData.autoDispatch.criteriaWeight).reduce((a, b) => a + b, 0)}%
                {Object.values(formData.autoDispatch.criteriaWeight).reduce((a, b) => a + b, 0) !== 100 && (
                  <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>⚠️ Must equal 100%</span>
                )}
              </p>
            </>
          )}

          <h4>Priority Rules</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="highValueThreshold">High-Value Threshold ($)</label>
              <input
                id="highValueThreshold"
                type="number"
                min="0"
                value={formData.priorityRules.highValueThreshold}
                onChange={(e) => updateFormData(['priorityRules', 'highValueThreshold'], parseFloat(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="rushJobMultiplier">Rush Job Priority Multiplier</label>
              <input
                id="rushJobMultiplier"
                type="number"
                step="0.1"
                min="1"
                value={formData.priorityRules.rushJobMultiplier}
                onChange={(e) => updateFormData(['priorityRules', 'rushJobMultiplier'], parseFloat(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.priorityRules.corporateClientPriority}
                  onChange={(e) => updateFormData(['priorityRules', 'corporateClientPriority'], e.target.checked)}
                />
                Prioritize Corporate Clients
              </label>
            </div>
          </div>

          <h4>Conflict Resolution</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.conflictResolution.allowDoubleBooking}
                  onChange={(e) => updateFormData(['conflictResolution', 'allowDoubleBooking'], e.target.checked)}
                />
                Allow Double Booking
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.conflictResolution.autoReassignOnConflict}
                  onChange={(e) => updateFormData(['conflictResolution', 'autoReassignOnConflict'], e.target.checked)}
                />
                Auto-Reassign on Conflict
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.conflictResolution.notifyDispatcherOnConflict}
                  onChange={(e) => updateFormData(['conflictResolution', 'notifyDispatcherOnConflict'], e.target.checked)}
                />
                Notify Dispatcher on Conflict
              </label>
            </div>
          </div>

          <h4>Calendar Preferences</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="defaultView">Default View</label>
              <select
                id="defaultView"
                value={formData.calendarSettings.defaultView}
                onChange={(e) => updateFormData(['calendarSettings', 'defaultView'], e.target.value)}
                className={styles.select}
              >
                <option value="month">Month</option>
                <option value="week">Week</option>
                <option value="day">Day</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="startDayOfWeek">Start Day of Week</label>
              <select
                id="startDayOfWeek"
                value={formData.calendarSettings.startDayOfWeek}
                onChange={(e) => updateFormData(['calendarSettings', 'startDayOfWeek'], e.target.value)}
                className={styles.select}
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="timezone">Timezone</label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => updateFormData(['timezone'], e.target.value)}
                className={styles.select}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.calendarSettings.showWeekends}
                  onChange={(e) => updateFormData(['calendarSettings', 'showWeekends'], e.target.checked)}
                />
                Show Weekends
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.calendarSettings.colorCodeByStatus}
                  onChange={(e) => updateFormData(['calendarSettings', 'colorCodeByStatus'], e.target.checked)}
                />
                Color Code by Status
              </label>
            </div>
          </div>

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
