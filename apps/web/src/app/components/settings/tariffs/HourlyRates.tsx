'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from './HourlyRates.module.css';

interface HourlyRateEntry {
  crewSize: number;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

interface HourlyRatesData {
  enabled: boolean;
  minHours: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  rates: HourlyRateEntry[];
  autoAssignResources: boolean;
}

export default function HourlyRates() {
  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  const crewSizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // All crew sizes from backend

  const [tariffId, setTariffId] = useState<string | null>(null);
  const [hourlyRates, setHourlyRates] = useState<HourlyRatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    day: string;
    crewSize: number;
  } | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Fetch tariff settings on mount
  useEffect(() => {
    fetchHourlyRates();
  }, []);

  const fetchHourlyRates = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('tariff-settings/active'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tariff settings');
      }

      const data = await response.json();
      setTariffId(data._id);
      setHourlyRates(data.hourlyRates);
    } catch (err: any) {
      setError(err.message || 'Failed to load hourly rates');
      console.error('Error fetching hourly rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const getRateForCrewAndDay = (crewSize: number, day: string): number => {
    if (!hourlyRates) return 0;
    const rateEntry = hourlyRates.rates.find((r) => r.crewSize === crewSize);
    return rateEntry ? (rateEntry[day as keyof HourlyRateEntry] as number) : 0;
  };

  const getMinHoursForDay = (day: string): number => {
    if (!hourlyRates) return 2;
    return hourlyRates.minHours[day as keyof typeof hourlyRates.minHours];
  };

  const handleCellEdit = (
    day: string,
    crewSize: number,
    currentValue: number,
  ) => {
    setEditingCell({ day, crewSize });
    setTempValue(currentValue.toString());
  };

  const handleCellSave = async () => {
    if (!editingCell || !tariffId || !hourlyRates) return;

    const newRate = parseFloat(tempValue);
    if (isNaN(newRate) || newRate < 0) {
      setEditingCell(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('access_token');

      // Update the rates array with the new value
      const updatedRates = hourlyRates.rates.map((rateEntry) => {
        if (rateEntry.crewSize === editingCell.crewSize) {
          return {
            ...rateEntry,
            [editingCell.day]: newRate,
          };
        }
        return rateEntry;
      });

      const response = await fetch(
        getApiUrl(`tariff-settings/${tariffId}/hourly-rates`),
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rates: updatedRates,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update hourly rates');
      }

      const data = await response.json();
      setHourlyRates(data.hourlyRates);
      setSuccessMessage('Rate updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      console.error('Error updating hourly rates:', err);
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

  const applyToAllDays = (day: string, crewSize: number) => {
    const rate = getRateForCrewAndDay(crewSize, day);
    const confirm = window.confirm(
      `Apply $${rate}/hour to ${formatDay(day)} rate for all crew sizes?`,
    );

    if (confirm && hourlyRates && tariffId) {
      const updatedRates = hourlyRates.rates.map((rateEntry) => ({
        ...rateEntry,
        [day]: rate,
      }));

      updateAllRates(updatedRates);
    }
  };

  const updateAllRates = async (updatedRates: HourlyRateEntry[]) => {
    if (!tariffId) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        getApiUrl(`tariff-settings/${tariffId}/hourly-rates`),
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rates: updatedRates,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update hourly rates');
      }

      const data = await response.json();
      setHourlyRates(data.hourlyRates);
      setSuccessMessage('Rates updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      console.error('Error updating hourly rates:', err);
    } finally {
      setSaving(false);
    }
  };

  const exportRates = () => {
    if (!hourlyRates) return;

    const csvContent = [
      ['Crew Size', ...daysOfWeek.map((d) => formatDay(d))].join(','),
      ...hourlyRates.rates.map((rateEntry) =>
        [
          rateEntry.crewSize,
          ...daysOfWeek.map((day) => rateEntry[day as keyof HourlyRateEntry]),
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hourly-rates-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.hourlyRates}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading hourly rates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.hourlyRates}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>❌ {error}</p>
          <button onClick={fetchHourlyRates} className={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hourlyRates) {
    return (
      <div className={styles.hourlyRates}>
        <div className={styles.errorContainer}>
          <p>No hourly rates configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.hourlyRates}>
      <div className={styles.header}>
        <div>
          <h3>Hourly Moving Rates</h3>
          <p>Configure hourly rates by crew size and day of week</p>
          {successMessage && (
            <p className={styles.successMessage}>✅ {successMessage}</p>
          )}
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={exportRates}
            className={styles.exportButton}
            disabled={saving}
          >
            📥 Export Rates
          </button>
          <button
            onClick={fetchHourlyRates}
            className={styles.refreshButton}
            disabled={saving}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className={styles.ratesContainer}>
        <div className={styles.ratesTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.dayHeader}>Day</th>
                {crewSizes.map((size) => (
                  <th key={size} className={styles.crewHeader}>
                    <div className={styles.crewSize}>
                      <span>{size}-Person</span>
                      <span className={styles.crewIcon}>
                        {size <= 4 ? '👤'.repeat(size) : `👥${size}`}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((day) => (
                <tr key={day} className={styles.dayRow}>
                  <td className={styles.dayCell}>
                    <div className={styles.dayInfo}>
                      <span className={styles.dayName}>{formatDay(day)}</span>
                      <span className={styles.dayAbbr}>
                        {day.slice(0, 3).toUpperCase()}
                      </span>
                      <span className={styles.minHours}>
                        Min: {getMinHoursForDay(day)}h
                      </span>
                    </div>
                  </td>
                  {crewSizes.map((crewSize) => {
                    const rate = getRateForCrewAndDay(crewSize, day);
                    const isEditing =
                      editingCell?.day === day &&
                      editingCell?.crewSize === crewSize;

                    return (
                      <td key={crewSize} className={styles.rateCell}>
                        <div className={styles.rateContainer}>
                          <div className={styles.rate}>
                            <div className={styles.rateValue}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyPress}
                                  className={styles.rateInput}
                                  autoFocus
                                  disabled={saving}
                                />
                              ) : (
                                <button
                                  className={styles.rateButton}
                                  onClick={() =>
                                    handleCellEdit(day, crewSize, rate)
                                  }
                                  onDoubleClick={() =>
                                    applyToAllDays(day, crewSize)
                                  }
                                  title="Click to edit, double-click to apply to all days"
                                  disabled={saving}
                                >
                                  ${rate}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.legend}>
          <h4>Rate Guidelines</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <span
                className={styles.legendColor}
                style={{ backgroundColor: 'var(--color-primary)' }}
              ></span>
              <span>Hourly rates are per hour of labor</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={styles.legendColor}
                style={{ backgroundColor: 'var(--color-success)' }}
              ></span>
              <span>Minimum hours ensure profitability for short jobs</span>
            </div>
          </div>

          <div className={styles.tips}>
            <h5>Tips:</h5>
            <ul>
              <li>Click on a rate to edit it individually</li>
              <li>
                Double-click to apply that rate to all days for that crew size
              </li>
              <li>
                Weekend rates are typically 10-20% higher than weekday rates
              </li>
              <li>Minimum hours vary by day (shown under each day name)</li>
              <li>Changes are saved immediately to the database</li>
            </ul>
          </div>

          <div className={styles.statusIndicator}>
            {saving && (
              <p className={styles.savingText}>💾 Saving changes...</p>
            )}
            {!saving && hourlyRates.enabled && (
              <p className={styles.enabledText}>✅ Hourly rates are enabled</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
