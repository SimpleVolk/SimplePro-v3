'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../../lib/config';
import styles from './ListSettings.module.css';

interface Region {
  id: string;
  name: string;
  zipCodeRanges: string;
  cities: string[];
  travelCharge: number;
  minimumCharge: number;
  active: boolean;
}

export default function Regions() {
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [regions, setRegions] = useState<Region[]>([
    { id: '1', name: 'Downtown', zipCodeRanges: '75201-75299', cities: ['Dallas'], travelCharge: 0, minimumCharge: 500, active: true },
    { id: '2', name: 'North Dallas', zipCodeRanges: '75200-75250', cities: ['Plano', 'Frisco', 'McKinney'], travelCharge: 50, minimumCharge: 600, active: true },
    { id: '3', name: 'Fort Worth', zipCodeRanges: '76100-76199', cities: ['Fort Worth', 'Arlington'], travelCharge: 75, minimumCharge: 650, active: true },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Region>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/regions'), {
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
        throw new Error('Failed to fetch regions');
      }

      const result = await response.json();
      if (result.data) {
        setRegions(result.data);
      }
    } catch (err) {
      console.error('Error fetching regions:', err);
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
      const response = await fetch(getApiUrl('settings/regions'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ regions }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update regions');
      }

      setSuccess('Regions updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving regions:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!editForm.name || !editForm.zipCodeRanges) {
      setError('Name and zip code ranges are required');
      return;
    }

    const newRegion: Region = {
      id: Date.now().toString(),
      name: editForm.name!,
      zipCodeRanges: editForm.zipCodeRanges!,
      cities: editForm.cities || [],
      travelCharge: editForm.travelCharge || 0,
      minimumCharge: editForm.minimumCharge || 0,
      active: true,
    };

    setRegions([...regions, newRegion]);
    setEditForm({});
    setShowAddForm(false);
    setSuccess('Region added');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEdit = (region: Region) => {
    setEditingId(region.id);
    setEditForm(region);
  };

  const handleUpdate = () => {
    if (editingId) {
      setRegions(regions.map(reg =>
        reg.id === editingId ? { ...reg, ...editForm } : reg
      ));
      setEditingId(null);
      setEditForm({});
      setSuccess('Region updated');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this region?')) {
      setRegions(regions.filter(reg => reg.id !== id));
      setSuccess('Region deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Service Regions</h2>
          <p>Define geographic service areas and travel charges</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Region'}
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
          <h3>Add Service Region</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Region Name</label>
              <input
                id="name"
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={styles.input}
                placeholder="e.g., North Dallas"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="zipCodeRanges">ZIP Code Ranges</label>
              <input
                id="zipCodeRanges"
                type="text"
                value={editForm.zipCodeRanges || ''}
                onChange={(e) => setEditForm({ ...editForm, zipCodeRanges: e.target.value })}
                className={styles.input}
                placeholder="75200-75250, 75300"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="travelCharge">Travel Charge ($)</label>
              <input
                id="travelCharge"
                type="number"
                min="0"
                value={editForm.travelCharge || 0}
                onChange={(e) => setEditForm({ ...editForm, travelCharge: parseFloat(e.target.value) })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="minimumCharge">Minimum Charge ($)</label>
              <input
                id="minimumCharge"
                type="number"
                min="0"
                value={editForm.minimumCharge || 0}
                onChange={(e) => setEditForm({ ...editForm, minimumCharge: parseFloat(e.target.value) })}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cities">Cities (comma-separated)</label>
            <input
              id="cities"
              type="text"
              value={(editForm.cities || []).join(', ')}
              onChange={(e) => setEditForm({ ...editForm, cities: e.target.value.split(',').map(c => c.trim()) })}
              className={styles.input}
              placeholder="Dallas, Plano, Frisco"
            />
          </div>

          <button className={styles.saveButton} onClick={handleAdd}>
            Add Region
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>ZIP Codes</th>
              <th>Cities</th>
              <th>Travel Charge</th>
              <th>Min Charge</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {regions.map(region => (
              <tr key={region.id}>
                <td>
                  {editingId === region.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={styles.input}
                    />
                  ) : (
                    region.name
                  )}
                </td>
                <td>
                  {editingId === region.id ? (
                    <input
                      type="text"
                      value={editForm.zipCodeRanges || ''}
                      onChange={(e) => setEditForm({ ...editForm, zipCodeRanges: e.target.value })}
                      className={styles.input}
                    />
                  ) : (
                    region.zipCodeRanges
                  )}
                </td>
                <td>
                  {editingId === region.id ? (
                    <input
                      type="text"
                      value={(editForm.cities || []).join(', ')}
                      onChange={(e) => setEditForm({ ...editForm, cities: e.target.value.split(',').map(c => c.trim()) })}
                      className={styles.input}
                    />
                  ) : (
                    region.cities.join(', ')
                  )}
                </td>
                <td>
                  {editingId === region.id ? (
                    <input
                      type="number"
                      value={editForm.travelCharge || 0}
                      onChange={(e) => setEditForm({ ...editForm, travelCharge: parseFloat(e.target.value) })}
                      className={styles.input}
                    />
                  ) : (
                    `$${region.travelCharge}`
                  )}
                </td>
                <td>
                  {editingId === region.id ? (
                    <input
                      type="number"
                      value={editForm.minimumCharge || 0}
                      onChange={(e) => setEditForm({ ...editForm, minimumCharge: parseFloat(e.target.value) })}
                      className={styles.input}
                    />
                  ) : (
                    `$${region.minimumCharge}`
                  )}
                </td>
                <td>
                  <span className={region.active ? styles.statusActive : styles.statusInactive}>
                    {region.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {editingId === region.id ? (
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
                        <button className={styles.actionButton} onClick={() => handleEdit(region)} title="Edit">
                          ✏️
                        </button>
                        <button className={styles.actionButton} onClick={() => handleDelete(region.id)} title="Delete">
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
