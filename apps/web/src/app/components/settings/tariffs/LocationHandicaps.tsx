'use client';

import { useState, useEffect } from 'react';
import styles from './LocationHandicaps.module.css';

interface LocationHandicap {
  id: string;
  name: string;
  handicapType:
    | 'stairs'
    | 'long_carry'
    | 'elevator'
    | 'parking_distance'
    | 'access_difficulty'
    | 'no_elevator'
    | 'multiple_flights';
  adjustmentType: 'percentage' | 'fixed_amount';
  value: number;
  description?: string;
}

const API_BASE_URL = 'http://localhost:3001/api';

export default function LocationHandicaps() {
  const [locationHandicaps, setLocationHandicaps] = useState<
    LocationHandicap[]
  >([]);
  const [tariffSettingsId, setTariffSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingHandicap, setEditingHandicap] =
    useState<LocationHandicap | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    handicapType: 'stairs' as
      | 'stairs'
      | 'long_carry'
      | 'elevator'
      | 'parking_distance'
      | 'access_difficulty'
      | 'no_elevator'
      | 'multiple_flights',
    adjustmentType: 'fixed_amount' as 'percentage' | 'fixed_amount',
    value: 0,
    description: '',
  });

  const handicapTypes = [
    { value: 'stairs', label: 'Stairs' },
    { value: 'long_carry', label: 'Long Carry' },
    { value: 'elevator', label: 'Elevator Issues' },
    { value: 'parking_distance', label: 'Parking Distance' },
    { value: 'access_difficulty', label: 'Access Difficulty' },
    { value: 'no_elevator', label: 'No Elevator Access' },
    { value: 'multiple_flights', label: 'Multiple Flights' },
  ];

  const adjustmentTypes = [
    { value: 'fixed_amount', label: 'Fixed Amount ($)' },
    { value: 'percentage', label: 'Percentage (%)' },
  ];

  // Fetch active tariff settings and handicaps on mount
  useEffect(() => {
    fetchHandicaps();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchHandicaps = async () => {
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

      // Then fetch handicaps
      const handicapsResponse = await fetch(
        `${API_BASE_URL}/tariff-settings/${settingsId}/handicaps`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!handicapsResponse.ok) {
        throw new Error('Failed to fetch location handicaps');
      }

      const handicapsData = await handicapsResponse.json();

      // Map API data to component state format
      const mappedHandicaps: LocationHandicap[] = (handicapsData || []).map(
        (handicap: any) => ({
          id: handicap.id || handicap._id,
          name: handicap.name,
          handicapType: handicap.category as
            | 'stairs'
            | 'long_carry'
            | 'elevator'
            | 'parking_distance'
            | 'access_difficulty'
            | 'no_elevator'
            | 'multiple_flights',
          adjustmentType:
            handicap.type === 'fixed_fee'
              ? 'fixed_amount'
              : (handicap.type as 'percentage' | 'fixed_amount'),
          value: handicap.value,
          description: handicap.description || '',
        }),
      );

      setLocationHandicaps(mappedHandicaps);
    } catch (err) {
      console.error('Error fetching location handicaps:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load location handicaps',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingHandicap(null);
    setFormData({
      name: '',
      handicapType: 'stairs',
      adjustmentType: 'fixed_amount',
      value: 0,
      description: '',
    });
    setShowForm(true);
  };

  const handleEdit = (handicap: LocationHandicap) => {
    setEditingHandicap(handicap);
    setFormData({
      name: handicap.name,
      handicapType: handicap.handicapType,
      adjustmentType: handicap.adjustmentType,
      value: handicap.value,
      description: handicap.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const handicap = locationHandicaps.find((h) => h.id === id);
    if (
      !handicap ||
      !window.confirm(`Are you sure you want to delete "${handicap.name}"?`)
    ) {
      return;
    }

    if (!tariffSettingsId) {
      alert('Tariff settings not loaded. Please refresh the page.');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/tariff-settings/${tariffSettingsId}/handicaps/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to delete location handicap',
        );
      }

      // Refresh data from API
      await fetchHandicaps();
    } catch (err) {
      console.error('Error deleting location handicap:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to delete location handicap',
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tariffSettingsId) {
      alert('Tariff settings not loaded. Please refresh the page.');
      return;
    }

    try {
      // Map component state to API format
      const apiHandicap = {
        name: formData.name,
        description: formData.description || '',
        category: formData.handicapType,
        type:
          formData.adjustmentType === 'fixed_amount'
            ? 'fixed_fee'
            : formData.adjustmentType,
        value: formData.value,
        unit:
          formData.adjustmentType === 'fixed_amount' ? 'dollars' : 'percentage',
        isActive: true,
        appliesTo: ['pickup', 'delivery'] as ('pickup' | 'delivery' | 'both')[],
        notes: formData.description || '',
      };

      if (editingHandicap) {
        // Update existing handicap
        const response = await fetch(
          `${API_BASE_URL}/tariff-settings/${tariffSettingsId}/handicaps/${editingHandicap.id}`,
          {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(apiHandicap),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 'Failed to update location handicap',
          );
        }
      } else {
        // Add new handicap
        const response = await fetch(
          `${API_BASE_URL}/tariff-settings/${tariffSettingsId}/handicaps`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(apiHandicap),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 'Failed to create location handicap',
          );
        }
      }

      // Refresh data from API
      await fetchHandicaps();

      setShowForm(false);
      setFormData({
        name: '',
        handicapType: 'stairs',
        adjustmentType: 'fixed_amount',
        value: 0,
        description: '',
      });
      setEditingHandicap(null);
    } catch (err) {
      console.error('Error saving location handicap:', err);
      alert(
        err instanceof Error ? err.message : 'Failed to save location handicap',
      );
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      name: '',
      handicapType: 'stairs',
      adjustmentType: 'fixed_amount',
      value: 0,
      description: '',
    });
    setEditingHandicap(null);
  };

  const formatHandicapType = (type: string) => {
    return handicapTypes.find((t) => t.value === type)?.label || type;
  };

  const formatValue = (value: number, adjustmentType: string) => {
    if (adjustmentType === 'percentage') {
      return `+${value}%`;
    } else {
      return `+$${value}`;
    }
  };

  if (loading) {
    return (
      <div className={styles.locationHandicaps}>
        <div className={styles.loadingState}>
          <p>Loading location handicaps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.locationHandicaps}>
        <div className={styles.errorState}>
          <p>Error: {error}</p>
          <button onClick={fetchHandicaps} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.locationHandicaps}>
      <div className={styles.header}>
        <div>
          <h3>Location Handicaps</h3>
          <p>
            Configure pricing adjustments for location-based challenges and
            access difficulties
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className={styles.addButton}
          disabled={showForm}
        >
          + New Location Handicap
        </button>
      </div>

      {showForm && (
        <div className={styles.formContainer}>
          <div className={styles.formCard}>
            <h4>
              {editingHandicap
                ? 'Edit Location Handicap'
                : 'New Location Handicap'}
            </h4>
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
                    placeholder="e.g., Stairs at Pickup/Delivery"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="handicapType">Handicap Type</label>
                  <select
                    id="handicapType"
                    value={formData.handicapType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        handicapType: e.target.value as
                          | 'stairs'
                          | 'long_carry'
                          | 'elevator'
                          | 'parking_distance'
                          | 'access_difficulty'
                          | 'no_elevator'
                          | 'multiple_flights',
                      })
                    }
                    className={styles.select}
                    required
                  >
                    {handicapTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="adjustmentType">Adjustment Type</label>
                  <select
                    id="adjustmentType"
                    value={formData.adjustmentType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        adjustmentType: e.target.value as
                          | 'percentage'
                          | 'fixed_amount',
                      })
                    }
                    className={styles.select}
                    required
                  >
                    {adjustmentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="value">
                    {formData.adjustmentType === 'percentage'
                      ? 'Percentage (%)'
                      : 'Amount ($)'}
                  </label>
                  <input
                    id="value"
                    type="number"
                    min="0"
                    step={
                      formData.adjustmentType === 'percentage' ? '0.1' : '0.01'
                    }
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder={
                      formData.adjustmentType === 'percentage' ? '10' : '50.00'
                    }
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
                    placeholder="Add a description for this location handicap..."
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
                  {editingHandicap ? 'Update Handicap' : 'Create Handicap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        {locationHandicaps.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No location handicaps configured yet.</p>
            <button onClick={handleAddNew} className={styles.emptyStateButton}>
              + Create Your First Location Handicap
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Handicap Type</th>
                <th>Adjustment</th>
                <th className={styles.actionsColumn}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locationHandicaps.map((handicap) => (
                <tr key={handicap.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.handicapName}>
                        {handicap.name}
                      </span>
                      {handicap.description && (
                        <span className={styles.handicapDescription}>
                          {handicap.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.typeTag}>
                      {formatHandicapType(handicap.handicapType)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.adjustmentValue}>
                      {formatValue(handicap.value, handicap.adjustmentType)}
                    </span>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(handicap)}
                        className={styles.editButton}
                        title="Edit handicap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(handicap.id)}
                        className={styles.deleteButton}
                        title="Delete handicap"
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
        <h4>Location Handicap Types</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h5>Stairs</h5>
            <p>
              Per-flight charges for stairs when elevator access is unavailable.
              Accounts for additional labor and time required.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Long Carry</h5>
            <p>
              Extra charges when the carrying distance from parking to entrance
              exceeds 75 feet, requiring additional effort.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>No Elevator Access</h5>
            <p>
              Percentage surcharge for multi-story buildings without elevator
              service, significantly increasing move difficulty.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Parking Distance</h5>
            <p>
              Additional fees when parking is more than 50 feet from the
              building entrance, causing logistical challenges.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Access Difficulty</h5>
            <p>
              Surcharge for locations with narrow hallways, tight corners, or
              other physical access limitations.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Elevator Issues</h5>
            <p>
              Time-based charges when elevator availability, capacity, or wait
              times cause delays during the move.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Multiple Flights</h5>
            <p>
              Flat fee for carrying heavy items up or down three or more flights
              of stairs without elevator assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
