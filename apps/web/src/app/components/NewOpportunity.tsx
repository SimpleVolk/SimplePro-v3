'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../../lib/config';
import {
  DeterministicEstimator,
  defaultRules,
} from '@simplepro/pricing-engine';
import type { EstimateInput, EstimateResult } from '@simplepro/pricing-engine';
import styles from './NewOpportunity.module.css';

interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  type: 'residential' | 'commercial';
  source:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';
  companyName?: string;
  businessLicense?: string;
  preferredContactMethod: 'email' | 'phone' | 'text';
  communicationPreferences?: {
    allowMarketing: boolean;
    allowSms: boolean;
    allowEmail: boolean;
  };
  notes?: string;
  leadScore?: number;
  tags?: string[];
  assignedSalesRep?: string;
}

interface MoveSize {
  id: string;
  name: string;
  description: string;
  cubicFeet: number;
  weight: number;
}

interface NewOpportunityData {
  customer: CreateCustomerDto;
  moveDetails: Partial<EstimateInput>;
  estimateResult?: EstimateResult;
  status: 'draft' | 'submitted';
}

const MOVE_SIZES: MoveSize[] = [
  {
    id: '1',
    name: 'Studio or Less',
    description: 'Under 400 Sq Ft',
    cubicFeet: 75,
    weight: 675,
  },
  {
    id: '2',
    name: 'Studio Apartment',
    description: '400 - 500 Sq Ft',
    cubicFeet: 250,
    weight: 2250,
  },
  {
    id: '3',
    name: '1 Bedroom Apartment',
    description: '500 - 800 Sq Ft',
    cubicFeet: 432,
    weight: 3888,
  },
  {
    id: '4',
    name: '2 Bedroom Apartment',
    description: '650 - 1000 Sq Ft',
    cubicFeet: 654,
    weight: 5886,
  },
  {
    id: '5',
    name: '3 Bedroom Apartment',
    description: '1000 - 2000 Sq Ft',
    cubicFeet: 1236,
    weight: 4074,
  },
  {
    id: '6',
    name: '1 Bedroom House',
    description: '800 - 1000 Sq Ft',
    cubicFeet: 576,
    weight: 4512,
  },
  {
    id: '7',
    name: '2 Bedroom House (Small)',
    description: '1000 - 1200 Sq Ft',
    cubicFeet: 1152,
    weight: 9108,
  },
  {
    id: '8',
    name: '2 Bedroom House',
    description: '1400 - 1600 Sq Ft',
    cubicFeet: 1458,
    weight: 7668,
  },
  {
    id: '9',
    name: '2 Bedroom House (Large)',
    description: '1600 - 1800 Sq Ft',
    cubicFeet: 1632,
    weight: 8064,
  },
  {
    id: '10',
    name: '3+ Br Storage Unit',
    description: '-',
    cubicFeet: 630,
    weight: 2860,
  },
  {
    id: '11',
    name: '3 Bedroom House',
    description: '2000 - 2200 Sq Ft',
    cubicFeet: 1840,
    weight: 10880,
  },
  {
    id: '12',
    name: '3 Bedroom House (Large)',
    description: '2200 - 2400 Sq Ft',
    cubicFeet: 1944,
    weight: 10488,
  },
  {
    id: '13',
    name: '4 Bedroom House',
    description: '2400 - 2800 Sq Ft',
    cubicFeet: 1872,
    weight: 11264,
  },
  {
    id: '14',
    name: '4 Bedroom House (Large)',
    description: '2800 - 3200 Sq Ft',
    cubicFeet: 2626,
    weight: 11832,
  },
  {
    id: '15',
    name: '5 Bedroom House',
    description: '3200 - 3800 Sq Ft',
    cubicFeet: 2568,
    weight: 12476,
  },
  {
    id: '16',
    name: '5 Bedroom House (Large)',
    description: '3800 - 4000 Sq Ft',
    cubicFeet: 3896,
    weight: 24732,
  },
];

