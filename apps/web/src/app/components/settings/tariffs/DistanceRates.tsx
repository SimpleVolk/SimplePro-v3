'use client';

import { useState } from 'react';
import styles from './DistanceRates.module.css';

interface DistanceRate {
  id: string;
  name: string;
  type: 'by_weight' | 'by_distance' | 'flat_rate';
  description?: string;
}

export default function DistanceRates() {
  const [distanceRates, setDistanceRates] = useState<DistanceRate[]>([
    {
      id: '1',
      name: 'Distance Rates',
      type: 'by_weight',
      description: 'Weight-based distance pricing',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<DistanceRate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'by_weight' as 'by_weight' | 'by_distance' | 'flat_rate',
    description: '',
  });

  const rateTypes = [
    { value: 'by_weight', label: 'By Weight' },
    { value: 'by_distance', label: 'By Distance' },
    { value: 'flat_rate', label: 'Flat Rate' },
  ];

  const handleAddNew = () => {
    setEditingRate(null);
    setFormData({ name: '', type: 'by_weight', description: '' });
    setShowForm(true);
  };

  const handleEdit = (rate: DistanceRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      type: rate.type,
      description: rate.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const rate = distanceRates.find((r) => r.id === id);
    if (
      rate &&
      window.confirm(`Are you sure you want to delete "${rate.name}"?`)
    ) {
      setDistanceRates(distanceRates.filter((r) => r.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRate) {
      // Update existing rate
      setDistanceRates(
        distanceRates.map((rate) =>
          rate.id === editingRate.id ? { ...rate, ...formData } : rate,
        ),
      );
    } else {
      // Add new rate
      const newRate: DistanceRate = {
        id: Date.now().toString(),
        ...formData,
      };
      setDistanceRates([...distanceRates, newRate]);
    }

    setShowForm(false);
    setFormData({ name: '', type: 'by_weight', description: '' });
    setEditingRate(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: '', type: 'by_weight', description: '' });
    setEditingRate(null);
  };

  const formatType = (type: string) => {
    return rateTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className={styles.distanceRates}>
      <div className={styles.header}>
        <div>
          <h3>Distance Rates</h3>
          <p>Configure distance-based pricing rates for long-distance moves</p>
        </div>
        <button
          onClick={handleAddNew}
          className={styles.addButton}
          disabled={showForm}
        >
          + New Distance Rate
        </button>
      </div>

      {showForm && (
        <div className={styles.formContainer}>
          <div className={styles.formCard}>
            <h4>{editingRate ? 'Edit Distance Rate' : 'New Distance Rate'}</h4>
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
                    placeholder="e.g., Distance Rates"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as
                          | 'by_weight'
                          | 'by_distance'
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
                    placeholder="Add a description for this rate configuration..."
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
        {distanceRates.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No distance rates configured yet.</p>
            <button onClick={handleAddNew} className={styles.emptyStateButton}>
              + Create Your First Distance Rate
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th className={styles.actionsColumn}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {distanceRates.map((rate) => (
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
                      {formatType(rate.type)}
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
        <h4>Distance Rate Types</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h5>By Weight</h5>
            <p>
              Pricing based on total shipment weight and distance traveled.
              Common for long-distance moves.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>By Distance</h5>
            <p>
              Flat rate per mile regardless of weight. Suitable for standardized
              pricing structures.
            </p>
          </div>
          <div className={styles.infoCard}>
            <h5>Flat Rate</h5>
            <p>
              Single fixed price for distance moves within specific ranges.
              Simple and predictable pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
