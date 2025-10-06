'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from './PaymentGateway.module.css';

interface PaymentGatewaySettings {
  provider: 'stripe' | 'square' | 'authorize_net' | 'none';
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  testMode: boolean;
  transactionFeePercentage: number;
  transactionFeeFixed: number;
  supportedMethods: {
    creditCard: boolean;
    debitCard: boolean;
    ach: boolean;
    check: boolean;
    cash: boolean;
  };
  defaultPaymentTerms: string;
  requireDeposit: boolean;
  depositPercentage: number;
}

export default function PaymentGateway() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  const [formData, setFormData] = useState<PaymentGatewaySettings>({
    provider: 'stripe',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    testMode: true,
    transactionFeePercentage: 2.9,
    transactionFeeFixed: 0.3,
    supportedMethods: {
      creditCard: true,
      debitCard: true,
      ach: false,
      check: true,
      cash: true,
    },
    defaultPaymentTerms: 'Due on completion',
    requireDeposit: true,
    depositPercentage: 20,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('company/payment-gateway'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to fetch payment gateway settings');
      }

      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (err) {
      console.error('Error fetching payment gateway settings:', err);
      // Use default settings if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (formData.provider !== 'none' && !formData.apiKey) {
      setError('API Key is required when payment gateway is enabled');
      setSaving(false);
      return;
    }

    if (
      formData.requireDeposit &&
      (formData.depositPercentage < 0 || formData.depositPercentage > 100)
    ) {
      setError('Deposit percentage must be between 0 and 100');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('company/payment-gateway'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }

      setSuccess('Payment gateway settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving payment gateway settings:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update settings',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('company/payment-gateway/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: formData.provider,
          apiKey: formData.apiKey,
          testMode: formData.testMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      setSuccess('Payment gateway connection successful!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Connection test failed. Please check your credentials.');
    } finally {
      setTestingConnection(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const updateFormData = (path: string[], value: any) => {
    setFormData((prev) => {
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Payment Gateway Configuration</h2>
        <p>Configure payment processing for customer transactions</p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {success && (
        <div className={styles.successBanner}>
          {success}
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          Loading payment gateway settings...
        </div>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Provider Selection */}
          <div className={styles.section}>
            <h3>Payment Provider</h3>
            <div className={styles.formGroup}>
              <label htmlFor="provider">Select Payment Gateway</label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => updateFormData(['provider'], e.target.value)}
                className={styles.select}
              >
                <option value="none">No Payment Gateway</option>
                <option value="stripe">Stripe</option>
                <option value="square">Square</option>
                <option value="authorize_net">Authorize.net</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.testMode}
                  onChange={(e) =>
                    updateFormData(['testMode'], e.target.checked)
                  }
                />
                Test Mode (Use sandbox credentials)
              </label>
            </div>
          </div>

          {/* API Credentials */}
          {formData.provider !== 'none' && (
            <div className={styles.section}>
              <h3>API Credentials</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="apiKey">API Key / Publishable Key</label>
                  <input
                    id="apiKey"
                    type="text"
                    value={formData.apiKey}
                    onChange={(e) => updateFormData(['apiKey'], e.target.value)}
                    className={styles.input}
                    placeholder={`Enter ${formData.provider} API key`}
                  />
                  {formData.apiKey && (
                    <small className={styles.helpText}>
                      Masked: {maskApiKey(formData.apiKey)}
                    </small>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="apiSecret">API Secret / Secret Key</label>
                  <input
                    id="apiSecret"
                    type="password"
                    value={formData.apiSecret}
                    onChange={(e) =>
                      updateFormData(['apiSecret'], e.target.value)
                    }
                    className={styles.input}
                    placeholder="Enter API secret"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="webhookUrl">Webhook URL</label>
                  <input
                    id="webhookUrl"
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) =>
                      updateFormData(['webhookUrl'], e.target.value)
                    }
                    className={styles.input}
                    placeholder="https://your-domain.com/webhook"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !formData.apiKey}
                className={styles.testButton}
              >
                {testingConnection
                  ? 'Testing Connection...'
                  : 'Test Connection'}
              </button>
            </div>
          )}

          {/* Transaction Fees */}
          <div className={styles.section}>
            <h3>Transaction Fees</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="transactionFeePercentage">
                  Percentage Fee (%)
                </label>
                <input
                  id="transactionFeePercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.transactionFeePercentage}
                  onChange={(e) =>
                    updateFormData(
                      ['transactionFeePercentage'],
                      parseFloat(e.target.value),
                    )
                  }
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="transactionFeeFixed">Fixed Fee ($)</label>
                <input
                  id="transactionFeeFixed"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.transactionFeeFixed}
                  onChange={(e) =>
                    updateFormData(
                      ['transactionFeeFixed'],
                      parseFloat(e.target.value),
                    )
                  }
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Supported Payment Methods */}
          <div className={styles.section}>
            <h3>Supported Payment Methods</h3>
            <div className={styles.checkboxGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.supportedMethods.creditCard}
                  onChange={(e) =>
                    updateFormData(
                      ['supportedMethods', 'creditCard'],
                      e.target.checked,
                    )
                  }
                />
                Credit Card
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.supportedMethods.debitCard}
                  onChange={(e) =>
                    updateFormData(
                      ['supportedMethods', 'debitCard'],
                      e.target.checked,
                    )
                  }
                />
                Debit Card
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.supportedMethods.ach}
                  onChange={(e) =>
                    updateFormData(
                      ['supportedMethods', 'ach'],
                      e.target.checked,
                    )
                  }
                />
                ACH / Bank Transfer
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.supportedMethods.check}
                  onChange={(e) =>
                    updateFormData(
                      ['supportedMethods', 'check'],
                      e.target.checked,
                    )
                  }
                />
                Check
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.supportedMethods.cash}
                  onChange={(e) =>
                    updateFormData(
                      ['supportedMethods', 'cash'],
                      e.target.checked,
                    )
                  }
                />
                Cash
              </label>
            </div>
          </div>

          {/* Payment Terms */}
          <div className={styles.section}>
            <h3>Default Payment Terms</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="defaultPaymentTerms">Payment Terms</label>
                <select
                  id="defaultPaymentTerms"
                  value={formData.defaultPaymentTerms}
                  onChange={(e) =>
                    updateFormData(['defaultPaymentTerms'], e.target.value)
                  }
                  className={styles.select}
                >
                  <option value="Due on completion">Due on Completion</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="50% upfront, 50% on completion">
                    50% Upfront, 50% on Completion
                  </option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.requireDeposit}
                  onChange={(e) =>
                    updateFormData(['requireDeposit'], e.target.checked)
                  }
                />
                Require Deposit
              </label>
            </div>

            {formData.requireDeposit && (
              <div className={styles.formGroup}>
                <label htmlFor="depositPercentage">
                  Deposit Percentage (%)
                </label>
                <input
                  id="depositPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.depositPercentage}
                  onChange={(e) =>
                    updateFormData(
                      ['depositPercentage'],
                      parseInt(e.target.value),
                    )
                  }
                  className={styles.input}
                />
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
