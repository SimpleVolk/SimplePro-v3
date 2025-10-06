'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../../lib/config';
import styles from './ListSettings.module.css';

interface Tag {
  id: string;
  name: string;
  category: 'customer' | 'job' | 'estimate' | 'inventory';
  color: string;
  usageCount: number;
  active: boolean;
}

export default function TagsManagement() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([
    { id: '1', name: 'VIP Customer', category: 'customer', color: '#f59e0b', usageCount: 15, active: true },
    { id: '2', name: 'Fragile Items', category: 'inventory', color: '#ef4444', usageCount: 42, active: true },
    { id: '3', name: 'Rush Job', category: 'job', color: '#ec4899', usageCount: 8, active: true },
    { id: '4', name: 'High Value', category: 'estimate', color: '#8b5cf6', usageCount: 23, active: true },
    { id: '5', name: 'Corporate Client', category: 'customer', color: '#3b82f6', usageCount: 31, active: true },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tag>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/tags'), {
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
        throw new Error('Failed to fetch tags');
      }

      const result = await response.json();
      if (result.data) {
        setTags(result.data);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
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
      const response = await fetch(getApiUrl('settings/tags'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update tags');
      }

      setSuccess('Tags updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.name || !editForm.category) {
      setError('Name and category are required');
      return;
    }

    const newTag: Tag = {
      id: Date.now().toString(),
      name: editForm.name!,
      category: editForm.category!,
      color: editForm.color || '#6b7280',
      usageCount: 0,
      active: true,
    };

    setTags([...tags, newTag]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Tag added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditForm(tag);
  };

  const handleUpdate = () => {
    if (editingId) {
      setTags(tags.map(t =>
        t.id === editingId ? { ...t, ...editForm } : t
      ));
      setEditingId(null);
      setEditForm({});
      setSuccess('Tag updated');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      setTags(tags.filter(t => t.id !== id));
      setSuccess('Tag deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Tags Management</h2>
          <p>Create and manage tags for organizing customers, jobs, and estimates</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Tag'}
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
          <h3>Add Tag</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Tag Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={styles.input}
                placeholder="e.g., Priority Customer"
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
                <option value="customer">Customer</option>
                <option value="job">Job</option>
                <option value="estimate">Estimate</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="color">Color</label>
              <input
                id="color"
                type="color"
                value={editForm.color || '#6b7280'}
                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                className={styles.colorPicker}
              />
            </div>
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Tag
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tag Preview</th>
              <th>Name</th>
              <th>Category</th>
              <th>Usage Count</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map(tag => (
              <tr key={tag.id}>
                <td>
                  <span
                    className={styles.tagBadge}
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {tag.name}
                  </span>
                </td>
                <td>
                  {editingId === tag.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={styles.input}
                    />
                  ) : (
                    tag.name
                  )}
                </td>
                <td>
                  {editingId === tag.id ? (
                    <select
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="customer">Customer</option>
                      <option value="job">Job</option>
                      <option value="estimate">Estimate</option>
                      <option value="inventory">Inventory</option>
                    </select>
                  ) : (
                    tag.category.charAt(0).toUpperCase() + tag.category.slice(1)
                  )}
                </td>
                <td>{tag.usageCount}</td>
                <td>
                  <span className={tag.active ? styles.statusActive : styles.statusInactive}>
                    {tag.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {editingId === tag.id ? (
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
                        <button className={styles.actionButton} onClick={() => handleEdit(tag)} title="Edit">
                          ✏️
                        </button>
                        <button className={styles.actionButton} onClick={() => handleDelete(tag.id)} title="Delete">
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
