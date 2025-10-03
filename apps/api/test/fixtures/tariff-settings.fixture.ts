/**
 * Tariff Settings Test Fixtures
 *
 * Provides realistic test data for tariff settings service testing.
 */

import { CreateTariffSettingsDto } from '../../src/tariff-settings/dto/create-tariff-settings.dto';
import { generateObjectId } from '../utils/test-helpers';

/**
 * Base tariff settings
 */
export const baseTariffSettings: CreateTariffSettingsDto = {
  name: 'Standard Tariff 2025',
  version: '1.0.0',
  description: 'Standard pricing for 2025',
  effectiveFrom: new Date('2025-01-01'),
  effectiveTo: new Date('2025-12-31'),
  isActive: true,
  status: 'active',
  pricingMethods: [
    {
      id: 'hourly',
      name: 'Hourly Rate',
      description: 'Charge by the hour',
      isDefault: true,
      isActive: true,
    },
  ],
  hourlyRates: {
    enabled: true,
    baseHourlyRate: 120,
    rates: [
      { crewSize: 2, hourlyRate: 120, minimumHours: 2 },
      { crewSize: 3, hourlyRate: 180, minimumHours: 2 },
      { crewSize: 4, hourlyRate: 240, minimumHours: 3 },
    ],
  },
  packingRates: {
    enabled: true,
    standardBoxPrice: 3.5,
    largeBoxPrice: 5.0,
    wardrobeBoxPrice: 12.0,
    packingPaperPerPound: 1.5,
    bubbleWrapPerRoll: 25.0,
  },
  autoPricing: {
    enabled: true,
    defaultMargin: 20,
    minimumJobValue: 200,
  },
  materials: [],
  moveSizes: [],
  roomSizes: [],
  handicaps: [],
  distanceRates: [],
};

/**
 * Tariff settings with materials
 */
export const tariffWithMaterials: CreateTariffSettingsDto = {
  ...baseTariffSettings,
  materials: [
    {
      id: 'mat_box_small',
      name: 'Small Box',
      category: 'boxes',
      price: 3.0,
      cost: 1.5,
      unit: 'each',
      isActive: true,
      inStock: true,
    },
    {
      id: 'mat_box_large',
      name: 'Large Box',
      category: 'boxes',
      price: 5.0,
      cost: 2.5,
      unit: 'each',
      isActive: true,
      inStock: true,
    },
    {
      id: 'mat_tape',
      name: 'Packing Tape',
      category: 'supplies',
      price: 4.5,
      cost: 2.0,
      unit: 'roll',
      isActive: true,
      inStock: true,
    },
  ],
};

/**
 * Tariff settings with move sizes
 */
export const tariffWithMoveSizes: CreateTariffSettingsDto = {
  ...baseTariffSettings,
  moveSizes: [
    {
      id: 'size_studio',
      name: 'Studio',
      description: 'Studio apartment',
      estimatedVolume: 400,
      estimatedWeight: 2000,
      recommendedCrewSize: 2,
      estimatedDuration: 4,
      isActive: true,
    },
    {
      id: 'size_1br',
      name: '1 Bedroom',
      description: 'One bedroom apartment',
      estimatedVolume: 600,
      estimatedWeight: 3000,
      recommendedCrewSize: 2,
      estimatedDuration: 6,
      isActive: true,
    },
  ],
};

/**
 * Tariff settings with handicaps
 */
export const tariffWithHandicaps: CreateTariffSettingsDto = {
  ...baseTariffSettings,
  handicaps: [
    {
      id: 'hcp_stairs',
      name: 'Stairs (per flight)',
      category: 'stairs',
      description: 'Additional charge per flight of stairs',
      handicapType: 'per_unit',
      fixedFee: 25,
      percentageFee: 0,
      isActive: true,
    },
    {
      id: 'hcp_long_carry',
      name: 'Long Carry',
      category: 'distance',
      description: 'Items must be carried more than 75 feet',
      handicapType: 'fixed',
      fixedFee: 75,
      percentageFee: 0,
      isActive: true,
    },
  ],
};

