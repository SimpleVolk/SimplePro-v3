'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeterministicEstimator } from '@simplepro/pricing-engine';
import type { EstimateInput, EstimateResult, PricingRule, LocationHandicap, InventoryRoom } from '@simplepro/pricing-engine';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../../lib/config';
import styles from './NewOpportunityForm.module.css';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  type: 'residential' | 'commercial';
  companyName?: string;
}

interface RoomData {
  id: string;
  type: string;
  description: string;
  items: any[];
  packingRequired: boolean;
  totalWeight: number;
  totalVolume: number;
}

interface OpportunityFormData {
  // Customer
  customerId: string;
  customerType: 'existing' | 'new';
  newCustomer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    type: 'residential' | 'commercial';
    companyName?: string;
  };

  // Move Details
  service: 'local' | 'long_distance' | 'storage' | 'packing_only';
  moveDate: Date;
  moveSize: 'studio' | '1br' | '2br' | '3br' | '4br' | '5br' | 'custom';
  flexibility: 'exact' | 'week' | 'month';

  // Pickup Location
  pickup: {
    address: string;
    buildingType: 'house' | 'apartment' | 'condo' | 'office' | 'storage';
    floorLevel: number;
    elevatorAccess: boolean;
    stairsCount: number;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
    narrowHallways: boolean;
    specialNotes: string;
  };

  // Delivery Location
  delivery: {
    address: string;
    buildingType: 'house' | 'apartment' | 'condo' | 'office' | 'storage';
    floorLevel: number;
    elevatorAccess: boolean;
    stairsCount: number;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
    narrowHallways: boolean;
    specialNotes: string;
  };

  // Inventory
  rooms: RoomData[];
  totalWeight: number;
  totalVolume: number;

  // Special Items
  specialItems: {
    piano: boolean;
    poolTable: boolean;
    safe: boolean;
    antiques: boolean;
    artwork: boolean;
    fragileItems: number;
    valuableItems: number;
  };

  // Additional Services
  additionalServices: {
    packing: 'full' | 'partial' | 'fragile' | 'none';
    unpacking: boolean;
    assembly: boolean;
    storage: boolean;
    storageDuration?: number;
    cleaning: boolean;
  };

  // Opportunity Details
  leadSource: 'website' | 'phone' | 'referral' | 'partner' | 'walkin' | 'other';
  assignedSalesRep?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  internalNotes: string;
  followUpDate?: Date;

  // Calculated Fields
  distance: number;
  estimatedDuration: number;
  crewSize: number;
  isWeekend: boolean;
  isHoliday: boolean;
  seasonalPeriod: 'peak' | 'standard' | 'off_peak';
}

