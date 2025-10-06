'use client';

import { useState, useEffect } from 'react';
import styles from './PackingRates.module.css';

interface PackingRate {
  id: string;
  name: string;
  rateType: 'hourly' | 'per_item' | 'per_box' | 'flat_rate';
  baseRate: number;
  description?: string;
}

const API_BASE_URL = 'http://localhost:3001/api';

export default function PackingRates() {
  const [packingRates, setPackingRates] = useState<PackingRate[]>([]);
  const [tariffSettingsId, setTariffSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<PackingRate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rateType: 'hourly' as 'hourly' | 'per_item' | 'per_box' | 'flat_rate',
    baseRate: 0,
    description: '',
  });

  const rateTypes = [
    { value: 'hourly', label: 'Hourly Rate' },
    { value: 'per_item', label: 'Per Item' },
    { value: 'per_box', label: 'Per Box' },
    { value: 'flat_rate', label: 'Flat Rate' },
  ];

  // Fetch active tariff settings and packing rates on mount
  useEffect(() => {
    fetchPackingRates();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchPackingRates = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get active tariff settings ID
      const settingsResponse = await fetch(
        `${API_BASE_URL}/tariff-settings/active`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch tariff settings');
      }

      const settingsData = await settingsResponse.json();
      const settingsId = settingsData._id || settingsData.id;
      setTariffSettingsId(settingsId);

      // Then fetch packing rates
      const ratesResponse = await fetch(
        `${API_BASE_URL}/tariff-settings/${settingsId}/packing-rates`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!ratesResponse.ok) {
        throw new Error('Failed to fetch packing rates');
      }

      const ratesData = await ratesResponse.json();

      // Map API data to component state format
      const mappedRates: PackingRate[] = (ratesData.rates || []).map(
        (rate: any) => ({
          id: rate.itemType, // Use itemType as unique ID
          name: rate.itemType,
          rateType: rate.category as
            | 'hourly'
            | 'per_item'
            | 'per_box'
            | 'flat_rate',
          baseRate: rate.rate,
          description: rate.description || '',
        }),
      );

      setPackingRates(mappedRates);
    } catch (err) {
      console.error('Error fetching packing rates:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load packing rates',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingRate(null);
    setFormData({ name: '', rateType: 'hourly', baseRate: 0, description: '' });
    setShowForm(true);
  };

  const handleEdit = (rate: PackingRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      rateType: rate.rateType,
      baseRate: rate.baseRate,
      description: rate.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const rate = packingRates.find((r) => r.id === id);
    if (
      !rate ||
      !window.confirm(`Are you sure you want to delete "${rate.name}"?`)
    ) {
      return;
    }

    if (!tariffSettingsId) {
      alert('Tariff settings not loaded. Please refresh the page.');
      return;
    }

    try {
      // Remove the rate from the array and update via API
      const updatedRates = packingRates.filter((r) => r.id !== id);
      await savePackingRates(updatedRates);
    } catch (err) {
      console.error('Error deleting packing rate:', err);
      alert(
        err instanceof Error ? err.message : 'Failed to delete packing rate',
      );
    }
  };

  const savePackingRates = async (rates: PackingRate[]) => {
    if (!tariffSettingsId) {
      throw new Error('Tariff settings not loaded');
    }

    // Map component state to API format
    const apiRates = rates.map((rate) => ({
      itemType: rate.name,
      description: rate.description || '',
      rate: rate.baseRate,
      unit:
        rate.rateType === 'hourly'
          ? 'hour'
          : rate.rateType === 'per_item'
            ? 'item'
            : rate.rateType === 'per_box'
              ? 'box'
              : 'flat',
      category: rate.rateType,
    }));

    const response = await fetch(
      `${API_BASE_URL}/tariff-settings/${tariffSettingsId}/packing-rates`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          enabled: true,
          rates: apiRates,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to save packing rates');
    }

    // Refresh data from API
    await fetchPackingRates();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tariffSettingsId) {
      alert('Tariff settings not loaded. Please refresh the page.');
      return;
    }

    try {
      let updatedRates: PackingRate[];

      if (editingRate) {
        // Update existing rate
        updatedRates = packingRates.map((rate) =>
          rate.id === editingRate.id ? { ...rate, ...formData } : rate,
        );
      } else {
        // Add new rate
        const newRate: PackingRate = {
          id: formData.name, // Use name as ID
          ...formData,
        };
        updatedRates = [...packingRates, newRate];
      }

      await savePackingRates(updatedRates);

      setShowForm(false);
      setFormData({
        name: '',
        rateType: 'hourly',
        baseRate: 0,
        description: '',
      });
      setEditingRate(null);
    } catch (err) {
      console.error('Error saving packing rate:', err);
      alert(err instanceof Error ? err.message : 'Failed to save packing rate');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: '', rateType: 'hourly', baseRate: 0, description: '' });
    setEditingRate(null);
  };

  const formatRateType = (type: string) => {
    return rateTypes.find((t) => t.value === type)?.label || type;
  };

  const formatRate = (rate: number, type: string) => {
    if (type === 'hourly') {
      return `$${rate}/hour`;
    } else if (type === 'per_item') {
      return `$${rate}/item`;
    } else if (type === 'per_box') {
      return `$${rate}/box`;
    } else {
      return `$${rate}`;
    }
  };

  if (loading) {
    return (
      <div className={styles.packingRates}>
        <div className={styles.loadingState}>
          <p>Loading packing rates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.packingRates}>
        <div className={styles.errorState}>
          <p>Error: {error}</p>
          <button onClick={fetchPackingRates} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.packingRates}>
      <div className={styles.header}>
        <div>
          <h3>Packing Rates</h3>
          <p>Configure pricing rates for packing services and materials</p>
        </div>
        <button
          onClick={handleAddNew}
          className={styles.addButton}
          disabled={showForm}
        >
          + New Packing Rate
        </button>
      </div>

      {showForm && (
        <div className={styles.formContainer}>
          <div className={styles.formCard}>
            <h4>{editingRate ? 'Edit Packing Rate' : 'New Packing Rate'}</h4>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Professional Packing - Hourly"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="rateType">Rate Type</label>
                  <select
                    id="rateType"
                    value={formData.rateType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateType: e.target.value as
                          | 'hourly'
                          | 'per_item'
                          | 'per_box'
                          | 'flat_rate',
                      })
                    }
                    className={styles.select}
                    required
                  >
                    {rateTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="baseRate">Base Rate ($)</label>
                  <input
                    id="baseRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.baseRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    required
                    className={styles.input}
                  />
                </div>

                <div
                  className={styles.formGroup}
                  style={{ gridColumn: '1 / -1' }}
                >
                  <label htmlFor="description">Description (Optional)</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Add a description for this packing rate..."
                    className={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton}>
                  {editingRate ? 'Update Rate' : 'Create Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        {packingRates.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No packing rates configured yet.</p>
            <button onClick={handleAddNew} className={styles.emptyStateButton}>
              + Create Your First Packing Rate
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rate Type</th>
                <th>Base Rate</th>
                <th className={styles.actionsColumn}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packingRates.map((rate) => (
                <tr key={rate.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.rateName}>{rate.name}</span>
                      {rate.description && (
                        <span className={styles.rateDescription}>
                          {rate.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.typeTag}>
                      {formatRateType(rate.rateType)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.rateValue}>
                      {formatRate(rate.baseRate, rate.rateType)}
                    </span>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(rate)}
                        className={styles.editButton}
                        title="Edit rate"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className={styles.deleteButton}
                        title="Delete rate"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.infoSection}>
        <h4>Packing Rate Types</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h5>Hourly Rate</h5>
            <p>
              Charge by the hour for professional packing services. Best for
              flexible, on-demand packing needs.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Per Item</h5>
            <p>
              Individual item pricing for fragile, valuable, or specialty items
              requiring extra care and custom packing.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Per Box</h5>
            <p>
              Fixed rate per box or container, including materials. Ideal for
              standardized packing services.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Flat Rate</h5>
            <p>
              Single fixed price for complete packing packages. Simple pricing
              for full-service packing jobs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
