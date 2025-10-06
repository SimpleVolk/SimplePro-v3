'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import styles from './PartnerForm.module.css';
import type { Partner, CreatePartnerDto, PartnerType, CommissionStructureType } from './types';

interface PartnerFormProps {
  partner?: Partner | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function PartnerForm({ partner, onClose, onSubmit }: PartnerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePartnerDto>({
    name: '',
    email: '',
    phone: '',
    company: '',
    type: 'individual',
    commissionStructure: {
      type: 'percentage',
      value: 10,
    },
    portalAccess: false,
    portalPassword: '',
    agreementUrl: '',
    serviceAreas: [],
    notes: '',
  });

  const [serviceAreaInput, setServiceAreaInput] = useState('');

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        company: partner.company,
        type: partner.type,
        commissionStructure: partner.commissionStructure,
        portalAccess: partner.portalAccess,
        agreementUrl: partner.agreementUrl,
        serviceAreas: partner.serviceAreas || [],
        notes: partner.notes,
      });
    }
  }, [partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const url = partner
        ? getApiUrl(`/partners/${partner.id}`)
        : getApiUrl('/partners');

      const method = partner ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save partner');
      }

      onSubmit();
    } catch (err) {
      console.error('Error saving partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to save partner');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreatePartnerDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCommissionTypeChange = (type: CommissionStructureType) => {
    setFormData(prev => ({
      ...prev,
      commissionStructure: {
        type,
        value: type === 'tiered' ? undefined : 10,
        tiers: type === 'tiered' ? [
          { minValue: 0, maxValue: 5000, rate: 5 },
          { minValue: 5000, maxValue: 10000, rate: 7 },
          { minValue: 10000, rate: 10 },
        ] : undefined,
      },
    }));
  };

  const addServiceArea = () => {
    if (serviceAreaInput.trim()) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...(prev.serviceAreas || []), serviceAreaInput.trim()],
      }));
      setServiceAreaInput('');
    }
  };

  const removeServiceArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: (prev.serviceAreas || []).filter((_, i) => i !== index),
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData(prev => ({ ...prev, portalPassword: password }));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{partner ? 'Edit Partner' : 'New Partner'}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email *</label>
                <input
                  type="email"
                  className={styles.input}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Phone *</label>
                <input
                  type="tel"
                  className={styles.input}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Company</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Partner Type *</label>
                <select
                  className={styles.select}
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as PartnerType)}
                  required
                >
                  <option value="individual">👤 Individual</option>
                  <option value="real_estate">🏢 Real Estate</option>
                  <option value="relocation">✈️ Relocation</option>
                  <option value="corporate">🏭 Corporate</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Commission Structure</h3>

            <div className={styles.commissionTypes}>
              <button
                type="button"
                className={`${styles.commissionTypeButton} ${formData.commissionStructure.type === 'percentage' ? styles.active : ''}`}
                onClick={() => handleCommissionTypeChange('percentage')}
              >
                💵 Percentage
              </button>
              <button
                type="button"
                className={`${styles.commissionTypeButton} ${formData.commissionStructure.type === 'flat_rate' ? styles.active : ''}`}
                onClick={() => handleCommissionTypeChange('flat_rate')}
              >
                💰 Flat Rate
              </button>
              <button
                type="button"
                className={`${styles.commissionTypeButton} ${formData.commissionStructure.type === 'tiered' ? styles.active : ''}`}
                onClick={() => handleCommissionTypeChange('tiered')}
              >
                📊 Tiered
              </button>
            </div>

            {formData.commissionStructure.type !== 'tiered' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {formData.commissionStructure.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                </label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.commissionStructure.value || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    commissionStructure: {
                      ...prev.commissionStructure,
                      value: parseFloat(e.target.value) || 0,
                    },
                  }))}
                  min="0"
                  step={formData.commissionStructure.type === 'percentage' ? '0.1' : '1'}
                />
              </div>
            )}

            {formData.commissionStructure.type === 'tiered' && (
              <div className={styles.tiersInfo}>
                <p className={styles.tiersText}>Tiered commission structure configured</p>
                <p className={styles.tiersSubtext}>Contact admin to modify tier settings</p>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Portal Access</h3>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.portalAccess}
                  onChange={(e) => handleInputChange('portalAccess', e.target.checked)}
                />
                <span>Enable partner portal access</span>
              </label>
            </div>

            {formData.portalAccess && !partner && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Portal Password</label>
                <div className={styles.passwordGroup}>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.portalPassword}
                    onChange={(e) => handleInputChange('portalPassword', e.target.value)}
                    placeholder="Enter password or generate"
                  />
                  <button
                    type="button"
                    className={styles.generateButton}
                    onClick={generatePassword}
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Additional Information</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Agreement URL</label>
              <input
                type="url"
                className={styles.input}
                value={formData.agreementUrl}
                onChange={(e) => handleInputChange('agreementUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Service Areas</label>
              <div className={styles.serviceAreaInput}>
                <input
                  type="text"
                  className={styles.input}
                  value={serviceAreaInput}
                  onChange={(e) => setServiceAreaInput(e.target.value)}
                  placeholder="Enter service area (e.g., Los Angeles, CA)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                />
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={addServiceArea}
                >
                  Add
                </button>
              </div>
              {formData.serviceAreas && formData.serviceAreas.length > 0 && (
                <div className={styles.serviceAreaTags}>
                  {formData.serviceAreas.map((area, index) => (
                    <span key={index} className={styles.tag}>
                      {area}
                      <button
                        type="button"
                        className={styles.removeTag}
                        onClick={() => removeServiceArea(index)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Notes</label>
              <textarea
                className={styles.textarea}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder="Additional notes about this partner..."
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : partner ? 'Update Partner' : 'Create Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
