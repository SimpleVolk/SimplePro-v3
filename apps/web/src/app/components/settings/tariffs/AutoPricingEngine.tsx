'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from './AutoPricingEngine.module.css';

interface CrewAbilityEntry {
  crewSize: number;
  maxCubicFeet: number;
}

interface CrewRequiredEntry {
  minCubicFeet: number;
  crewSize: number;
}

interface TrucksRequiredEntry {
  minCubicFeet: number;
  truckCount: number;
}

interface AutoPricing {
  crewAbility: CrewAbilityEntry[];
  crewRequired: CrewRequiredEntry[];
  trucksRequired: TrucksRequiredEntry[];
}

export default function AutoPricingEngine() {
  const [tariffId, setTariffId] = useState<string | null>(null);
  const [autoPricing, setAutoPricing] = useState<AutoPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ table: string; index: number; field: string } | null>(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    fetchAutoPricing();
  }, []);

  const fetchAutoPricing = async () => {
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
      setAutoPricing(data.autoPricing);
    } catch (err: any) {
      setError(err.message || 'Failed to load auto-pricing settings');
      console.error('Error fetching auto-pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (table: string, index: number, field: string, currentValue: number) => {
    setEditingCell({ table, index, field });
    setTempValue(currentValue.toString());
  };

  const handleCellSave = async () => {
    if (!editingCell || !tariffId || !autoPricing) return;

    const newValue = parseInt(tempValue) || parseFloat(tempValue);
    if (isNaN(newValue) || newValue < 0) {
      setEditingCell(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('access_token');

      // Clone the auto-pricing data and update the specific value
      const updatedAutoPricing = JSON.parse(JSON.stringify(autoPricing));
      const table = updatedAutoPricing[editingCell.table];

      if (table && table[editingCell.index]) {
        table[editingCell.index][editingCell.field] = newValue;
      }

      const response = await fetch(
        getApiUrl(`tariff-settings/${tariffId}/auto-pricing`),
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedAutoPricing)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update auto-pricing settings');
      }

      const data = await response.json();
      setAutoPricing(data.autoPricing);
      setSuccessMessage('Auto-pricing updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      console.error('Error updating auto-pricing:', err);
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setTempValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  if (loading) {
    return (
      <div className={styles.autoPricingEngine}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading auto-pricing settings...</p>
        </div>
      </div>
    );
  }

  if (error && !tariffId) {
    return (
      <div className={styles.autoPricingEngine}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>❌ {error}</p>
          <button onClick={fetchAutoPricing} className={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!autoPricing) {
    return (
      <div className={styles.autoPricingEngine}>
        <div className={styles.errorContainer}>
          <p>No auto-pricing settings configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.autoPricingEngine}>
      <div className={styles.header}>
        <div>
          <h3>Auto-Pricing Engine</h3>
          <p>Configure automated crew and truck assignments based on move volume</p>
          {successMessage && (
            <p className={styles.successMessage}>✅ {successMessage}</p>
          )}
          {error && (
            <p className={styles.errorMessage}>❌ {error}</p>
          )}
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={fetchAutoPricing}
            className={styles.refreshButton}
            disabled={saving}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Crew Ability Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Crew Ability</h4>
          <p>Maximum cubic feet each crew size can handle</p>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Crew Size</th>
                {autoPricing.crewAbility.map((entry, idx) => (
                  <th key={idx}>{entry.crewSize}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.labelCell}>Max Cuft</td>
                {autoPricing.crewAbility.map((entry, idx) => {
                  const isEditing = editingCell?.table === 'crewAbility' &&
                                    editingCell?.index === idx &&
                                    editingCell?.field === 'maxCubicFeet';

                  return (
                    <td key={idx} className={styles.valueCell}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyPress}
                          className={styles.cellInput}
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <button
                          className={styles.cellButton}
                          onClick={() => handleCellEdit('crewAbility', idx, 'maxCubicFeet', entry.maxCubicFeet)}
                          disabled={saving}
                          title="Click to edit"
                        >
                          {entry.maxCubicFeet}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Crew Required Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Crew Required</h4>
          <p>Minimum crew size required based on move volume</p>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Min Cubic Feet</th>
                <th>Crew Size</th>
              </tr>
            </thead>
            <tbody>
              {autoPricing.crewRequired.map((entry, idx) => {
                const isEditingMinCuft = editingCell?.table === 'crewRequired' &&
                                          editingCell?.index === idx &&
                                          editingCell?.field === 'minCubicFeet';
                const isEditingCrewSize = editingCell?.table === 'crewRequired' &&
                                           editingCell?.index === idx &&
                                           editingCell?.field === 'crewSize';

                return (
                  <tr key={idx}>
                    <td className={styles.valueCell}>
                      {isEditingMinCuft ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyPress}
                          className={styles.cellInput}
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <button
                          className={styles.cellButton}
                          onClick={() => handleCellEdit('crewRequired', idx, 'minCubicFeet', entry.minCubicFeet)}
                          disabled={saving}
                          title="Click to edit"
                        >
                          {entry.minCubicFeet}
                        </button>
                      )}
                    </td>
                    <td className={styles.valueCell}>
                      {isEditingCrewSize ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyPress}
                          className={styles.cellInput}
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <button
                          className={styles.cellButton}
                          onClick={() => handleCellEdit('crewRequired', idx, 'crewSize', entry.crewSize)}
                          disabled={saving}
                          title="Click to edit"
                        >
                          {entry.crewSize}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trucks Required Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Trucks Required</h4>
          <p>Number of trucks needed based on move volume</p>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Min Cubic Feet</th>
                <th>Truck Count</th>
              </tr>
            </thead>
            <tbody>
              {autoPricing.trucksRequired.map((entry, idx) => {
                const isEditingMinCuft = editingCell?.table === 'trucksRequired' &&
                                          editingCell?.index === idx &&
                                          editingCell?.field === 'minCubicFeet';
                const isEditingTruckCount = editingCell?.table === 'trucksRequired' &&
                                             editingCell?.index === idx &&
                                             editingCell?.field === 'truckCount';

                return (
                  <tr key={idx}>
                    <td className={styles.valueCell}>
                      {isEditingMinCuft ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyPress}
                          className={styles.cellInput}
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <button
                          className={styles.cellButton}
                          onClick={() => handleCellEdit('trucksRequired', idx, 'minCubicFeet', entry.minCubicFeet)}
                          disabled={saving}
                          title="Click to edit"
                        >
                          {entry.minCubicFeet}
                        </button>
                      )}
                    </td>
                    <td className={styles.valueCell}>
                      {isEditingTruckCount ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyPress}
                          className={styles.cellInput}
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <button
                          className={styles.cellButton}
                          onClick={() => handleCellEdit('trucksRequired', idx, 'truckCount', entry.truckCount)}
                          disabled={saving}
                          title="Click to edit"
                        >
                          {entry.truckCount}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend and Tips */}
      <div className={styles.legend}>
        <h4>How Auto-Pricing Works</h4>
        <div className={styles.tips}>
          <ul>
            <li><strong>Crew Ability:</strong> Defines the maximum volume each crew size can handle efficiently</li>
            <li><strong>Crew Required:</strong> Automatically assigns the appropriate crew size based on total move volume</li>
            <li><strong>Trucks Required:</strong> Calculates the number of trucks needed based on total cubic feet</li>
            <li><strong>Tip:</strong> Click any value to edit it. Press Enter to save or Escape to cancel</li>
            <li><strong>Note:</strong> Changes are applied immediately to all new estimates</li>
          </ul>
        </div>

        {saving && (
          <div className={styles.statusIndicator}>
            <p className={styles.savingText}>💾 Saving changes...</p>
          </div>
        )}
      </div>
    </div>
  );
}