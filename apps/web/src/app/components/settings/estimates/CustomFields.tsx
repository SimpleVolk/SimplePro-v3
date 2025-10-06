'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from './lists/ListSettings.module.css';

interface CustomField {
  id: string;
  name: string;
  fieldType: 'text' | 'number' | 'dropdown' | 'checkbox' | 'date';
  category: 'estimate' | 'job' | 'customer';
  required: boolean;
  showInForms: boolean;
  options?: string[];
  orderIndex: number;
}

export default function CustomFields() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customFields, setCustomFields] = useState<CustomField[]>([
    { id: '1', name: 'Referral Source', fieldType: 'dropdown', category: 'customer', required: false, showInForms: true, options: ['Google', 'Yelp', 'Friend'], orderIndex: 1 },
    { id: '2', name: 'Special Instructions', fieldType: 'text', category: 'job', required: false, showInForms: true, orderIndex: 2 },
    { id: '3', name: 'Building Floor', fieldType: 'number', category: 'estimate', required: false, showInForms: true, orderIndex: 3 },
  ]);

  const [editForm, setEditForm] = useState<Partial<CustomField>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/custom-fields'), {
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
        throw new Error('Failed to fetch custom fields');
      }

      const result = await response.json();
      if (result.data) {
        setCustomFields(result.data);
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err);
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
      const response = await fetch(getApiUrl('settings/custom-fields'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ customFields }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update custom fields');
      }

      setSuccess('Custom fields updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving custom fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.name || !editForm.fieldType || !editForm.category) {
      setError('Name, field type, and category are required');
      return;
    }

    const newField: CustomField = {
      id: Date.now().toString(),
      name: editForm.name!,
      fieldType: editForm.fieldType!,
      category: editForm.category!,
      required: editForm.required ?? false,
      showInForms: editForm.showInForms ?? true,
      options: editForm.options,
      orderIndex: customFields.length + 1,
    };

    setCustomFields([...customFields, newField]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Custom field added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this custom field?')) {
      setCustomFields(customFields.filter(f => f.id !== id));
      setSuccess('Custom field deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...customFields];
    [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    newFields.forEach((f, i) => f.orderIndex = i + 1);
    setCustomFields(newFields);
  };

  const moveDown = (index: number) => {
    if (index === customFields.length - 1) return;
    const newFields = [...customFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    newFields.forEach((f, i) => f.orderIndex = i + 1);
    setCustomFields(newFields);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Custom Fields</h2>
          <p>Create custom fields for estimates, jobs, and customers</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Field'}
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
          <h3>Add Custom Field</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Field Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={styles.input}
                placeholder="e.g., Preferred Contact Time"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="fieldType">Field Type</label>
              <select
                id="fieldType"
                value={editForm.fieldType || ''}
                onChange={(e) => setEditForm({ ...editForm, fieldType: e.target.value as any })}
                className={styles.select}
              >
                <option value="">Select type</option>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="dropdown">Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
              </select>
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
                <option value="estimate">Estimate</option>
                <option value="job">Job</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>

          {editForm.fieldType === 'dropdown' && (
            <div className={styles.formGroup}>
              <label htmlFor="options">Options (comma-separated)</label>
              <input
                id="options"
                type="text"
                value={(editForm.options || []).join(', ')}
                onChange={(e) => setEditForm({ ...editForm, options: e.target.value.split(',').map(o => o.trim()) })}
                className={styles.input}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editForm.required ?? false}
                  onChange={(e) => setEditForm({ ...editForm, required: e.target.checked })}
                />
                Required Field
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editForm.showInForms ?? true}
                  onChange={(e) => setEditForm({ ...editForm, showInForms: e.target.checked })}
                />
                Show in Forms
              </label>
            </div>
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Field
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Field Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>Required</th>
              <th>Visible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customFields.map((field, index) => (
              <tr key={field.id}>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      className={styles.actionButton}
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => moveDown(index)}
                      disabled={index === customFields.length - 1}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>{field.name}</td>
                <td>{field.fieldType.charAt(0).toUpperCase() + field.fieldType.slice(1)}</td>
                <td>{field.category.charAt(0).toUpperCase() + field.category.slice(1)}</td>
                <td>
                  <span className={field.required ? styles.statusActive : styles.statusInactive}>
                    {field.required ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={field.showInForms ? styles.statusActive : styles.statusInactive}>
                    {field.showInForms ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionButton} onClick={() => handleDelete(field.id)} title="Delete">
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
        <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