/**
 * Tariff settings with distance rates
 */
export const tariffWithDistanceRates: CreateTariffSettingsDto = {
  ...baseTariffSettings,
  distanceRates: [
    {
      id: 'dist_local',
      name: 'Local (0-50 miles)',
      description: 'Local move rate',
      minDistance: 0,
      maxDistance: 50,
      ratePerMile: 2.0,
      minimumCharge: 100,
      isActive: true,
    },
    {
      id: 'dist_long',
      name: 'Long Distance (50+ miles)',
      description: 'Long distance move rate',
      minDistance: 50,
      maxDistance: 500,
      ratePerMile: 3.5,
      minimumCharge: 500,
      isActive: true,
    },
  ],
};

/**
 * Inactive tariff settings
 */
export const inactiveTariffSettings: CreateTariffSettingsDto = {
  ...baseTariffSettings,
  name: 'Inactive Tariff',
  isActive: false,
  status: 'inactive',
};

/**
 * Draft tariff settings
 */
export const draftTariffSettings: CreateTariffSettingsDto = {
  ...baseTariffSettings,
  name: 'Draft Tariff 2026',
  isActive: false,
  status: 'draft',
  effectiveFrom: new Date('2026-01-01'),
  effectiveTo: new Date('2026-12-31'),
};

/**
 * Mock tariff settings document
 */
export function createMockTariffSettings(overrides: any = {}) {
  return {
    _id: generateObjectId(),
    id: generateObjectId(),
    ...baseTariffSettings,
    createdBy: generateObjectId(),
    lastModifiedBy: generateObjectId(),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
    save: jest.fn().mockResolvedValue({
      _id: overrides._id || generateObjectId(),
      ...baseTariffSettings,
      ...overrides,
    }),
    toObject: jest.fn().mockReturnValue({
      _id: overrides._id || generateObjectId(),
      ...baseTariffSettings,
      ...overrides,
    }),
  };
}

/**
 * Material DTOs
 */
export const materialDtos = {
  smallBox: {
    name: 'Small Box',
    category: 'boxes',
    price: 3.0,
    cost: 1.5,
    unit: 'each',
  },
  tape: {
    name: 'Packing Tape',
    category: 'supplies',
    price: 4.5,
    cost: 2.0,
    unit: 'roll',
  },
};

/**
 * Handicap DTOs
 */
export const handicapDtos = {
  stairs: {
    name: 'Stairs (per flight)',
    category: 'stairs',
    description: 'Additional charge per flight of stairs',
    handicapType: 'per_unit',
    fixedFee: 25,
    percentageFee: 0,
  },
  elevator: {
    name: 'Elevator Wait Time',
    category: 'access',
    description: 'Additional time for elevator availability',
    handicapType: 'fixed',
    fixedFee: 50,
    percentageFee: 0,
  },
};

/**
 * Move size DTOs
 */
export const moveSizeDtos = {
  studio: {
    name: 'Studio',
    description: 'Studio apartment',
    estimatedVolume: 400,
    estimatedWeight: 2000,
    recommendedCrewSize: 2,
    estimatedDuration: 4,
  },
  oneBedroom: {
    name: '1 Bedroom',
    description: 'One bedroom apartment',
    estimatedVolume: 600,
    estimatedWeight: 3000,
    recommendedCrewSize: 2,
    estimatedDuration: 6,
  },
};

/**
 * Validation test cases
 */
export const validationTestCases = {
  invalidDateRange: {
    ...baseTariffSettings,
    effectiveFrom: new Date('2025-12-31'),
    effectiveTo: new Date('2025-01-01'), // Invalid: end before start
  },
  missingDefaultPricingMethod: {
    ...baseTariffSettings,
    pricingMethods: [
      {
        id: 'hourly',
        name: 'Hourly Rate',
        description: 'Charge by the hour',
        isDefault: false, // No default method
        isActive: true,
      },
    ],
  },
  emptyHourlyRates: {
    ...baseTariffSettings,
    hourlyRates: {
      enabled: true,
      baseHourlyRate: 120,
      rates: [], // Empty rates array
    },
  },
};