export function NewOpportunityForm() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [locationHandicaps, setLocationHandicaps] = useState<LocationHandicap[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const [formData, setFormData] = useState<OpportunityFormData>({
    customerId: '',
    customerType: 'existing',
    service: 'local',
    moveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    moveSize: '2br',
    flexibility: 'exact',
    pickup: {
      address: '',
      buildingType: 'house',
      floorLevel: 1,
      elevatorAccess: false,
      stairsCount: 0,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      narrowHallways: false,
      specialNotes: '',
    },
    delivery: {
      address: '',
      buildingType: 'house',
      floorLevel: 1,
      elevatorAccess: false,
      stairsCount: 0,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      narrowHallways: false,
      specialNotes: '',
    },
    rooms: [],
    totalWeight: 2000,
    totalVolume: 400,
    specialItems: {
      piano: false,
      poolTable: false,
      safe: false,
      antiques: false,
      artwork: false,
      fragileItems: 0,
      valuableItems: 0,
    },
    additionalServices: {
      packing: 'none',
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false,
    },
    leadSource: 'website',
    priority: 'medium',
    internalNotes: '',
    distance: 10,
    estimatedDuration: 4,
    crewSize: 2,
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
  });

  // Auto-save to localStorage
  useEffect(() => {
    const autoSave = setInterval(() => {
      localStorage.setItem('opportunity_draft', JSON.stringify(formData));
    }, 30000);
    return () => clearInterval(autoSave);
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('opportunity_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData({ ...formData, ...parsed });
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch customers for search
  useEffect(() => {
    if (formData.customerType === 'existing') {
      fetchCustomers();
    }
  }, [formData.customerType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch pricing configuration
  useEffect(() => {
    fetchPricingConfiguration();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('customers'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setCustomers(result.customers || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchPricingConfiguration = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // Fetch pricing rules
      const rulesResponse = await fetch(getApiUrl('pricing-rules'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch tariff settings (handicaps)
      const tariffResponse = await fetch(getApiUrl('tariff-settings/active'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setPricingRules(rulesData.rules || []);
      }

      if (tariffResponse.ok) {
        const tariffData = await tariffResponse.json();
        // Extract handicaps from tariff settings
        if (tariffData.data?.handicaps) {
          setLocationHandicaps(tariffData.data.handicaps);
        }
      }
    } catch (err) {
      console.error('Error fetching pricing configuration:', err);
    }
  };

  // Calculate estimate in real-time
  const calculateEstimate = useCallback(async () => {
    if (!formData.pickup.address || !formData.delivery.address) {
      return;
    }

    setIsCalculating(true);
    try {
      const estimateInput: EstimateInput = {
        customerId: formData.customerId || 'new-customer',
        moveDate: formData.moveDate,
        service: formData.service,
        pickup: {
          address: formData.pickup.address,
          floorLevel: formData.pickup.floorLevel,
          elevatorAccess: formData.pickup.elevatorAccess,
          longCarry: formData.pickup.longCarry,
          parkingDistance: formData.pickup.parkingDistance,
          accessDifficulty: formData.pickup.accessDifficulty,
          stairsCount: formData.pickup.stairsCount,
          narrowHallways: formData.pickup.narrowHallways,
        },
        delivery: {
          address: formData.delivery.address,
          floorLevel: formData.delivery.floorLevel,
          elevatorAccess: formData.delivery.elevatorAccess,
          longCarry: formData.delivery.longCarry,
          parkingDistance: formData.delivery.parkingDistance,
          accessDifficulty: formData.delivery.accessDifficulty,
          stairsCount: formData.delivery.stairsCount,
          narrowHallways: formData.delivery.narrowHallways,
        },
        distance: formData.distance,
        estimatedDuration: formData.estimatedDuration,
        rooms: formData.rooms.length > 0 ? formData.rooms : [{
          id: 'default',
          type: 'mixed',
          description: 'Combined inventory',
          items: [],
          packingRequired: formData.additionalServices.packing !== 'none',
          totalWeight: formData.totalWeight,
          totalVolume: formData.totalVolume,
        }] as InventoryRoom[],
        totalWeight: formData.totalWeight,
        totalVolume: formData.totalVolume,
        specialItems: formData.specialItems,
        additionalServices: {
          packing: formData.additionalServices.packing !== 'none',
          unpacking: formData.additionalServices.unpacking,
          assembly: formData.additionalServices.assembly,
          storage: formData.additionalServices.storage,
          cleaning: formData.additionalServices.cleaning,
        },
        isWeekend: formData.isWeekend,
        isHoliday: formData.isHoliday,
        seasonalPeriod: formData.seasonalPeriod,
        crewSize: formData.crewSize,
        specialtyCrewRequired: formData.specialItems.piano || formData.specialItems.poolTable || formData.specialItems.safe,
      };

      // Use dynamic pricing rules if available, otherwise use defaults
      const estimator = new DeterministicEstimator(
        pricingRules.length > 0 ? pricingRules as any : undefined,
        locationHandicaps.length > 0 ? locationHandicaps as any : undefined
      );

      const result = estimator.calculateEstimate(estimateInput, user?.id || 'web-user');
      setEstimate(result);
    } catch (err) {
      console.error('Error calculating estimate:', err);
      setError('Failed to calculate estimate. Please check your inputs.');
    } finally {
      setIsCalculating(false);
    }
  }, [formData, pricingRules, locationHandicaps, user?.id]);

  // Trigger calculation when relevant fields change
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (currentStep >= 3) {
        calculateEstimate();
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [
    formData.pickup.address,
    formData.delivery.address,
    formData.totalWeight,
    formData.totalVolume,
    formData.service,
    formData.additionalServices,
    formData.specialItems,
    currentStep,
    calculateEstimate,
  ]);

  // Add room to inventory
  const addRoom = () => {
    const newRoom: RoomData = {
      id: `room-${Date.now()}`,
      type: 'living_room',
      description: '',
      items: [],
      packingRequired: formData.additionalServices.packing !== 'none',
      totalWeight: 0,
      totalVolume: 0,
    };
    setFormData(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
  };

  // Remove room from inventory
  const removeRoom = (roomId: string) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter(r => r.id !== roomId),
    }));
  };

  // Update room
  const updateRoom = (roomId: string, updates: Partial<RoomData>) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r),
    }));
  };

  // Copy pickup to delivery
  const copyPickupToDelivery = () => {
    setFormData(prev => ({
      ...prev,
      delivery: { ...prev.pickup },
    }));
  };

  // Submit opportunity
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');

      // Create opportunity
      const opportunityData = {
        ...formData,
        estimateId: estimate?.estimateId,
        estimatedPrice: estimate?.calculations.finalPrice,
        createdBy: user?.id,
      };

      const response = await fetch(getApiUrl('opportunities'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(opportunityData),
      });

      if (response.ok) {
        localStorage.removeItem('opportunity_draft');
        // TODO: Redirect to opportunity details or list
        alert('Opportunity created successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create opportunity');
      }
    } catch (err) {
      setError('Error creating opportunity');
      console.error('Error creating opportunity:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers by search
  const filteredCustomers = customers.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const totalSteps = 7;
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className={styles.opportunityForm}>
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Step Indicator */}
      <div className={styles.stepIndicator}>
        <span className={currentStep === 1 ? styles.activeStep : ''}>1. Customer</span>
        <span className={currentStep === 2 ? styles.activeStep : ''}>2. Move Details</span>
        <span className={currentStep === 3 ? styles.activeStep : ''}>3. Pickup</span>
        <span className={currentStep === 4 ? styles.activeStep : ''}>4. Delivery</span>
        <span className={currentStep === 5 ? styles.activeStep : ''}>5. Inventory</span>
        <span className={currentStep === 6 ? styles.activeStep : ''}>6. Services</span>
        <span className={currentStep === 7 ? styles.activeStep : ''}>7. Review</span>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Step 1: Customer Information */}
      {currentStep === 1 && (
        <div className={styles.step}>
          <h2>Customer Information</h2>

          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                checked={formData.customerType === 'existing'}
                onChange={() => setFormData(prev => ({ ...prev, customerType: 'existing' }))}
              />
              Existing Customer
            </label>
            <label>
              <input
                type="radio"
                checked={formData.customerType === 'new'}
                onChange={() => setFormData(prev => ({ ...prev, customerType: 'new' }))}
              />
              New Customer
            </label>
          </div>

          {formData.customerType === 'existing' ? (
            <>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />

              <div className={styles.customerList}>
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className={`${styles.customerItem} ${formData.customerId === customer.id ? styles.selected : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, customerId: customer.id }))}
                  >
                    <h4>{customer.firstName} {customer.lastName}</h4>
                    <p>{customer.email} • {customer.phone}</p>
                    <p className={styles.address}>
                      {customer.address.street}, {customer.address.city}, {customer.address.state}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.formGrid}>
              <input
                type="text"
                placeholder="First Name *"
                value={formData.newCustomer?.firstName || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newCustomer: { ...prev.newCustomer!, firstName: e.target.value }
                }))}
                required
              />
              <input
                type="text"
                placeholder="Last Name *"
                value={formData.newCustomer?.lastName || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newCustomer: { ...prev.newCustomer!, lastName: e.target.value }
                }))}
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.newCustomer?.email || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newCustomer: { ...prev.newCustomer!, email: e.target.value }
                }))}
                required
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={formData.newCustomer?.phone || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newCustomer: { ...prev.newCustomer!, phone: e.target.value }
                }))}
                required
              />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Move Details */}
      {currentStep === 2 && (
        <div className={styles.step}>
          <h2>Move Details</h2>

          <div className={styles.formGroup}>
            <label>Service Type *</label>
            <select
              value={formData.service}
              onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value as any }))}
            >
              <option value="local">Local Move</option>
              <option value="long_distance">Long Distance</option>
              <option value="packing_only">Packing Only</option>
              <option value="storage">Storage</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Move Date *</label>
            <input
              type="date"
              value={formData.moveDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const month = date.getMonth();
                const seasonalPeriod = month >= 4 && month <= 8 ? 'peak' : 'standard';
                setFormData(prev => ({ ...prev, moveDate: date, isWeekend, seasonalPeriod }));
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Move Size *</label>
            <select
              value={formData.moveSize}
              onChange={(e) => setFormData(prev => ({ ...prev, moveSize: e.target.value as any }))}
            >
              <option value="studio">Studio</option>
              <option value="1br">1 Bedroom</option>
              <option value="2br">2 Bedroom</option>
              <option value="3br">3 Bedroom</option>
              <option value="4br">4 Bedroom</option>
              <option value="5br">5+ Bedroom</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Date Flexibility</label>
            <select
              value={formData.flexibility}
              onChange={(e) => setFormData(prev => ({ ...prev, flexibility: e.target.value as any }))}
            >
              <option value="exact">Exact Date</option>
              <option value="week">Flexible (Within Week)</option>
              <option value="month">Flexible (Within Month)</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Pickup Location */}
      {currentStep === 3 && (
        <div className={styles.step}>
          <h2>Pickup Location</h2>

          <div className={styles.formGroup}>
            <label>Address *</label>
            <input
              type="text"
              placeholder="123 Main St, City, State ZIP"
              value={formData.pickup.address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pickup: { ...prev.pickup, address: e.target.value }
              }))}
              required
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Building Type</label>
              <select
                value={formData.pickup.buildingType}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, buildingType: e.target.value as any }
                }))}
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="condo">Condo</option>
                <option value="office">Office</option>
                <option value="storage">Storage Unit</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Floor Level</label>
              <input
                type="number"
                min="1"
                value={formData.pickup.floorLevel}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, floorLevel: Number(e.target.value) }
                }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Stairs (flights)</label>
              <input
                type="number"
                min="0"
                value={formData.pickup.stairsCount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, stairsCount: Number(e.target.value) }
                }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Parking Distance (ft)</label>
              <input
                type="number"
                min="0"
                value={formData.pickup.parkingDistance}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, parkingDistance: Number(e.target.value) }
                }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Access Difficulty</label>
            <select
              value={formData.pickup.accessDifficulty}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pickup: { ...prev.pickup, accessDifficulty: e.target.value as any }
              }))}
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="difficult">Difficult</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.pickup.elevatorAccess}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, elevatorAccess: e.target.checked }
                }))}
              />
              Elevator Available
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.pickup.longCarry}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, longCarry: e.target.checked }
                }))}
              />
              Long Walk (&gt;75 ft)
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.pickup.narrowHallways}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pickup: { ...prev.pickup, narrowHallways: e.target.checked }
                }))}
              />
              Narrow Hallways
            </label>
          </div>

          <div className={styles.formGroup}>
            <label>Special Access Notes</label>
            <textarea
              rows={3}
              value={formData.pickup.specialNotes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pickup: { ...prev.pickup, specialNotes: e.target.value }
              }))}
              placeholder="Gate codes, parking permits, building restrictions, etc."
            />
          </div>
        </div>
      )}

      {/* Step 4: Delivery Location */}
      {currentStep === 4 && (
        <div className={styles.step}>
          <h2>Delivery Location</h2>

          <button
            type="button"
            onClick={copyPickupToDelivery}
            className={styles.secondaryButton}
            style={{ marginBottom: '1rem' }}
          >
            Copy from Pickup Location
          </button>

          <div className={styles.formGroup}>
            <label>Address *</label>
            <input
              type="text"
              placeholder="456 Oak Ave, City, State ZIP"
              value={formData.delivery.address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                delivery: { ...prev.delivery, address: e.target.value }
              }))}
              required
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Building Type</label>
              <select
                value={formData.delivery.buildingType}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, buildingType: e.target.value as any }
                }))}
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="condo">Condo</option>
                <option value="office">Office</option>
                <option value="storage">Storage Unit</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Floor Level</label>
              <input
                type="number"
                min="1"
                value={formData.delivery.floorLevel}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, floorLevel: Number(e.target.value) }
                }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Stairs (flights)</label>
              <input
                type="number"
                min="0"
                value={formData.delivery.stairsCount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, stairsCount: Number(e.target.value) }
                }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Parking Distance (ft)</label>
              <input
                type="number"
                min="0"
                value={formData.delivery.parkingDistance}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, parkingDistance: Number(e.target.value) }
                }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Access Difficulty</label>
            <select
              value={formData.delivery.accessDifficulty}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                delivery: { ...prev.delivery, accessDifficulty: e.target.value as any }
              }))}
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="difficult">Difficult</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.delivery.elevatorAccess}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, elevatorAccess: e.target.checked }
                }))}
              />
              Elevator Available
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.delivery.longCarry}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, longCarry: e.target.checked }
                }))}
              />
              Long Walk (&gt;75 ft)
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.delivery.narrowHallways}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  delivery: { ...prev.delivery, narrowHallways: e.target.checked }
                }))}
              />
              Narrow Hallways
            </label>
          </div>

          <div className={styles.formGroup}>
            <label>Special Access Notes</label>
            <textarea
              rows={3}
              value={formData.delivery.specialNotes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                delivery: { ...prev.delivery, specialNotes: e.target.value }
              }))}
              placeholder="Gate codes, parking permits, building restrictions, etc."
            />
          </div>
        </div>
      )}

      {/* Step 5: Inventory */}
      {currentStep === 5 && (
        <div className={styles.step}>
          <h2>Inventory Details</h2>

          <div className={styles.inventoryHeader}>
            <button type="button" onClick={addRoom} className={styles.primaryButton}>
              Add Room
            </button>
          </div>

          {formData.rooms.map((room, index) => (
            <div key={room.id} className={styles.roomCard}>
              <div className={styles.roomHeader}>
                <h4>Room {index + 1}</h4>
                <button type="button" onClick={() => removeRoom(room.id)} className={styles.deleteButton}>
                  Remove
                </button>
              </div>

              <div className={styles.formGrid}>
                <select
                  value={room.type}
                  onChange={(e) => updateRoom(room.id, { type: e.target.value })}
                >
                  <option value="living_room">Living Room</option>
                  <option value="bedroom">Bedroom</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="dining_room">Dining Room</option>
                  <option value="office">Office</option>
                  <option value="garage">Garage</option>
                  <option value="basement">Basement</option>
                  <option value="attic">Attic</option>
                  <option value="other">Other</option>
                </select>

                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={room.description}
                  onChange={(e) => updateRoom(room.id, { description: e.target.value })}
                />

                <input
                  type="number"
                  placeholder="Weight (lbs)"
                  value={room.totalWeight}
                  onChange={(e) => updateRoom(room.id, { totalWeight: Number(e.target.value) })}
                />

                <input
                  type="number"
                  placeholder="Volume (cu ft)"
                  value={room.totalVolume}
                  onChange={(e) => updateRoom(room.id, { totalVolume: Number(e.target.value) })}
                />
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={room.packingRequired}
                  onChange={(e) => updateRoom(room.id, { packingRequired: e.target.checked })}
                />
                Packing Required
              </label>
            </div>
          ))}

          <div className={styles.totalsSection}>
            <h4>Overall Totals</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Total Weight (lbs)</label>
                <input
                  type="number"
                  value={formData.totalWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalWeight: Number(e.target.value) }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Total Volume (cu ft)</label>
                <input
                  type="number"
                  value={formData.totalVolume}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalVolume: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className={styles.specialItemsSection}>
            <h4>Special Items</h4>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.specialItems.piano}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, piano: e.target.checked }
                  }))}
                />
                Piano
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.specialItems.poolTable}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, poolTable: e.target.checked }
                  }))}
                />
                Pool Table
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.specialItems.safe}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, safe: e.target.checked }
                  }))}
                />
                Safe
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.specialItems.antiques}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, antiques: e.target.checked }
                  }))}
                />
                Antiques
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.specialItems.artwork}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, artwork: e.target.checked }
                  }))}
                />
                Artwork
              </label>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Fragile Items Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.specialItems.fragileItems}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, fragileItems: Number(e.target.value) }
                  }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Valuable Items Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.specialItems.valuableItems}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specialItems: { ...prev.specialItems, valuableItems: Number(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Additional Services */}
      {currentStep === 6 && (
        <div className={styles.step}>
          <h2>Additional Services</h2>

          <div className={styles.formGroup}>
            <label>Packing Services</label>
            <select
              value={formData.additionalServices.packing}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                additionalServices: { ...prev.additionalServices, packing: e.target.value as any }
              }))}
            >
              <option value="none">No Packing</option>
              <option value="full">Full Pack</option>
              <option value="partial">Partial Pack</option>
              <option value="fragile">Fragile Only</option>
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.additionalServices.unpacking}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, unpacking: e.target.checked }
                }))}
              />
              Unpacking
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.additionalServices.assembly}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, assembly: e.target.checked }
                }))}
              />
              Assembly/Disassembly
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.additionalServices.storage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, storage: e.target.checked }
                }))}
              />
              Storage
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.additionalServices.cleaning}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, cleaning: e.target.checked }
                }))}
              />
              Cleaning
            </label>
          </div>

          {formData.additionalServices.storage && (
            <div className={styles.formGroup}>
              <label>Storage Duration (months)</label>
              <input
                type="number"
                min="1"
                value={formData.additionalServices.storageDuration || 1}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, storageDuration: Number(e.target.value) }
                }))}
              />
            </div>
          )}

          <div className={styles.opportunityDetailsSection}>
            <h4>Opportunity Details</h4>

            <div className={styles.formGroup}>
              <label>Lead Source</label>
              <select
                value={formData.leadSource}
                onChange={(e) => setFormData(prev => ({ ...prev, leadSource: e.target.value as any }))}
              >
                <option value="website">Website</option>
                <option value="phone">Phone</option>
                <option value="referral">Referral</option>
                <option value="partner">Partner</option>
                <option value="walkin">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Internal Notes</label>
              <textarea
                rows={4}
                value={formData.internalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                placeholder="Any internal notes or special instructions..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Follow-up Date</label>
              <input
                type="date"
                value={formData.followUpDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: new Date(e.target.value) }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 7: Review & Estimate */}
      {currentStep === 7 && (
        <div className={styles.step}>
          <h2>Review & Estimate</h2>

          {isCalculating ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Calculating estimate...</p>
            </div>
          ) : estimate ? (
            <div className={styles.estimateDisplay}>
              <div className={styles.priceHeader}>
                <h3>Estimated Price</h3>
                <div className={styles.finalPrice}>
                  ${estimate.calculations.finalPrice.toLocaleString()}
                </div>
              </div>

              <div className={styles.priceBreakdown}>
                <h4>Price Breakdown</h4>
                <div className={styles.breakdownItem}>
                  <span>Base Labor:</span>
                  <span>${estimate.calculations.breakdown.baseLabor.toLocaleString()}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Materials:</span>
                  <span>${estimate.calculations.breakdown.materials.toLocaleString()}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Transportation:</span>
                  <span>${estimate.calculations.breakdown.transportation.toLocaleString()}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Location Handicaps:</span>
                  <span>${estimate.calculations.breakdown.locationHandicaps.toLocaleString()}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Special Services:</span>
                  <span>${estimate.calculations.breakdown.specialServices.toLocaleString()}</span>
                </div>
              </div>

              <div className={styles.appliedRules}>
                <h4>Applied Pricing Rules</h4>
                {estimate.calculations.appliedRules.map((rule, index) => (
                  <div key={index} className={styles.ruleItem}>
                    <strong>{rule.ruleName}</strong>
                    <span className={rule.priceImpact >= 0 ? styles.positive : styles.negative}>
                      {rule.priceImpact >= 0 ? '+' : ''}${rule.priceImpact.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {estimate.calculations.locationHandicaps.length > 0 && (
                <div className={styles.handicaps}>
                  <h4>Location Handicaps</h4>
                  {estimate.calculations.locationHandicaps.map((handicap, index) => (
                    <div key={index} className={styles.handicapItem}>
                      <strong>{handicap.name} ({handicap.type})</strong>
                      <span>+${handicap.priceImpact.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.metadata}>
                <p><strong>Estimate ID:</strong> {estimate.estimateId}</p>
                <p><strong>Deterministic:</strong> {estimate.metadata.deterministic ? 'Yes' : 'No'}</p>
                <p><strong>Hash:</strong> <code>{estimate.metadata.hash.substring(0, 16)}...</code></p>
              </div>
            </div>
          ) : (
            <div className={styles.noEstimate}>
              <p>Complete all steps to generate estimate</p>
            </div>
          )}

          <div className={styles.summarySection}>
            <h4>Opportunity Summary</h4>
            <div className={styles.summaryGrid}>
              <div>
                <strong>Service:</strong>
                <p>{formData.service.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div>
                <strong>Move Date:</strong>
                <p>{formData.moveDate.toLocaleDateString()}</p>
              </div>
              <div>
                <strong>Pickup:</strong>
                <p>{formData.pickup.address}</p>
              </div>
              <div>
                <strong>Delivery:</strong>
                <p>{formData.delivery.address}</p>
              </div>
              <div>
                <strong>Lead Source:</strong>
                <p>{formData.leadSource.toUpperCase()}</p>
              </div>
              <div>
                <strong>Priority:</strong>
                <p>{formData.priority.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className={styles.navigation}>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            className={styles.secondaryButton}
          >
            Previous
          </button>
        )}

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep + 1)}
            className={styles.primaryButton}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !estimate}
            className={styles.primaryButton}
          >
            {loading ? 'Creating Opportunity...' : 'Create Opportunity'}
          </button>
        )}
      </div>
    </div>
  );
}
