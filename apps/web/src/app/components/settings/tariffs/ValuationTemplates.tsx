'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from '../estimates/lists/ListSettings.module.css';

interface ValuationTemplate {
  id: string;
  name: string;
  coveragePerPound: number;
  maxLiability: number;
  premiumCalculation: 'fixed' | 'percentage';
  premiumValue: number;
  description: string;
  active: boolean;
}

export default function ValuationTemplates() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [templates, setTemplates] = useState<ValuationTemplate[]>([
    {
      id: '1',
      name: 'Basic Released Value',
      coveragePerPound: 0.6,
      maxLiability: 0,
      premiumCalculation: 'fixed',
      premiumValue: 0,
      description: 'Standard carrier liability at $0.60 per pound',
      active: true,
    },
    {
      id: '2',
      name: 'Full Value Protection',
      coveragePerPound: 0,
      maxLiability: 100000,
      premiumCalculation: 'percentage',
      premiumValue: 1.5,
      description: 'Full replacement value coverage',
      active: true,
    },
    {
      id: '3',
      name: 'Premium Coverage',
      coveragePerPound: 0,
      maxLiability: 250000,
      premiumCalculation: 'percentage',
      premiumValue: 2.5,
      description: 'Enhanced coverage for high-value items',
      active: true,
    },
  ]);

  const [editForm, setEditForm] = useState<Partial<ValuationTemplate>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        getApiUrl('tariff-settings/valuation-templates'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to fetch valuation templates');
      }

      const result = await response.json();
      if (result.data) {
        setTemplates(result.data);
      }
    } catch (err) {
      console.error('Error fetching valuation templates:', err);
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
      const response = await fetch(
        getApiUrl('tariff-settings/valuation-templates'),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ templates }),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update valuation templates');
      }

      setSuccess('Valuation templates updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving valuation templates:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update settings',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.name || editForm.coveragePerPound === undefined) {
      setError('Name and coverage per pound are required');
      return;
    }

    const newTemplate: ValuationTemplate = {
      id: Date.now().toString(),
      name: editForm.name!,
      coveragePerPound: editForm.coveragePerPound!,
      maxLiability: editForm.maxLiability || 0,
      premiumCalculation: editForm.premiumCalculation || 'fixed',
      premiumValue: editForm.premiumValue || 0,
      description: editForm.description || '',
      active: true,
    };

    setTemplates([...templates, newTemplate]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Valuation template added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const _handleEdit = (_template: ValuationTemplate) => {
    // TODO: Implement inline editing functionality
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this valuation template?')) {
      setTemplates(templates.filter((t) => t.id !== id));
      setSuccess('Valuation template deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Valuation Templates</h2>
          <p>Configure insurance and valuation coverage options</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Template'}
        </button>
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

      {showAddForm && (
        <div className={styles.addForm}>
          <h3>Add Valuation Template</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Template Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className={styles.input}
                placeholder="e.g., Basic Coverage"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="coveragePerPound">Coverage per Pound ($)</label>
              <input
                id="coveragePerPound"
                type="number"
                step="0.01"
                min="0"
                value={editForm.coveragePerPound || 0}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    coveragePerPound: parseFloat(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maxLiability">Maximum Liability ($)</label>
              <input
                id="maxLiability"
                type="number"
                min="0"
                value={editForm.maxLiability || 0}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxLiability: parseFloat(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="premiumCalculation">Premium Calculation</label>
              <select
                id="premiumCalculation"
                value={editForm.premiumCalculation || 'fixed'}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    premiumCalculation: e.target.value as any,
                  })
                }
                className={styles.select}
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage of Value</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="premiumValue">
                Premium{' '}
                {editForm.premiumCalculation === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                id="premiumValue"
                type="number"
                step="0.01"
                min="0"
                value={editForm.premiumValue || 0}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    premiumValue: parseFloat(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={editForm.description || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              className={styles.textarea}
              rows={3}
              placeholder="Brief description of coverage"
            />
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Template
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Coverage/lb</th>
              <th>Max Liability</th>
              <th>Premium</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td>${template.coveragePerPound.toFixed(2)}</td>
                <td>
                  {template.maxLiability > 0
                    ? `$${template.maxLiability.toLocaleString()}`
                    : 'Unlimited'}
                </td>
                <td>
                  {template.premiumValue > 0
                    ? template.premiumCalculation === 'percentage'
                      ? `${template.premiumValue}%`
                      : `$${template.premiumValue}`
                    : 'Free'}
                </td>
                <td>{template.description}</td>
                <td>
                  <span
                    className={
                      template.active
                        ? styles.statusActive
                        : styles.statusInactive
                    }
                  >
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => _handleEdit(template)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDelete(template.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.formActions}>
        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