export default function NewOpportunity() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] = useState<EstimateResult | null>(
    null,
  );
  const [calculatingEstimate, setCalculatingEstimate] = useState(false);

  // Customer Information State
  const [customerData, setCustomerData] = useState<CreateCustomerDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    type: 'residential',
    source: 'website',
    preferredContactMethod: 'email',
    communicationPreferences: {
      allowMarketing: true,
      allowSms: true,
      allowEmail: true,
    },
    notes: '',
  });

  // Move Details State
  const [moveDetails, setMoveDetails] = useState<Partial<EstimateInput>>({
    service: 'local',
    moveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    pickup: {
      address: '',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false,
    },
    delivery: {
      address: '',
      floorLevel: 1,
      elevatorAccess: false,
      longCarry: false,
      parkingDistance: 20,
      accessDifficulty: 'easy',
      stairsCount: 0,
      narrowHallways: false,
    },
    totalWeight: 0,
    totalVolume: 0,
    distance: 10,
    estimatedDuration: 4,
    crewSize: 2,
    isWeekend: false,
    isHoliday: false,
    seasonalPeriod: 'standard',
    specialtyCrewRequired: false,
    specialItems: {
      piano: false,
      antiques: false,
      artwork: false,
      fragileItems: 0,
      valuableItems: 0,
    },
    additionalServices: {
      packing: false,
      unpacking: false,
      assembly: false,
      storage: false,
      cleaning: false,
    },
    rooms: [],
  });

  const [selectedMoveSize, setSelectedMoveSize] = useState<string>('');
  const [manualEntry, setManualEntry] = useState(false);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData: NewOpportunityData = {
      customer: customerData,
      moveDetails,
      estimateResult: estimateResult || undefined,
      status: 'draft',
    };
    localStorage.setItem('newOpportunityDraft', JSON.stringify(draftData));
  }, [customerData, moveDetails, estimateResult]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('newOpportunityDraft');
    if (savedDraft) {
      try {
        const draft: NewOpportunityData = JSON.parse(savedDraft);
        if (draft.status === 'draft') {
          setCustomerData(draft.customer);
          setMoveDetails(draft.moveDetails);
          if (draft.estimateResult) {
            setEstimateResult(draft.estimateResult);
          }
        }
      } catch (err) {
        console.error('Error loading draft:', err);
      }
    }
  }, []);

  // Check for duplicate customers
  const checkDuplicateCustomer = useCallback(async () => {
    if (!customerData.email && !customerData.phone) return;

    try {
      const token = localStorage.getItem('access_token');
      const searchTerm = customerData.email || customerData.phone;

      const response = await fetch(
        getApiUrl(`customers?search=${searchTerm}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.customers && result.customers.length > 0) {
          setDuplicateWarning(
            `A customer with this ${customerData.email ? 'email' : 'phone'} already exists. Please verify before creating.`,
          );
        } else {
          setDuplicateWarning(null);
        }
      }
    } catch (err) {
      console.error('Error checking duplicate:', err);
    }
  }, [customerData.email, customerData.phone]);

  // Debounced duplicate check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkDuplicateCustomer();
    }, 500);

    return () => clearTimeout(timer);
  }, [checkDuplicateCustomer]);

  // Calculate estimate in real-time
  const calculateEstimate = useCallback(async () => {
    if (
      !moveDetails.pickup?.address ||
      !moveDetails.delivery?.address ||
      !moveDetails.totalWeight ||
      !moveDetails.totalVolume
    ) {
      setEstimateResult(null);
      return;
    }

    setCalculatingEstimate(true);

    try {
      const rooms = moveDetails.rooms?.length
        ? moveDetails.rooms
        : [
            {
              id: 'default-room',
              type: 'mixed',
              description: 'Combined room inventory',
              items: [],
              packingRequired: moveDetails.additionalServices?.packing || false,
              totalWeight: moveDetails.totalWeight || 0,
              totalVolume: moveDetails.totalVolume || 0,
            },
          ];

      const estimateInput: EstimateInput = {
        ...moveDetails,
        customerId: user?.id || 'temp-customer',
        moveDate: new Date(moveDetails.moveDate || ''),
        rooms,
      } as EstimateInput;

      const estimator = new DeterministicEstimator(
        defaultRules.pricingRules as any,
        defaultRules.locationHandicaps as any,
      );

      const result = estimator.calculateEstimate(
        estimateInput,
        user?.id || 'temp-user',
      );
      setEstimateResult(result);
    } catch (err) {
      console.error('Error calculating estimate:', err);
      setEstimateResult(null);
    } finally {
      setCalculatingEstimate(false);
    }
  }, [moveDetails, user]);

  // Debounced estimate calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateEstimate();
    }, 800);

    return () => clearTimeout(timer);
  }, [calculateEstimate]);

  // Handle move size selection
  const handleMoveSizeChange = (moveSizeId: string) => {
    setSelectedMoveSize(moveSizeId);
    if (moveSizeId && moveSizeId !== 'manual') {
      const moveSize = MOVE_SIZES.find((ms) => ms.id === moveSizeId);
      if (moveSize) {
        setMoveDetails((prev) => ({
          ...prev,
          totalWeight: moveSize.weight,
          totalVolume: moveSize.cubicFeet,
        }));
        setManualEntry(false);
      }
    } else if (moveSizeId === 'manual') {
      setManualEntry(true);
    }
  };

  // Validation for each step
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!customerData.firstName.trim())
        errors.firstName = 'First name is required';
      if (!customerData.lastName.trim())
        errors.lastName = 'Last name is required';
      if (!customerData.email.trim()) errors.email = 'Email is required';
      if (
        customerData.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)
      ) {
        errors.email = 'Invalid email format';
      }
      if (!customerData.phone.trim()) errors.phone = 'Phone is required';
      if (
        customerData.type === 'commercial' &&
        !customerData.companyName?.trim()
      ) {
        errors.companyName =
          'Company name is required for commercial customers';
      }
    }

    if (step === 2) {
      if (!moveDetails.pickup?.address?.trim())
        errors.pickupAddress = 'Pickup address is required';
      if (!moveDetails.delivery?.address?.trim())
        errors.deliveryAddress = 'Delivery address is required';
      if (!moveDetails.moveDate) errors.moveDate = 'Move date is required';
      if (!moveDetails.distance || moveDetails.distance <= 0)
        errors.distance = 'Distance must be greater than 0';
    }

    if (step === 3) {
      if (!moveDetails.totalWeight || moveDetails.totalWeight <= 0) {
        errors.totalWeight = 'Total weight must be greater than 0';
      }
      if (!moveDetails.totalVolume || moveDetails.totalVolume <= 0) {
        errors.totalVolume = 'Total volume must be greater than 0';
      }
      if (
        !moveDetails.estimatedDuration ||
        moveDetails.estimatedDuration <= 0
      ) {
        errors.estimatedDuration = 'Estimated duration must be greater than 0';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle step navigation
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    } else {
      setError('Please correct the highlighted errors before continuing.');
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(4)) {
      setError('Please review and correct all errors before submitting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');

      // Create customer
      const customerResponse = await fetch(getApiUrl('customers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(customerData),
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json();
        throw new Error(errorData.message || 'Failed to create customer');
      }

      const customerResult = await customerResponse.json();
      const customerId = customerResult.customer.id;

      // Calculate final estimate with actual customer ID
      if (estimateResult) {
        // Store estimate (if you have an endpoint for it)
        // For now, we'll just show success message

        setSuccess(
          `Opportunity created successfully! Customer ID: ${customerId}`,
        );

        // Clear draft
        localStorage.removeItem('newOpportunityDraft');

        // Reset form after 2 seconds
        setTimeout(() => {
          resetForm();
        }, 2000);
      }
    } catch (err) {
      console.error('Error creating opportunity:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create opportunity',
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCustomerData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      type: 'residential',
      source: 'website',
      preferredContactMethod: 'email',
      communicationPreferences: {
        allowMarketing: true,
        allowSms: true,
        allowEmail: true,
      },
      notes: '',
    });
    setMoveDetails({
      service: 'local',
      moveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      pickup: {
        address: '',
        floorLevel: 1,
        elevatorAccess: false,
        longCarry: false,
        parkingDistance: 20,
        accessDifficulty: 'easy',
        stairsCount: 0,
        narrowHallways: false,
      },
      delivery: {
        address: '',
        floorLevel: 1,
        elevatorAccess: false,
        longCarry: false,
        parkingDistance: 20,
        accessDifficulty: 'easy',
        stairsCount: 0,
        narrowHallways: false,
      },
      totalWeight: 0,
      totalVolume: 0,
      distance: 10,
      estimatedDuration: 4,
      crewSize: 2,
      isWeekend: false,
      isHoliday: false,
      seasonalPeriod: 'standard',
      specialtyCrewRequired: false,
      specialItems: {
        piano: false,
        antiques: false,
        artwork: false,
        fragileItems: 0,
        valuableItems: 0,
      },
      additionalServices: {
        packing: false,
        unpacking: false,
        assembly: false,
        storage: false,
        cleaning: false,
      },
      rooms: [],
    });
    setEstimateResult(null);
    setCurrentStep(1);
    setSelectedMoveSize('');
    setManualEntry(false);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    setDuplicateWarning(null);
  };

  return (
    <div className={styles.newOpportunity}>
      <div className={styles.header}>
        <h2>Create New Opportunity</h2>
        <p>Capture customer information and generate a moving estimate</p>
      </div>

      {/* Progress Indicator */}
      <div className={styles.progressIndicator}>
        <div
          className={`${styles.step} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}
        >
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepLabel}>Customer Info</div>
        </div>
        <div className={styles.progressLine}></div>
        <div
          className={`${styles.step} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}
        >
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepLabel}>Move Details</div>
        </div>
        <div className={styles.progressLine}></div>
        <div
          className={`${styles.step} ${currentStep >= 3 ? styles.active : ''} ${currentStep > 3 ? styles.completed : ''}`}
        >
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepLabel}>Inventory</div>
        </div>
        <div className={styles.progressLine}></div>
        <div
          className={`${styles.step} ${currentStep >= 4 ? styles.active : ''} ${currentStep > 4 ? styles.completed : ''}`}
        >
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepLabel}>Review</div>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className={styles.errorAlert}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className={styles.successAlert}>
          <strong>Success:</strong> {success}
        </div>
      )}

      {duplicateWarning && (
        <div className={styles.warningAlert}>
          <strong>Warning:</strong> {duplicateWarning}
          <button onClick={() => setDuplicateWarning(null)}>×</button>
        </div>
      )}

      <div className={styles.contentWrapper}>
        <div className={styles.formSection}>
          {/* Step 1: Customer Information */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <h3>Customer Information</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={customerData.firstName}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className={
                      validationErrors.firstName ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.firstName && (
                    <div className={styles.errorMessage}>
                      {validationErrors.firstName}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={customerData.lastName}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className={
                      validationErrors.lastName ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.lastName && (
                    <div className={styles.errorMessage}>
                      {validationErrors.lastName}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    onBlur={checkDuplicateCustomer}
                    className={validationErrors.email ? styles.fieldError : ''}
                  />
                  {validationErrors.email && (
                    <div className={styles.errorMessage}>
                      {validationErrors.email}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone *</label>
                  <input
                    id="phone"
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    onBlur={checkDuplicateCustomer}
                    className={validationErrors.phone ? styles.fieldError : ''}
                    placeholder="(555) 123-4567"
                  />
                  {validationErrors.phone && (
                    <div className={styles.errorMessage}>
                      {validationErrors.phone}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="alternatePhone">Alternate Phone</label>
                  <input
                    id="alternatePhone"
                    type="tel"
                    value={customerData.alternatePhone}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        alternatePhone: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="customerType">Customer Type *</label>
                  <select
                    id="customerType"
                    value={customerData.type}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        type: e.target.value as 'residential' | 'commercial',
                      }))
                    }
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                {customerData.type === 'commercial' && (
                  <div className={styles.formGroup}>
                    <label htmlFor="companyName">Company Name *</label>
                    <input
                      id="companyName"
                      type="text"
                      value={customerData.companyName || ''}
                      onChange={(e) =>
                        setCustomerData((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      className={
                        validationErrors.companyName ? styles.fieldError : ''
                      }
                    />
                    {validationErrors.companyName && (
                      <div className={styles.errorMessage}>
                        {validationErrors.companyName}
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="source">Lead Source *</label>
                  <select
                    id="source"
                    value={customerData.source}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        source: e.target.value as any,
                      }))
                    }
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="advertising">Advertising</option>
                    <option value="social_media">Social Media</option>
                    <option value="partner">Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="preferredContact">
                    Preferred Contact Method *
                  </label>
                  <select
                    id="preferredContact"
                    value={customerData.preferredContactMethod}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        preferredContactMethod: e.target.value as
                          | 'email'
                          | 'phone'
                          | 'text',
                      }))
                    }
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text/SMS</option>
                  </select>
                </div>

                <div className={styles.formGroupFull}>
                  <label>Communication Preferences</label>
                  <div className={styles.checkboxGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          customerData.communicationPreferences?.allowMarketing
                        }
                        onChange={(e) =>
                          setCustomerData((prev) => ({
                            ...prev,
                            communicationPreferences: {
                              ...prev.communicationPreferences!,
                              allowMarketing: e.target.checked,
                            },
                          }))
                        }
                      />
                      Allow Marketing Communications
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          customerData.communicationPreferences?.allowSms
                        }
                        onChange={(e) =>
                          setCustomerData((prev) => ({
                            ...prev,
                            communicationPreferences: {
                              ...prev.communicationPreferences!,
                              allowSms: e.target.checked,
                            },
                          }))
                        }
                      />
                      Allow SMS Messages
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          customerData.communicationPreferences?.allowEmail
                        }
                        onChange={(e) =>
                          setCustomerData((prev) => ({
                            ...prev,
                            communicationPreferences: {
                              ...prev.communicationPreferences!,
                              allowEmail: e.target.checked,
                            },
                          }))
                        }
                      />
                      Allow Email
                    </label>
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={customerData.notes}
                    onChange={(e) =>
                      setCustomerData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Additional information about the customer..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Move Details */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <h3>Move Details</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="service">Service Type *</label>
                  <select
                    id="service"
                    value={moveDetails.service}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        service: e.target.value as any,
                      }))
                    }
                  >
                    <option value="local">Local Move</option>
                    <option value="long_distance">Long Distance</option>
                    <option value="packing_only">Packing Only</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="moveDate">Move Date *</label>
                  <input
                    id="moveDate"
                    type="date"
                    value={
                      typeof moveDetails.moveDate === 'string'
                        ? moveDetails.moveDate
                        : moveDetails.moveDate?.toISOString().split('T')[0] ||
                          ''
                    }
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        moveDate: new Date(e.target.value),
                      }))
                    }
                    className={
                      validationErrors.moveDate ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.moveDate && (
                    <div className={styles.errorMessage}>
                      {validationErrors.moveDate}
                    </div>
                  )}
                </div>

                <div className={styles.formGroupFull}>
                  <h4>Pickup Address</h4>
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="pickupAddress">Street Address *</label>
                  <input
                    id="pickupAddress"
                    type="text"
                    value={moveDetails.pickup?.address}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        pickup: { ...prev.pickup!, address: e.target.value },
                      }))
                    }
                    placeholder="123 Main St, City, State ZIP"
                    className={
                      validationErrors.pickupAddress ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.pickupAddress && (
                    <div className={styles.errorMessage}>
                      {validationErrors.pickupAddress}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pickupFloor">Floor Level</label>
                  <input
                    id="pickupFloor"
                    type="number"
                    value={moveDetails.pickup?.floorLevel}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        pickup: {
                          ...prev.pickup!,
                          floorLevel: Number(e.target.value),
                        },
                      }))
                    }
                    min="1"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pickupStairs">Stairs Count</label>
                  <input
                    id="pickupStairs"
                    type="number"
                    value={moveDetails.pickup?.stairsCount}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        pickup: {
                          ...prev.pickup!,
                          stairsCount: Number(e.target.value),
                        },
                      }))
                    }
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pickupAccess">Access Difficulty</label>
                  <select
                    id="pickupAccess"
                    value={moveDetails.pickup?.accessDifficulty}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        pickup: {
                          ...prev.pickup!,
                          accessDifficulty: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="difficult">Difficult</option>
                    <option value="extreme">Extreme</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pickupParking">Parking Distance (feet)</label>
                  <input
                    id="pickupParking"
                    type="number"
                    value={moveDetails.pickup?.parkingDistance}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        pickup: {
                          ...prev.pickup!,
                          parkingDistance: Number(e.target.value),
                        },
                      }))
                    }
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={moveDetails.pickup?.elevatorAccess}
                      onChange={(e) =>
                        setMoveDetails((prev) => ({
                          ...prev,
                          pickup: {
                            ...prev.pickup!,
                            elevatorAccess: e.target.checked,
                          },
                        }))
                      }
                    />
                    Elevator Access
                  </label>
                </div>

                <div className={styles.formGroupFull}>
                  <h4>Delivery Address</h4>
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="deliveryAddress">Street Address *</label>
                  <input
                    id="deliveryAddress"
                    type="text"
                    value={moveDetails.delivery?.address}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery!,
                          address: e.target.value,
                        },
                      }))
                    }
                    placeholder="456 Oak Ave, City, State ZIP"
                    className={
                      validationErrors.deliveryAddress ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.deliveryAddress && (
                    <div className={styles.errorMessage}>
                      {validationErrors.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deliveryFloor">Floor Level</label>
                  <input
                    id="deliveryFloor"
                    type="number"
                    value={moveDetails.delivery?.floorLevel}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery!,
                          floorLevel: Number(e.target.value),
                        },
                      }))
                    }
                    min="1"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deliveryStairs">Stairs Count</label>
                  <input
                    id="deliveryStairs"
                    type="number"
                    value={moveDetails.delivery?.stairsCount}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery!,
                          stairsCount: Number(e.target.value),
                        },
                      }))
                    }
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deliveryAccess">Access Difficulty</label>
                  <select
                    id="deliveryAccess"
                    value={moveDetails.delivery?.accessDifficulty}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery!,
                          accessDifficulty: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="difficult">Difficult</option>
                    <option value="extreme">Extreme</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deliveryParking">
                    Parking Distance (feet)
                  </label>
                  <input
                    id="deliveryParking"
                    type="number"
                    value={moveDetails.delivery?.parkingDistance}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery!,
                          parkingDistance: Number(e.target.value),
                        },
                      }))
                    }
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={moveDetails.delivery?.elevatorAccess}
                      onChange={(e) =>
                        setMoveDetails((prev) => ({
                          ...prev,
                          delivery: {
                            ...prev.delivery!,
                            elevatorAccess: e.target.checked,
                          },
                        }))
                      }
                    />
                    Elevator Access
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="distance">Distance (miles) *</label>
                  <input
                    id="distance"
                    type="number"
                    value={moveDetails.distance}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        distance: Number(e.target.value),
                      }))
                    }
                    min="0"
                    className={
                      validationErrors.distance ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.distance && (
                    <div className={styles.errorMessage}>
                      {validationErrors.distance}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Inventory */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <h3>Move Size & Inventory</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label htmlFor="moveSize">
                    Select Move Size (or choose manual entry)
                  </label>
                  <select
                    id="moveSize"
                    value={selectedMoveSize}
                    onChange={(e) => handleMoveSizeChange(e.target.value)}
                  >
                    <option value="">Select a move size...</option>
                    {MOVE_SIZES.map((moveSize) => (
                      <option key={moveSize.id} value={moveSize.id}>
                        {moveSize.name} - {moveSize.description} (
                        {moveSize.weight} lbs, {moveSize.cubicFeet} cu ft)
                      </option>
                    ))}
                    <option value="manual">Manual Entry</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="totalWeight">Total Weight (lbs) *</label>
                  <input
                    id="totalWeight"
                    type="number"
                    value={moveDetails.totalWeight}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        totalWeight: Number(e.target.value),
                      }))
                    }
                    min="1"
                    disabled={!manualEntry && selectedMoveSize !== ''}
                    className={
                      validationErrors.totalWeight ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.totalWeight && (
                    <div className={styles.errorMessage}>
                      {validationErrors.totalWeight}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="totalVolume">Total Volume (cu ft) *</label>
                  <input
                    id="totalVolume"
                    type="number"
                    value={moveDetails.totalVolume}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        totalVolume: Number(e.target.value),
                      }))
                    }
                    min="1"
                    disabled={!manualEntry && selectedMoveSize !== ''}
                    className={
                      validationErrors.totalVolume ? styles.fieldError : ''
                    }
                  />
                  {validationErrors.totalVolume && (
                    <div className={styles.errorMessage}>
                      {validationErrors.totalVolume}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="crewSize">Crew Size</label>
                  <select
                    id="crewSize"
                    value={moveDetails.crewSize}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        crewSize: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={2}>2 movers</option>
                    <option value={3}>3 movers</option>
                    <option value={4}>4 movers</option>
                    <option value={5}>5 movers</option>
                    <option value={6}>6+ movers</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="estimatedDuration">
                    Estimated Duration (hours) *
                  </label>
                  <input
                    id="estimatedDuration"
                    type="number"
                    value={moveDetails.estimatedDuration}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        estimatedDuration: Number(e.target.value),
                      }))
                    }
                    min="1"
                    step="0.5"
                    className={
                      validationErrors.estimatedDuration
                        ? styles.fieldError
                        : ''
                    }
                  />
                  {validationErrors.estimatedDuration && (
                    <div className={styles.errorMessage}>
                      {validationErrors.estimatedDuration}
                    </div>
                  )}
                </div>

                <div className={styles.formGroupFull}>
                  <h4>Special Items</h4>
                  <div className={styles.checkboxGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.specialItems?.piano}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            specialItems: {
                              ...prev.specialItems!,
                              piano: e.target.checked,
                            },
                          }))
                        }
                      />
                      Piano
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.specialItems?.antiques}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            specialItems: {
                              ...prev.specialItems!,
                              antiques: e.target.checked,
                            },
                          }))
                        }
                      />
                      Antiques
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.specialItems?.artwork}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            specialItems: {
                              ...prev.specialItems!,
                              artwork: e.target.checked,
                            },
                          }))
                        }
                      />
                      Artwork
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fragileItems">Fragile Items Count</label>
                  <input
                    id="fragileItems"
                    type="number"
                    value={moveDetails.specialItems?.fragileItems}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        specialItems: {
                          ...prev.specialItems!,
                          fragileItems: Number(e.target.value),
                        },
                      }))
                    }
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="valuableItems">Valuable Items Count</label>
                  <input
                    id="valuableItems"
                    type="number"
                    value={moveDetails.specialItems?.valuableItems}
                    onChange={(e) =>
                      setMoveDetails((prev) => ({
                        ...prev,
                        specialItems: {
                          ...prev.specialItems!,
                          valuableItems: Number(e.target.value),
                        },
                      }))
                    }
                    min="0"
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <h4>Additional Services</h4>
                  <div className={styles.checkboxGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.additionalServices?.packing}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            additionalServices: {
                              ...prev.additionalServices!,
                              packing: e.target.checked,
                            },
                          }))
                        }
                      />
                      Packing
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.additionalServices?.unpacking}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            additionalServices: {
                              ...prev.additionalServices!,
                              unpacking: e.target.checked,
                            },
                          }))
                        }
                      />
                      Unpacking
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.additionalServices?.assembly}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            additionalServices: {
                              ...prev.additionalServices!,
                              assembly: e.target.checked,
                            },
                          }))
                        }
                      />
                      Assembly/Disassembly
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.additionalServices?.storage}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            additionalServices: {
                              ...prev.additionalServices!,
                              storage: e.target.checked,
                            },
                          }))
                        }
                      />
                      Storage
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={moveDetails.additionalServices?.cleaning}
                        onChange={(e) =>
                          setMoveDetails((prev) => ({
                            ...prev,
                            additionalServices: {
                              ...prev.additionalServices!,
                              cleaning: e.target.checked,
                            },
                          }))
                        }
                      />
                      Cleaning
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <h3>Review & Submit</h3>

              <div className={styles.reviewSection}>
                <h4>Customer Information</h4>
                <div className={styles.reviewGrid}>
                  <div>
                    <strong>Name:</strong> {customerData.firstName}{' '}
                    {customerData.lastName}
                  </div>
                  <div>
                    <strong>Email:</strong> {customerData.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {customerData.phone}
                  </div>
                  <div>
                    <strong>Type:</strong> {customerData.type}
                  </div>
                  {customerData.companyName && (
                    <div>
                      <strong>Company:</strong> {customerData.companyName}
                    </div>
                  )}
                  <div>
                    <strong>Source:</strong> {customerData.source}
                  </div>
                  <div>
                    <strong>Contact Method:</strong>{' '}
                    {customerData.preferredContactMethod}
                  </div>
                </div>
              </div>

              <div className={styles.reviewSection}>
                <h4>Move Details</h4>
                <div className={styles.reviewGrid}>
                  <div>
                    <strong>Service:</strong> {moveDetails.service}
                  </div>
                  <div>
                    <strong>Date:</strong>{' '}
                    {moveDetails.moveDate instanceof Date
                      ? moveDetails.moveDate.toLocaleDateString()
                      : 'N/A'}
                  </div>
                  <div>
                    <strong>Pickup:</strong> {moveDetails.pickup?.address}
                  </div>
                  <div>
                    <strong>Delivery:</strong> {moveDetails.delivery?.address}
                  </div>
                  <div>
                    <strong>Distance:</strong> {moveDetails.distance} miles
                  </div>
                  <div>
                    <strong>Duration:</strong> {moveDetails.estimatedDuration}{' '}
                    hours
                  </div>
                </div>
              </div>

              <div className={styles.reviewSection}>
                <h4>Inventory Summary</h4>
                <div className={styles.reviewGrid}>
                  <div>
                    <strong>Weight:</strong> {moveDetails.totalWeight} lbs
                  </div>
                  <div>
                    <strong>Volume:</strong> {moveDetails.totalVolume} cu ft
                  </div>
                  <div>
                    <strong>Crew Size:</strong> {moveDetails.crewSize} movers
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className={styles.navigationButtons}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                className={styles.secondaryButton}
                disabled={loading}
              >
                Previous
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className={styles.primaryButton}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={styles.primaryButton}
                disabled={loading}
              >
                {loading ? 'Creating Opportunity...' : 'Create Opportunity'}
              </button>
            )}
          </div>
        </div>

        {/* Price Summary Panel */}
        <div className={styles.priceSummary}>
          <h3>Estimate Summary</h3>

          {calculatingEstimate && (
            <div className={styles.calculating}>
              <div className={styles.spinner}></div>
              <p>Calculating estimate...</p>
            </div>
          )}

          {estimateResult && !calculatingEstimate && (
            <>
              <div className={styles.finalPrice}>
                <div className={styles.priceLabel}>Estimated Total</div>
                <div className={styles.priceValue}>
                  $
                  {estimateResult.calculations.finalPrice.toLocaleString(
                    'en-US',
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
              </div>

              <div className={styles.breakdown}>
                <h4>Price Breakdown</h4>
                <div className={styles.breakdownItem}>
                  <span>Base Labor</span>
                  <span>
                    $
                    {estimateResult.calculations.breakdown.baseLabor.toFixed(2)}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Materials</span>
                  <span>
                    $
                    {estimateResult.calculations.breakdown.materials.toFixed(2)}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Transportation</span>
                  <span>
                    $
                    {estimateResult.calculations.breakdown.transportation.toFixed(
                      2,
                    )}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Location Handicaps</span>
                  <span>
                    $
                    {estimateResult.calculations.breakdown.locationHandicaps.toFixed(
                      2,
                    )}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Special Services</span>
                  <span>
                    $
                    {estimateResult.calculations.breakdown.specialServices.toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>

              {estimateResult.calculations.appliedRules.length > 0 && (
                <div className={styles.appliedRules}>
                  <h4>Applied Pricing Rules</h4>
                  {estimateResult.calculations.appliedRules
                    .slice(0, 5)
                    .map((rule, index) => (
                      <div key={index} className={styles.ruleItem}>
                        <div className={styles.ruleName}>{rule.ruleName}</div>
                        <div className={styles.ruleImpact}>
                          {rule.priceImpact >= 0 ? '+' : ''}$
                          {rule.priceImpact.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  {estimateResult.calculations.appliedRules.length > 5 && (
                    <div className={styles.moreRules}>
                      +{estimateResult.calculations.appliedRules.length - 5}{' '}
                      more rules
                    </div>
                  )}
                </div>
              )}

              <div className={styles.metadata}>
                <div className={styles.metadataItem}>
                  <strong>Estimate ID:</strong>
                  <span>{estimateResult.estimateId.substring(0, 8)}...</span>
                </div>
                <div className={styles.metadataItem}>
                  <strong>Deterministic:</strong>
                  <span>
                    {estimateResult.metadata.deterministic ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </>
          )}

          {!estimateResult && !calculatingEstimate && (
            <div className={styles.noEstimate}>
              <p>Complete the form to see pricing estimate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
