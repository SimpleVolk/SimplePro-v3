'use client';

import { useState } from 'react';
import { DeterministicEstimator, defaultRules } from '@simplepro/pricing-engine';
import type { EstimateInput, EstimateResult } from '@simplepro/pricing-engine';
import styles from './EstimateForm.module.css';

interface EstimateFormProps {
  onEstimateComplete: (result: EstimateResult) => void;
}

export function EstimateForm({ onEstimateComplete }: EstimateFormProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<EstimateInput>>({
    customerId: 'web-customer-001',
    moveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    service: 'local',
    crewSize: 2,
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
    specialtyCrewRequired: false,
    pickup: {
      address: '',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    delivery: {
      address: '',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false
    },
    totalWeight: 2000,
    totalVolume: 400,
    distance: 10,
    estimatedDuration: 4,
    specialItems: {
      piano: false,
      antiques: false,
      artwork: false,
      fragileItems: 0,
      valuableItems: 0
    },
    additionalServices: {
      packing: false,
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false
    },
    rooms: []
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required field validation
    if (!formData.pickup?.address?.trim()) {
      errors.pickupAddress = 'Pickup address is required';
    }
    if (!formData.delivery?.address?.trim()) {
      errors.deliveryAddress = 'Delivery address is required';
    }
    if (!formData.totalWeight || formData.totalWeight <= 0) {
      errors.totalWeight = 'Total weight must be greater than 0';
    }
    if (!formData.totalVolume || formData.totalVolume <= 0) {
      errors.totalVolume = 'Total volume must be greater than 0';
    }
    if (!formData.distance || formData.distance <= 0) {
      errors.distance = 'Distance must be greater than 0';
    }
    if (!formData.estimatedDuration || formData.estimatedDuration <= 0) {
      errors.estimatedDuration = 'Estimated duration must be greater than 0';
    }
    if (!formData.crewSize || formData.crewSize < 1) {
      errors.crewSize = 'Crew size must be at least 1';
    }

    // Business logic validation
    if (formData.totalWeight && formData.totalWeight > 50000) {
      errors.totalWeight = 'Maximum weight is 50,000 lbs. Please contact us for larger moves.';
    }
    if (formData.crewSize && formData.crewSize > 8) {
      errors.crewSize = 'Maximum crew size is 8 members';
    }
    if (formData.distance && formData.distance > 2000) {
      errors.distance = 'Maximum distance is 2,000 miles. Please contact us for longer moves.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCalculating) return;

    // Clear previous errors
    setError(null);
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      setError('Please correct the highlighted errors before submitting.');
      return;
    }

    setIsCalculating(true);

    try {
      // Create basic room data if none provided
      const rooms = formData.rooms?.length ? formData.rooms : [{
        id: 'default-room',
        type: 'mixed',
        description: 'Combined room inventory',
        items: [],
        packingRequired: formData.additionalServices?.packing || false,
        totalWeight: formData.totalWeight || 0,
        totalVolume: formData.totalVolume || 0
      }];

      const estimateInput: EstimateInput = {
        ...formData,
        rooms,
        moveDate: new Date(formData.moveDate || ''),
      } as EstimateInput;

      const estimator = new DeterministicEstimator(
        defaultRules.pricingRules as any,
        defaultRules.locationHandicaps as any
      );

      const result = estimator.calculateEstimate(estimateInput, 'web-user');
      onEstimateComplete(result);

      // Clear any previous errors on success
      setError(null);
    } catch (error) {
      console.error('Error calculating estimate:', error);
      const errorMessage = error instanceof Error
        ? `Calculation failed: ${error.message}`
        : 'An unexpected error occurred while calculating your estimate. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const updateFormData = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: string, field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent as keyof typeof prev] as Record<string, unknown>), [field]: value }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Moving Estimate Calculator</h2>

      {/* Error Display */}
      {error && (
        <div className={styles.errorAlert}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className={styles.validationSummary}>
          <strong>Please correct the following errors:</strong>
          <ul>
            {Object.entries(validationErrors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.section}>
        <h3>Basic Information</h3>

        <div className={styles.field}>
          <label htmlFor="service">Service Type:</label>
          <select
            id="service"
            value={formData.service}
            onChange={(e) => updateFormData('service', e.target.value)}
            required
          >
            <option value="local">Local Move</option>
            <option value="long_distance">Long Distance</option>
            <option value="packing_only">Packing Only</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="moveDate">Move Date:</label>
          <input
            id="moveDate"
            type="date"
            value={typeof formData.moveDate === 'string' ? formData.moveDate : formData.moveDate?.toISOString().split('T')[0] || ''}
            onChange={(e) => updateFormData('moveDate', e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="distance">Distance (miles):</label>
          <input
            id="distance"
            type="number"
            value={formData.distance}
            onChange={(e) => updateFormData('distance', Number(e.target.value))}
            min="0"
            className={validationErrors.distance ? styles.fieldError : ''}
            required
          />
          {validationErrors.distance && (
            <div className={styles.errorMessage}>{validationErrors.distance}</div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3>Pickup Location</h3>

        <div className={styles.field}>
          <label htmlFor="pickupAddress">Address:</label>
          <input
            id="pickupAddress"
            type="text"
            value={formData.pickup?.address}
            onChange={(e) => updateNestedField('pickup', 'address', e.target.value)}
            placeholder="123 Main St, City, State ZIP"
            className={validationErrors.pickupAddress ? styles.fieldError : ''}
            required
          />
          {validationErrors.pickupAddress && (
            <div className={styles.errorMessage}>{validationErrors.pickupAddress}</div>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label htmlFor="pickupFloor">Floor Level:</label>
            <input
              id="pickupFloor"
              type="number"
              value={formData.pickup?.floorLevel}
              onChange={(e) => updateNestedField('pickup', 'floorLevel', Number(e.target.value))}
              min="1"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="pickupStairs">Stairs Count:</label>
            <input
              id="pickupStairs"
              type="number"
              value={formData.pickup?.stairsCount}
              onChange={(e) => updateNestedField('pickup', 'stairsCount', Number(e.target.value))}
              min="0"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="pickupAccess">Access Difficulty:</label>
          <select
            id="pickupAccess"
            value={formData.pickup?.accessDifficulty}
            onChange={(e) => updateNestedField('pickup', 'accessDifficulty', e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="difficult">Difficult</option>
            <option value="extreme">Extreme</option>
          </select>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Delivery Location</h3>

        <div className={styles.field}>
          <label htmlFor="deliveryAddress">Address:</label>
          <input
            id="deliveryAddress"
            type="text"
            value={formData.delivery?.address}
            onChange={(e) => updateNestedField('delivery', 'address', e.target.value)}
            placeholder="456 Oak Ave, City, State ZIP"
            className={validationErrors.deliveryAddress ? styles.fieldError : ''}
            required
          />
          {validationErrors.deliveryAddress && (
            <div className={styles.errorMessage}>{validationErrors.deliveryAddress}</div>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label htmlFor="deliveryFloor">Floor Level:</label>
            <input
              id="deliveryFloor"
              type="number"
              value={formData.delivery?.floorLevel}
              onChange={(e) => updateNestedField('delivery', 'floorLevel', Number(e.target.value))}
              min="1"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="deliveryStairs">Stairs Count:</label>
            <input
              id="deliveryStairs"
              type="number"
              value={formData.delivery?.stairsCount}
              onChange={(e) => updateNestedField('delivery', 'stairsCount', Number(e.target.value))}
              min="0"
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Inventory Details</h3>

        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label htmlFor="totalWeight">Total Weight (lbs):</label>
            <input
              id="totalWeight"
              type="number"
              value={formData.totalWeight}
              onChange={(e) => updateFormData('totalWeight', Number(e.target.value))}
              min="1"
              className={validationErrors.totalWeight ? styles.fieldError : ''}
              required
            />
            {validationErrors.totalWeight && (
              <div className={styles.errorMessage}>{validationErrors.totalWeight}</div>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="totalVolume">Total Volume (cu ft):</label>
            <input
              id="totalVolume"
              type="number"
              value={formData.totalVolume}
              onChange={(e) => updateFormData('totalVolume', Number(e.target.value))}
              min="1"
              className={validationErrors.totalVolume ? styles.fieldError : ''}
              required
            />
            {validationErrors.totalVolume && (
              <div className={styles.errorMessage}>{validationErrors.totalVolume}</div>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="crewSize">Crew Size:</label>
          <select
            id="crewSize"
            value={formData.crewSize}
            onChange={(e) => updateFormData('crewSize', Number(e.target.value))}
            className={validationErrors.crewSize ? styles.fieldError : ''}
          >
            <option value={2}>2 movers</option>
            <option value={3}>3 movers</option>
            <option value={4}>4 movers</option>
            <option value={5}>5+ movers</option>
          </select>
          {validationErrors.crewSize && (
            <div className={styles.errorMessage}>{validationErrors.crewSize}</div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3>Special Items</h3>

        <div className={styles.checkboxGroup}>
          <label>
            <input
              type="checkbox"
              checked={formData.specialItems?.piano}
              onChange={(e) => updateNestedField('specialItems', 'piano', e.target.checked)}
            />
            Piano
          </label>

          <label>
            <input
              type="checkbox"
              checked={formData.specialItems?.antiques}
              onChange={(e) => updateNestedField('specialItems', 'antiques', e.target.checked)}
            />
            Antiques
          </label>

          <label>
            <input
              type="checkbox"
              checked={formData.specialItems?.artwork}
              onChange={(e) => updateNestedField('specialItems', 'artwork', e.target.checked)}
            />
            Artwork
          </label>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label htmlFor="fragileItems">Fragile Items Count:</label>
            <input
              id="fragileItems"
              type="number"
              value={formData.specialItems?.fragileItems}
              onChange={(e) => updateNestedField('specialItems', 'fragileItems', Number(e.target.value))}
              min="0"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="valuableItems">Valuable Items Count:</label>
            <input
              id="valuableItems"
              type="number"
              value={formData.specialItems?.valuableItems}
              onChange={(e) => updateNestedField('specialItems', 'valuableItems', Number(e.target.value))}
              min="0"
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Additional Services</h3>

        <div className={styles.checkboxGroup}>
          <label>
            <input
              type="checkbox"
              checked={formData.additionalServices?.packing}
              onChange={(e) => updateNestedField('additionalServices', 'packing', e.target.checked)}
            />
            Packing
          </label>

          <label>
            <input
              type="checkbox"
              checked={formData.additionalServices?.unpacking}
              onChange={(e) => updateNestedField('additionalServices', 'unpacking', e.target.checked)}
            />
            Unpacking
          </label>

          <label>
            <input
              type="checkbox"
              checked={formData.additionalServices?.assembly}
              onChange={(e) => updateNestedField('additionalServices', 'assembly', e.target.checked)}
            />
            Assembly/Disassembly
          </label>

          <label>
            <input
              type="checkbox"
              checked={formData.additionalServices?.storage}
              onChange={(e) => updateNestedField('additionalServices', 'storage', e.target.checked)}
            />
            Storage
          </label>
        </div>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isCalculating}
      >
        {isCalculating && <span className={styles.loadingSpinner}></span>}
        {isCalculating ? 'Calculating your estimate...' : 'Calculate Estimate'}
      </button>
    </form>
  );
}