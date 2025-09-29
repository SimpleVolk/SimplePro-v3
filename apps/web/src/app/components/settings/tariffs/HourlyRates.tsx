'use client';

import { useState } from 'react';
import styles from './HourlyRates.module.css';


interface RateMatrix {
  [key: string]: { [crewSize: number]: { standard: number; peak: number } };
}

export default function HourlyRates() {
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const crewSizes = [1, 2, 3, 4];

  const [rateMatrix, setRateMatrix] = useState<RateMatrix>({
    monday: { 1: { standard: 75, peak: 90 }, 2: { standard: 140, peak: 170 }, 3: { standard: 200, peak: 240 }, 4: { standard: 250, peak: 300 } },
    tuesday: { 1: { standard: 75, peak: 90 }, 2: { standard: 140, peak: 170 }, 3: { standard: 200, peak: 240 }, 4: { standard: 250, peak: 300 } },
    wednesday: { 1: { standard: 75, peak: 90 }, 2: { standard: 140, peak: 170 }, 3: { standard: 200, peak: 240 }, 4: { standard: 250, peak: 300 } },
    thursday: { 1: { standard: 75, peak: 90 }, 2: { standard: 140, peak: 170 }, 3: { standard: 200, peak: 240 }, 4: { standard: 250, peak: 300 } },
    friday: { 1: { standard: 85, peak: 100 }, 2: { standard: 160, peak: 190 }, 3: { standard: 230, peak: 270 }, 4: { standard: 290, peak: 340 } },
    saturday: { 1: { standard: 95, peak: 110 }, 2: { standard: 180, peak: 210 }, 3: { standard: 260, peak: 300 }, 4: { standard: 330, peak: 380 } },
    sunday: { 1: { standard: 100, peak: 120 }, 2: { standard: 190, peak: 230 }, 3: { standard: 280, peak: 330 }, 4: { standard: 360, peak: 420 } }
  });

  const [showPeakRates, setShowPeakRates] = useState(true);
  const [editingCell, setEditingCell] = useState<{ day: string; crewSize: number; type: 'standard' | 'peak' } | null>(null);
  const [tempValue, setTempValue] = useState('');

  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const handleCellEdit = (day: string, crewSize: number, type: 'standard' | 'peak', currentValue: number) => {
    setEditingCell({ day, crewSize, type });
    setTempValue(currentValue.toString());
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const newRate = parseFloat(tempValue);
    if (isNaN(newRate) || newRate < 0) {
      setEditingCell(null);
      return;
    }

    setRateMatrix(prev => ({
      ...prev,
      [editingCell.day]: {
        ...prev[editingCell.day],
        [editingCell.crewSize]: {
          ...prev[editingCell.day][editingCell.crewSize],
          [editingCell.type]: newRate
        }
      }
    }));

    setEditingCell(null);
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

  const applyToAll = (day: string, crewSize: number, type: 'standard' | 'peak') => {
    const rate = rateMatrix[day][crewSize][type];
    const confirm = window.confirm(
      `Apply $${rate}/hour to all ${type === 'standard' ? 'standard' : 'peak'} rates for ${crewSize}-person crews?`
    );

    if (confirm) {
      setRateMatrix(prev => {
        const updated = { ...prev };
        daysOfWeek.forEach(d => {
          updated[d] = {
            ...updated[d],
            [crewSize]: {
              ...updated[d][crewSize],
              [type]: rate
            }
          };
        });
        return updated;
      });
    }
  };

  const exportRates = () => {
    const csvContent = [
      ['Day', ...crewSizes.flatMap(size => [`${size}-person Standard`, `${size}-person Peak`])].join(','),
      ...daysOfWeek.map(day => [
        formatDay(day),
        ...crewSizes.flatMap(size => [
          rateMatrix[day][size].standard,
          rateMatrix[day][size].peak
        ])
      ].join(','))
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

  return (
    <div className={styles.hourlyRates}>
      <div className={styles.header}>
        <div>
          <h3>Hourly Moving Rates</h3>
          <p>Configure hourly rates by crew size and day of week</p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showPeakRates}
              onChange={(e) => setShowPeakRates(e.target.checked)}
            />
            Show Peak Rates
          </label>
          <button onClick={exportRates} className={styles.exportButton}>
            📥 Export Rates
          </button>
        </div>
      </div>

      <div className={styles.ratesContainer}>
        <div className={styles.ratesTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.dayHeader}>Day</th>
                {crewSizes.map(size => (
                  <th key={size} className={styles.crewHeader}>
                    <div className={styles.crewSize}>
                      <span>{size}-Person Crew</span>
                      <span className={styles.crewIcon}>
                        {'👤'.repeat(size)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map(day => (
                <tr key={day} className={styles.dayRow}>
                  <td className={styles.dayCell}>
                    <span className={styles.dayName}>{formatDay(day)}</span>
                    <span className={styles.dayAbbr}>{day.slice(0, 3).toUpperCase()}</span>
                  </td>
                  {crewSizes.map(crewSize => (
                    <td key={crewSize} className={styles.rateCell}>
                      <div className={styles.rateContainer}>
                        {/* Standard Rate */}
                        <div className={styles.rate}>
                          <div className={styles.rateLabel}>Standard</div>
                          <div className={styles.rateValue}>
                            {editingCell?.day === day && editingCell?.crewSize === crewSize && editingCell?.type === 'standard' ? (
                              <input
                                type="number"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={handleCellSave}
                                onKeyDown={handleKeyPress}
                                className={styles.rateInput}
                                autoFocus
                              />
                            ) : (
                              <button
                                className={styles.rateButton}
                                onClick={() => handleCellEdit(day, crewSize, 'standard', rateMatrix[day][crewSize].standard)}
                                onDoubleClick={() => applyToAll(day, crewSize, 'standard')}
                                title="Click to edit, double-click to apply to all"
                              >
                                ${rateMatrix[day][crewSize].standard}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Peak Rate */}
                        {showPeakRates && (
                          <div className={styles.rate}>
                            <div className={styles.rateLabel}>Peak</div>
                            <div className={styles.rateValue}>
                              {editingCell?.day === day && editingCell?.crewSize === crewSize && editingCell?.type === 'peak' ? (
                                <input
                                  type="number"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyPress}
                                  className={styles.rateInput}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  className={`${styles.rateButton} ${styles.peakRate}`}
                                  onClick={() => handleCellEdit(day, crewSize, 'peak', rateMatrix[day][crewSize].peak)}
                                  onDoubleClick={() => applyToAll(day, crewSize, 'peak')}
                                  title="Click to edit, double-click to apply to all"
                                >
                                  ${rateMatrix[day][crewSize].peak}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.legend}>
          <h4>Rate Guidelines</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: 'var(--color-primary)' }}></span>
              <span>Standard rates apply during normal business hours</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: 'var(--color-warning)' }}></span>
              <span>Peak rates apply during high-demand periods (holidays, weekends)</span>
            </div>
          </div>

          <div className={styles.tips}>
            <h5>Tips:</h5>
            <ul>
              <li>Click on a rate to edit it</li>
              <li>Double-click to apply the same rate to all days for that crew size</li>
              <li>Weekend rates are typically 15-20% higher</li>
              <li>Peak rates apply during busy seasons and holidays</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}