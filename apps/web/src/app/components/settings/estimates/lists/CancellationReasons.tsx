'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../../lib/config';
import styles from './ListSettings.module.css';

interface CancellationReason {
  id: string;
  reason: string;
  category: 'customer' | 'company' | 'circumstances';
  active: boolean;
  usageCount: number;
}

export default function CancellationReasons() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reasons, setReasons] = useState<CancellationReason[]>([
    { id: '1', reason: 'Customer found cheaper option', category: 'customer', active: true, usageCount: 12 },
    { id: '2', reason: 'Customer changed move date', category: 'customer', active: true, usageCount: 8 },
    { id: '3', reason: 'Unable to staff crew', category: 'company', active: true, usageCount: 3 },
    { id: '4', reason: 'Weather conditions', category: 'circumstances', active: true, usageCount: 2 },
    { id: '5', reason: 'Property sale fell through', category: 'circumstances', active: true, usageCount: 5 },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CancellationReason>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/cancellation-reasons'), {
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
        throw new Error('Failed to fetch cancellation reasons');
      }

      const result = await response.json();
      if (result.data) {
        setReasons(result.data);
      }
    } catch (err) {
      console.error('Error fetching cancellation reasons:', err);
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
      const response = await fetch(getApiUrl('settings/cancellation-reasons'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reasons }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update cancellation reasons');
      }

      setSuccess('Cancellation reasons updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving cancellation reasons:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.reason || !editForm.category) {
      setError('Reason and category are required');
      return;
    }

    const newReason: CancellationReason = {
      id: Date.now().toString(),
      reason: editForm.reason!,
      category: editForm.category!,
      active: true,
      usageCount: 0,
    };

    setReasons([...reasons, newReason]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Cancellation reason added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEdit = (reason: CancellationReason) => {
    setEditingId(reason.id);
    setEditForm(reason);
  };

  const handleUpdate = () => {
    if (editingId) {
      setReasons(reasons.map(r =>
        r.id === editingId ? { ...r, ...editForm } : r
      ));
      setEditingId(null);
      setEditForm({});
      setSuccess('Cancellation reason updated');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this cancellation reason?')) {
      setReasons(reasons.filter(r => r.id !== id));
      setSuccess('Cancellation reason deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'customer': return '#3b82f6';
      case 'company': return '#ef4444';
      case 'circumstances': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Cancellation Reasons</h2>
          <p>Track why moves are cancelled for analytics and improvements</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Reason'}
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
          <h3>Add Cancellation Reason</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="reason">Reason</label>
              <input
                id="reason"
                type="text"
                value={editForm.reason || ''}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className={styles.input}
                placeholder="e.g., Customer relocated unexpectedly"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={editForm.category || ''}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                className={styles.select}
              >
                <option value="">Select category</option>
                <option value="customer">Customer Decision</option>
                <option value="company">Company Issue</option>
                <option value="circumstances">External Circumstances</option>
              </select>
            </div>
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Reason
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Reason</th>
              <th>Category</th>
              <th>Usage Count</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map(reason => (
              <tr key={reason.id}>
                <td>
                  {editingId === reason.id ? (
                    <input
                      type="text"
                      value={editForm.reason || ''}
                      onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                      className={styles.input}
                    />
                  ) : (
                    reason.reason
                  )}
                </td>
                <td>
                  {editingId === reason.id ? (
                    <select
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="customer">Customer Decision</option>
                      <option value="company">Company Issue</option>
                      <option value="circumstances">External Circumstances</option>
                    </select>
                  ) : (
                    <span
                      className={styles.tagBadge}
                      style={{ backgroundColor: getCategoryColor(reason.category) + '20', color: getCategoryColor(reason.category) }}
                    >
                      {reason.category.charAt(0).toUpperCase() + reason.category.slice(1)}
                    </span>
                  )}
                </td>
                <td>{reason.usageCount}</td>
                <td>
                  <span className={reason.active ? styles.statusActive : styles.statusInactive}>
                    {reason.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {editingId === reason.id ? (
                      <>
                        <button className={styles.actionButton} onClick={handleUpdate} title="Save">
                          💾
                        </button>
                        <button className={styles.actionButton} onClick={() => { setEditingId(null); setEditForm({}); }} title="Cancel">
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={styles.actionButton} onClick={() => handleEdit(reason)} title="Edit">
                          ✏️
                        </button>
                        <button className={styles.actionButton} onClick={() => handleDelete(reason.id)} title="Delete">
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.formActions}>
        <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
