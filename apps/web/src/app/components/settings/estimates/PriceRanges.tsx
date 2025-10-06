'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from './lists/ListSettings.module.css';

interface PriceRange {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  color: string;
  active: boolean;
}

export default function PriceRanges() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([
    {
      id: '1',
      name: 'Small',
      minPrice: 0,
      maxPrice: 500,
      color: '#22c55e',
      active: true,
    },
    {
      id: '2',
      name: 'Medium',
      minPrice: 501,
      maxPrice: 2000,
      color: '#3b82f6',
      active: true,
    },
    {
      id: '3',
      name: 'Large',
      minPrice: 2001,
      maxPrice: 5000,
      color: '#f59e0b',
      active: true,
    },
    {
      id: '4',
      name: 'Enterprise',
      minPrice: 5001,
      maxPrice: 999999,
      color: '#8b5cf6',
      active: true,
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PriceRange>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/price-ranges'), {
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
        throw new Error('Failed to fetch price ranges');
      }

      const result = await response.json();
      if (result.data) {
        setPriceRanges(result.data);
      }
    } catch (err) {
      console.error('Error fetching price ranges:', err);
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
      const response = await fetch(getApiUrl('settings/price-ranges'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceRanges }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update price ranges');
      }

      setSuccess('Price ranges updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving price ranges:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update settings',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (
      !editForm.name ||
      editForm.minPrice === undefined ||
      editForm.maxPrice === undefined
    ) {
      setError('Name, min price, and max price are required');
      return;
    }

    const newRange: PriceRange = {
      id: Date.now().toString(),
      name: editForm.name!,
      minPrice: editForm.minPrice!,
      maxPrice: editForm.maxPrice!,
      color: editForm.color || '#6b7280',
      active: true,
    };

    setPriceRanges([...priceRanges, newRange]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Price range added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEdit = (range: PriceRange) => {
    setEditingId(range.id);
    setEditForm(range);
  };

  const handleUpdate = () => {
    if (editingId) {
      setPriceRanges(
        priceRanges.map((r) =>
          r.id === editingId ? { ...r, ...editForm } : r,
        ),
      );
      setEditingId(null);
      setEditForm({});
      setSuccess('Price range updated');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this price range?')) {
      setPriceRanges(priceRanges.filter((r) => r.id !== id));
      setSuccess('Price range deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Price Ranges</h2>
          <p>Define price ranges for estimates and reporting</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Range'}
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
          <h3>Add Price Range</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Range Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className={styles.input}
                placeholder="e.g., Medium"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="minPrice">Minimum Price ($)</label>
              <input
                id="minPrice"
                type="number"
                min="0"
                value={editForm.minPrice || 0}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    minPrice: parseFloat(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maxPrice">Maximum Price ($)</label>
              <input
                id="maxPrice"
                type="number"
                min="0"
                value={editForm.maxPrice || 0}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxPrice: parseFloat(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="color">Color</label>
              <input
                id="color"
                type="color"
                value={editForm.color || '#6b7280'}
                onChange={(e) =>
                  setEditForm({ ...editForm, color: e.target.value })
                }
                className={styles.colorPicker}
              />
            </div>
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Range
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Preview</th>
              <th>Name</th>
              <th>Min Price</th>
              <th>Max Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {priceRanges.map((range) => (
              <tr key={range.id}>
                <td>
                  <span
                    className={styles.tagBadge}
                    style={{
                      backgroundColor: range.color + '20',
                      color: range.color,
                    }}
                  >
                    {range.name}
                  </span>
                </td>
                <td>
                  {editingId === range.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className={styles.input}
                    />
                  ) : (
                    range.name
                  )}
                </td>
                <td>
                  {editingId === range.id ? (
                    <input
                      type="number"
                      value={editForm.minPrice || 0}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          minPrice: parseFloat(e.target.value),
                        })
                      }
                      className={styles.input}
                    />
                  ) : (
                    `$${range.minPrice.toLocaleString()}`
                  )}
                </td>
                <td>
                  {editingId === range.id ? (
                    <input
                      type="number"
                      value={editForm.maxPrice || 0}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          maxPrice: parseFloat(e.target.value),
                        })
                      }
                      className={styles.input}
                    />
                  ) : (
                    `$${range.maxPrice.toLocaleString()}`
                  )}
                </td>
                <td>
                  <span
                    className={
                      range.active ? styles.statusActive : styles.statusInactive
                    }
                  >
                    {range.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {editingId === range.id ? (
                      <>
                        <button
                          className={styles.actionButton}
                          onClick={handleUpdate}
                          title="Save"
                        >
                          💾
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({});
                          }}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleEdit(range)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleDelete(range.id)}
                          title="Delete"
                        >
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
