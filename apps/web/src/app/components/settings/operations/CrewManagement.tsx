'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from '../company/CompanySettings.module.css';

interface CrewSettings {
  roles: {
    id: string;
    name: string;
    hourlyRate: number;
    requiresCertification: boolean;
  }[];
  defaultCrewSizeByJobType: {
    local: number;
    longDistance: number;
    packingOnly: number;
  };
  schedulingRules: {
    minHoursBetweenJobs: number;
    maxHoursPerDay: number;
    requireRestDays: boolean;
    restDaysPerWeek: number;
  };
  breakRequirements: {
    enabled: boolean;
    breakAfterHours: number;
    breakDurationMinutes: number;
  };
  overtime: {
    enabled: boolean;
    thresholdHours: number;
    multiplier: number;
  };
  performanceTracking: {
    trackJobCompletionTime: boolean;
    trackCustomerRatings: boolean;
    trackDamageReports: boolean;
  };
}

export default function CrewManagement() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CrewSettings>({
    roles: [
      { id: '1', name: 'Lead Mover', hourlyRate: 25, requiresCertification: true },
      { id: '2', name: 'Mover', hourlyRate: 18, requiresCertification: false },
      { id: '3', name: 'Driver', hourlyRate: 22, requiresCertification: true },
      { id: '4', name: 'Specialist', hourlyRate: 30, requiresCertification: true },
    ],
    defaultCrewSizeByJobType: {
      local: 3,
      longDistance: 4,
      packingOnly: 2,
    },
    schedulingRules: {
      minHoursBetweenJobs: 2,
      maxHoursPerDay: 10,
      requireRestDays: true,
      restDaysPerWeek: 1,
    },
    breakRequirements: {
      enabled: true,
      breakAfterHours: 4,
      breakDurationMinutes: 30,
    },
    overtime: {
      enabled: true,
      thresholdHours: 8,
      multiplier: 1.5,
    },
    performanceTracking: {
      trackJobCompletionTime: true,
      trackCustomerRatings: true,
      trackDamageReports: true,
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
      const response = await fetch(getApiUrl('settings/crew-management'), {
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
        throw new Error('Failed to fetch crew settings');
      }

      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (err) {
      console.error('Error fetching crew settings:', err);
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
      const response = await fetch(getApiUrl('settings/crew-management'), {
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

      setSuccess('Crew management settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving crew settings:', err);
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
        <h3>Crew Management Settings</h3>
        <p>Configure crew roles, scheduling, and performance tracking</p>
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
        <div className={styles.loadingMessage}>Loading crew settings...</div>
      ) : (
        <form className={styles.formSection} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <h4>Default Crew Sizes</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="local">Local Move</label>
              <input
                id="local"
                type="number"
                min="1"
                max="10"
                value={formData.defaultCrewSizeByJobType.local}
                onChange={(e) => updateFormData(['defaultCrewSizeByJobType', 'local'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="longDistance">Long Distance</label>
              <input
                id="longDistance"
                type="number"
                min="1"
                max="10"
                value={formData.defaultCrewSizeByJobType.longDistance}
                onChange={(e) => updateFormData(['defaultCrewSizeByJobType', 'longDistance'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="packingOnly">Packing Only</label>
              <input
                id="packingOnly"
                type="number"
                min="1"
                max="10"
                value={formData.defaultCrewSizeByJobType.packingOnly}
                onChange={(e) => updateFormData(['defaultCrewSizeByJobType', 'packingOnly'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>
          </div>

          <h4>Scheduling Rules</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="minHoursBetweenJobs">Min Hours Between Jobs</label>
              <input
                id="minHoursBetweenJobs"
                type="number"
                min="0"
                value={formData.schedulingRules.minHoursBetweenJobs}
                onChange={(e) => updateFormData(['schedulingRules', 'minHoursBetweenJobs'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maxHoursPerDay">Max Hours Per Day</label>
              <input
                id="maxHoursPerDay"
                type="number"
                min="1"
                max="24"
                value={formData.schedulingRules.maxHoursPerDay}
                onChange={(e) => updateFormData(['schedulingRules', 'maxHoursPerDay'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.schedulingRules.requireRestDays}
                  onChange={(e) => updateFormData(['schedulingRules', 'requireRestDays'], e.target.checked)}
                />
                Require Rest Days
              </label>
            </div>

            {formData.schedulingRules.requireRestDays && (
              <div className={styles.formGroup}>
                <label htmlFor="restDaysPerWeek">Rest Days Per Week</label>
                <input
                  id="restDaysPerWeek"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.schedulingRules.restDaysPerWeek}
                  onChange={(e) => updateFormData(['schedulingRules', 'restDaysPerWeek'], parseInt(e.target.value))}
                  className={styles.input}
                />
              </div>
            )}
          </div>

          <h4>Break Requirements</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.breakRequirements.enabled}
                  onChange={(e) => updateFormData(['breakRequirements', 'enabled'], e.target.checked)}
                />
                Enable Break Requirements
              </label>
            </div>

            {formData.breakRequirements.enabled && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="breakAfterHours">Break After (hours)</label>
                  <input
                    id="breakAfterHours"
                    type="number"
                    min="1"
                    value={formData.breakRequirements.breakAfterHours}
                    onChange={(e) => updateFormData(['breakRequirements', 'breakAfterHours'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="breakDurationMinutes">Break Duration (minutes)</label>
                  <input
                    id="breakDurationMinutes"
                    type="number"
                    min="15"
                    value={formData.breakRequirements.breakDurationMinutes}
                    onChange={(e) => updateFormData(['breakRequirements', 'breakDurationMinutes'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </>
            )}
          </div>

          <h4>Overtime Settings</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.overtime.enabled}
                  onChange={(e) => updateFormData(['overtime', 'enabled'], e.target.checked)}
                />
                Enable Overtime Calculation
              </label>
            </div>

            {formData.overtime.enabled && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="thresholdHours">Overtime Threshold (hours)</label>
                  <input
                    id="thresholdHours"
                    type="number"
                    min="1"
                    value={formData.overtime.thresholdHours}
                    onChange={(e) => updateFormData(['overtime', 'thresholdHours'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="multiplier">Overtime Multiplier</label>
                  <input
                    id="multiplier"
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.overtime.multiplier}
                    onChange={(e) => updateFormData(['overtime', 'multiplier'], parseFloat(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </>
            )}
          </div>

          <h4>Performance Tracking</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.performanceTracking.trackJobCompletionTime}
                  onChange={(e) => updateFormData(['performanceTracking', 'trackJobCompletionTime'], e.target.checked)}
                />
                Track Job Completion Time
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.performanceTracking.trackCustomerRatings}
                  onChange={(e) => updateFormData(['performanceTracking', 'trackCustomerRatings'], e.target.checked)}
                />
                Track Customer Ratings
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.performanceTracking.trackDamageReports}
                  onChange={(e) => updateFormData(['performanceTracking', 'trackDamageReports'], e.target.checked)}
                />
                Track Damage Reports
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
