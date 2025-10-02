'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from '../company/CompanySettings.module.css';

interface CommonEstimateSettings {
  estimateExpirationDays: number;
  requireDeposit: boolean;
  depositPercentage: number;
  defaultServiceType: 'local' | 'long_distance' | 'packing_only';
  defaultCrewSize: number;
  estimateNumberFormat: string;
  includeInsurance: boolean;
  defaultPaymentTerms: string;
  autoEmailEstimate: boolean;
  estimatePrefix: string;
}

export default function CommonSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CommonEstimateSettings>({
    estimateExpirationDays: 30,
    requireDeposit: true,
    depositPercentage: 20,
    defaultServiceType: 'local',
    defaultCrewSize: 3,
    estimateNumberFormat: 'EST-{YEAR}-{NUMBER}',
    includeInsurance: true,
    defaultPaymentTerms: 'Due on completion',
    autoEmailEstimate: true,
    estimatePrefix: 'EST',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/estimate-common'), {
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
        throw new Error('Failed to fetch estimate settings');
      }

      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (err) {
      console.error('Error fetching estimate settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (formData.estimateExpirationDays < 1 || formData.estimateExpirationDays > 365) {
      setError('Estimate expiration days must be between 1 and 365');
      setSaving(false);
      return;
    }

    if (formData.requireDeposit && (formData.depositPercentage < 0 || formData.depositPercentage > 100)) {
      setError('Deposit percentage must be between 0 and 100');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/estimate-common'), {
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

      setSuccess('Estimate settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving estimate settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (path: string[], value: any) => {
    setFormData(prev => {
      const updated = { ...prev };
      let current = updated as any;

      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className={styles.companySettings}>
      <div className={styles.header}>
        <h3>Common Estimate Settings</h3>
        <p>Configure default settings for all estimates</p>
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
        <div className={styles.loadingMessage}>Loading estimate settings...</div>
      ) : (
        <form className={styles.formSection} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <h4>Estimate Configuration</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="estimateExpirationDays">Estimate Expiration (days)</label>
              <input
                id="estimateExpirationDays"
                type="number"
                min="1"
                max="365"
                value={formData.estimateExpirationDays}
                onChange={(e) => updateFormData(['estimateExpirationDays'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="defaultServiceType">Default Service Type</label>
              <select
                id="defaultServiceType"
                value={formData.defaultServiceType}
                onChange={(e) => updateFormData(['defaultServiceType'], e.target.value)}
                className={styles.select}
              >
                <option value="local">Local Move</option>
                <option value="long_distance">Long Distance</option>
                <option value="packing_only">Packing Only</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="defaultCrewSize">Default Crew Size</label>
              <input
                id="defaultCrewSize"
                type="number"
                min="1"
                max="10"
                value={formData.defaultCrewSize}
                onChange={(e) => updateFormData(['defaultCrewSize'], parseInt(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="estimatePrefix">Estimate Number Prefix</label>
              <input
                id="estimatePrefix"
                type="text"
                value={formData.estimatePrefix}
                onChange={(e) => updateFormData(['estimatePrefix'], e.target.value)}
                className={styles.input}
                placeholder="EST"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="estimateNumberFormat">Estimate Number Format</label>
              <input
                id="estimateNumberFormat"
                type="text"
                value={formData.estimateNumberFormat}
                onChange={(e) => updateFormData(['estimateNumberFormat'], e.target.value)}
                className={styles.input}
                placeholder="EST-{YEAR}-{NUMBER}"
              />
              <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                Use {'{YEAR}'}, {'{MONTH}'}, {'{NUMBER}'} as placeholders
              </small>
            </div>
          </div>

          <h4>Payment Settings</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.requireDeposit}
                  onChange={(e) => updateFormData(['requireDeposit'], e.target.checked)}
                />
                Require Deposit
              </label>
            </div>

            {formData.requireDeposit && (
              <div className={styles.formGroup}>
                <label htmlFor="depositPercentage">Deposit Percentage (%)</label>
                <input
                  id="depositPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.depositPercentage}
                  onChange={(e) => updateFormData(['depositPercentage'], parseInt(e.target.value))}
                  className={styles.input}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="defaultPaymentTerms">Default Payment Terms</label>
              <select
                id="defaultPaymentTerms"
                value={formData.defaultPaymentTerms}
                onChange={(e) => updateFormData(['defaultPaymentTerms'], e.target.value)}
                className={styles.select}
              >
                <option value="Due on completion">Due on Completion</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="50% upfront, 50% on completion">50% Upfront, 50% on Completion</option>
              </select>
            </div>
          </div>

          <h4>Additional Options</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.includeInsurance}
                  onChange={(e) => updateFormData(['includeInsurance'], e.target.checked)}
                />
                Include Insurance in Estimate
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.autoEmailEstimate}
                  onChange={(e) => updateFormData(['autoEmailEstimate'], e.target.checked)}
                />
                Auto-Email Estimate to Customer
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
