'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from '../estimates/lists/ListSettings.module.css';

interface OpportunityType {
  id: string;
  name: string;
  probability: number;
  expectedCloseDays: number;
  funnelStage: string;
  description: string;
  active: boolean;
}

export default function OpportunityTypes() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [opportunityTypes, setOpportunityTypes] = useState<OpportunityType[]>([
    {
      id: '1',
      name: 'Inbound Call',
      probability: 40,
      expectedCloseDays: 7,
      funnelStage: 'Lead',
      description: 'Customer called directly',
      active: true,
    },
    {
      id: '2',
      name: 'Website Form',
      probability: 35,
      expectedCloseDays: 10,
      funnelStage: 'Lead',
      description: 'Online estimate request',
      active: true,
    },
    {
      id: '3',
      name: 'Referral',
      probability: 70,
      expectedCloseDays: 5,
      funnelStage: 'Qualified',
      description: 'Referred by previous customer',
      active: true,
    },
    {
      id: '4',
      name: 'Corporate Account',
      probability: 85,
      expectedCloseDays: 3,
      funnelStage: 'Qualified',
      description: 'Existing corporate client',
      active: true,
    },
    {
      id: '5',
      name: 'Partner Referral',
      probability: 60,
      expectedCloseDays: 7,
      funnelStage: 'Qualified',
      description: 'From real estate agent or partner',
      active: true,
    },
  ]);

  const [editForm, setEditForm] = useState<Partial<OpportunityType>>({});
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
        getApiUrl('tariff-settings/opportunity-types'),
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
        throw new Error('Failed to fetch opportunity types');
      }

      const result = await response.json();
      if (result.data) {
        setOpportunityTypes(result.data);
      }
    } catch (err) {
      console.error('Error fetching opportunity types:', err);
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
        getApiUrl('tariff-settings/opportunity-types'),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ opportunityTypes }),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update opportunity types');
      }

      setSuccess('Opportunity types updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving opportunity types:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update settings',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.name || editForm.probability === undefined) {
      setError('Name and probability are required');
      return;
    }

    const newType: OpportunityType = {
      id: Date.now().toString(),
      name: editForm.name!,
      probability: editForm.probability!,
      expectedCloseDays: editForm.expectedCloseDays || 7,
      funnelStage: editForm.funnelStage || 'Lead',
      description: editForm.description || '',
      active: true,
    };

    setOpportunityTypes([...opportunityTypes, newType]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Opportunity type added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const _handleEdit = (_type: OpportunityType) => {
    // TODO: Implement inline editing functionality
    // setEditingId(type.id);
    // setEditForm(type);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this opportunity type?')) {
      setOpportunityTypes(opportunityTypes.filter((t) => t.id !== id));
      setSuccess('Opportunity type deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Opportunity Types</h2>
          <p>Configure lead sources and sales funnel stages</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Type'}
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
          <h3>Add Opportunity Type</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Type Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className={styles.input}
                placeholder="e.g., Cold Call"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="probability">Win Probability (%)</label>
              <input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={editForm.probability || 0}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    probability: parseInt(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="expectedCloseDays">Expected Close (days)</label>
              <input
                id="expectedCloseDays"
                type="number"
                min="1"
                value={editForm.expectedCloseDays || 7}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    expectedCloseDays: parseInt(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="funnelStage">Funnel Stage</label>
              <select
                id="funnelStage"
                value={editForm.funnelStage || 'Lead'}
                onChange={(e) =>
                  setEditForm({ ...editForm, funnelStage: e.target.value })
                }
                className={styles.select}
              >
                <option value="Lead">Lead</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={editForm.description || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              className={styles.input}
              placeholder="Brief description"
            />
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Type
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Win Rate</th>
              <th>Avg Close Days</th>
              <th>Funnel Stage</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {opportunityTypes.map((type) => (
              <tr key={type.id}>
                <td>{type.name}</td>
                <td>{type.probability}%</td>
                <td>{type.expectedCloseDays} days</td>
                <td>
                  <span
                    className={styles.tagBadge}
                    style={{
                      backgroundColor:
                        type.funnelStage === 'Lead'
                          ? '#3b82f620'
                          : type.funnelStage === 'Qualified'
                            ? '#f59e0b20'
                            : type.funnelStage === 'Proposal'
                              ? '#8b5cf620'
                              : '#22c55e20',
                      color:
                        type.funnelStage === 'Lead'
                          ? '#3b82f6'
                          : type.funnelStage === 'Qualified'
                            ? '#f59e0b'
                            : type.funnelStage === 'Proposal'
                              ? '#8b5cf6'
                              : '#22c55e',
                    }}
                  >
                    {type.funnelStage}
                  </span>
                </td>
                <td>{type.description}</td>
                <td>
                  <span
                    className={
                      type.active ? styles.statusActive : styles.statusInactive
                    }
                  >
                    {type.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => _handleEdit(type)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDelete(type.id)}
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
