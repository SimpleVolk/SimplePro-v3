'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from './MaterialsPricing.module.css';

interface Material {
  _id?: string;
  name: string;
  description: string;
  dimensions: {
    cubicFeet: number;
  };
  packTime: number;
  unpackTime: number;
  cpShortCode: string;
  proShortCode: string;
  cost: number;
  isContainer: boolean;
}

export default function MaterialsPricing() {
  const [tariffId, setTariffId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<Material>({
    name: '',
    description: '',
    dimensions: { cubicFeet: 0 },
    packTime: 0,
    unpackTime: 0,
    cpShortCode: '',
    proShortCode: '',
    cost: 0,
    isContainer: false,
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('tariff-settings/active'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tariff settings');
      }

      const data = await response.json();
      setTariffId(data._id);
      setMaterials(data.materials || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setFormData({
      name: '',
      description: '',
      dimensions: { cubicFeet: 0 },
      packTime: 0,
      unpackTime: 0,
      cpShortCode: '',
      proShortCode: '',
      cost: 0,
      isContainer: false,
    });
    setShowAddForm(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setFormData({ ...material });
    setShowAddForm(true);
  };

  const handleSaveMaterial = async () => {
    if (!tariffId) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('access_token');
      const endpoint = editingMaterial?._id
        ? `tariff-settings/${tariffId}/materials/${editingMaterial._id}`
        : `tariff-settings/${tariffId}/materials`;

      const method = editingMaterial?._id ? 'PUT' : 'POST';

      const response = await fetch(getApiUrl(endpoint), {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingMaterial ? 'update' : 'create'} material`);
      }

      const data = await response.json();
      setMaterials(data.materials);
      setSuccessMessage(editingMaterial ? 'Material updated successfully' : 'Material added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save material');
      console.error('Error saving material:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!tariffId) return;
    if (!confirm('Are you sure you want to delete this material?')) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        getApiUrl(`tariff-settings/${tariffId}/materials/${materialId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete material');
      }

      const data = await response.json();
      setMaterials(data.materials);
      setSuccessMessage('Material deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete material');
      console.error('Error deleting material:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: string, value: any) => {
    if (field === 'cubicFeet') {
      setFormData({
        ...formData,
        dimensions: { cubicFeet: parseFloat(value) || 0 }
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className={styles.materialsPricing}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading materials...</p>
        </div>
      </div>
    );
  }

  if (error && !tariffId) {
    return (
      <div className={styles.materialsPricing}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>❌ {error}</p>
          <button onClick={fetchMaterials} className={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.materialsPricing}>
      <div className={styles.header}>
        <div>
          <h3>Materials Pricing</h3>
          <p>Configure packing materials, boxes, and supplies</p>
          {successMessage && (
            <p className={styles.successMessage}>✅ {successMessage}</p>
          )}
          {error && (
            <p className={styles.errorMessage}>❌ {error}</p>
          )}
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={handleAddMaterial}
            className={styles.addButton}
            disabled={saving}
          >
            ➕ Add Material
          </button>
          <button
            onClick={fetchMaterials}
            className={styles.refreshButton}
            disabled={saving}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>{editingMaterial ? 'Edit Material' : 'Add New Material'}</h4>
              <button
                onClick={() => setShowAddForm(false)}
                className={styles.closeButton}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Material Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="e.g., Small Box"
                  disabled={saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="e.g., 1.5 Cuft"
                  disabled={saving}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Cubic Feet *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.dimensions.cubicFeet}
                    onChange={(e) => handleFormChange('cubicFeet', e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleFormChange('cost', parseFloat(e.target.value) || 0)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Pack Time (min) *</label>
                  <input
                    type="number"
                    value={formData.packTime}
                    onChange={(e) => handleFormChange('packTime', parseInt(e.target.value) || 0)}
                    disabled={saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Unpack Time (min) *</label>
                  <input
                    type="number"
                    value={formData.unpackTime}
                    onChange={(e) => handleFormChange('unpackTime', parseInt(e.target.value) || 0)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>CP Short Code *</label>
                  <input
                    type="text"
                    value={formData.cpShortCode}
                    onChange={(e) => handleFormChange('cpShortCode', e.target.value)}
                    placeholder="e.g., 503"
                    disabled={saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Pro Short Code *</label>
                  <input
                    type="text"
                    value={formData.proShortCode}
                    onChange={(e) => handleFormChange('proShortCode', e.target.value)}
                    placeholder="e.g., 504"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isContainer}
                    onChange={(e) => handleFormChange('isContainer', e.target.checked)}
                    disabled={saving}
                  />
                  <span>Is Container (box, crate, etc.)</span>
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowAddForm(false)}
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMaterial}
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? 'Saving...' : (editingMaterial ? 'Update' : 'Add')} Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Material</th>
              <th>Size</th>
              <th>Cost</th>
              <th>Pack Time</th>
              <th>Unpack Time</th>
              <th>CP Code</th>
              <th>Pro Code</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  <div className={styles.emptyContent}>
                    <p>📦 No materials configured yet</p>
                    <button onClick={handleAddMaterial} className={styles.addButton}>
                      ➕ Add Your First Material
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              materials.map((material) => (
                <tr key={material._id}>
                  <td>
                    <div className={styles.materialName}>
                      <strong>{material.name}</strong>
                      <span className={styles.materialDesc}>{material.description}</span>
                    </div>
                  </td>
                  <td>{material.dimensions.cubicFeet} cf</td>
                  <td>${material.cost.toFixed(2)}</td>
                  <td>{material.packTime} min</td>
                  <td>{material.unpackTime} min</td>
                  <td>{material.cpShortCode}</td>
                  <td>{material.proShortCode}</td>
                  <td>
                    <span className={material.isContainer ? styles.containerBadge : styles.itemBadge}>
                      {material.isContainer ? '📦 Container' : '🧰 Item'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEditMaterial(material)}
                        className={styles.editButton}
                        disabled={saving}
                        title="Edit material"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => material._id && handleDeleteMaterial(material._id)}
                        className={styles.deleteButton}
                        disabled={saving}
                        title="Delete material"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <h4>Material Types</h4>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={styles.containerBadge}>📦 Container</span>
            <span>Boxes, crates, and containers for packing items</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.itemBadge}>🧰 Item</span>
            <span>Supplies like tape, bubble wrap, and padding materials</span>
          </div>
        </div>
        <div className={styles.tips}>
          <h5>Tips:</h5>
          <ul>
            <li>Pack/Unpack times help estimate labor requirements</li>
            <li>Short codes are used for quick reference in estimates</li>
            <li>Cost can be $0 if materials are provided free</li>
            <li>Container types affect volume calculations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}