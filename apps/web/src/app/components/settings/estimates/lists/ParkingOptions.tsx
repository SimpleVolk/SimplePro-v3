'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from './ListSettings.module.css';

interface ParkingOption {
  id: string;
  name: string;
  description: string;
  distanceFromTruck: number;
  additionalCharge: number;
  active: boolean;
}

export default function ParkingOptions() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [parkingOptions, setParkingOptions] = useState<ParkingOption[]>([
    { id: '1', name: 'Driveway', description: 'Truck can park in driveway', distanceFromTruck: 10, additionalCharge: 0, active: true },
    { id: '2', name: 'Street Parking', description: 'Street parking available near entrance', distanceFromTruck: 25, additionalCharge: 25, active: true },
    { id: '3', name: 'Loading Dock', description: 'Building has loading dock access', distanceFromTruck: 0, additionalCharge: 0, active: true },
    { id: '4', name: 'Reserved Parking', description: 'Reserved spot must be arranged', distanceFromTruck: 50, additionalCharge: 50, active: true },
    { id: '5', name: 'No Parking', description: 'No parking available, long carry', distanceFromTruck: 100, additionalCharge: 150, active: true },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ParkingOption>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/parking-options'), {
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
        throw new Error('Failed to fetch parking options');
      }

      const result = await response.json();
      if (result.data) {
        setParkingOptions(result.data);
      }
    } catch (err) {
      console.error('Error fetching parking options:', err);
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
      const response = await fetch(getApiUrl('settings/parking-options'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ parkingOptions }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update parking options');
      }

      setSuccess('Parking options updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving parking options:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.name || editForm.distanceFromTruck === undefined) {
      setError('Name and distance are required');
      return;
    }

    const newOption: ParkingOption = {
      id: Date.now().toString(),
      name: editForm.name!,
      description: editForm.description || '',
      distanceFromTruck: editForm.distanceFromTruck!,
      additionalCharge: editForm.additionalCharge || 0,
      active: true,
    };

    setParkingOptions([...parkingOptions, newOption]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Parking option added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEdit = (option: ParkingOption) => {
    setEditingId(option.id);
    setEditForm(option);
  };

  const handleUpdate = () => {
    if (editingId) {
      setParkingOptions(parkingOptions.map(opt =>
        opt.id === editingId ? { ...opt, ...editForm } : opt
      ));
      setEditingId(null);
      setEditForm({});
      setSuccess('Parking option updated');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this parking option?')) {
      setParkingOptions(parkingOptions.filter(opt => opt.id !== id));
      setSuccess('Parking option deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Parking Options</h2>
          <p>Configure parking availability and distance charges</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Option'}
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
          <h3>Add Parking Option</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Option Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={styles.input}
                placeholder="e.g., Parking Garage"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="distance">Distance from Truck (feet)</label>
              <input
                id="distance"
                type="number"
                min="0"
                value={editForm.distanceFromTruck || 0}
                onChange={(e) => setEditForm({ ...editForm, distanceFromTruck: parseInt(e.target.value) })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="charge">Additional Charge ($)</label>
              <input
                id="charge"
                type="number"
                min="0"
                value={editForm.additionalCharge || 0}
                onChange={(e) => setEditForm({ ...editForm, additionalCharge: parseFloat(e.target.value) })}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={styles.input}
              placeholder="Brief description"
            />
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Option
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Distance (ft)</th>
              <th>Charge</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parkingOptions.map(option => (
              <tr key={option.id}>
                <td>
                  {editingId === option.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={styles.input}
                    />
                  ) : (
                    option.name
                  )}
                </td>
                <td>
                  {editingId === option.id ? (
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className={styles.input}
                    />
                  ) : (
                    option.description
                  )}
                </td>
                <td>
                  {editingId === option.id ? (
                    <input
                      type="number"
                      value={editForm.distanceFromTruck || 0}
                      onChange={(e) => setEditForm({ ...editForm, distanceFromTruck: parseInt(e.target.value) })}
                      className={styles.input}
                    />
                  ) : (
                    option.distanceFromTruck
                  )}
                </td>
                <td>
                  {editingId === option.id ? (
                    <input
                      type="number"
                      value={editForm.additionalCharge || 0}
                      onChange={(e) => setEditForm({ ...editForm, additionalCharge: parseFloat(e.target.value) })}
                      className={styles.input}
                    />
                  ) : (
                    `$${option.additionalCharge}`
                  )}
                </td>
                <td>
                  <span className={option.active ? styles.statusActive : styles.statusInactive}>
                    {option.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {editingId === option.id ? (
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
                        <button className={styles.actionButton} onClick={() => handleEdit(option)} title="Edit">
                          ✏️
                        </button>
                        <button className={styles.actionButton} onClick={() => handleDelete(option.id)} title="Delete">
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
