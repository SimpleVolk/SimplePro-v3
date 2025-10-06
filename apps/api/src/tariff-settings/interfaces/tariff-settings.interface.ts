import { Document } from 'mongoose';

/**
 * Enum Types
 */
export enum PricingMethodType {
  HOURLY = 'hourly',
  WEIGHT_BASED = 'weight_based',
  VOLUME_BASED = 'volume_based',
  FLAT_RATE = 'flat_rate',
  DISTANCE_BASED = 'distance_based',
}

export enum HandicapCategory {
  STAIRS = 'stairs',
  ELEVATOR = 'elevator',
  PARKING = 'parking',
  ACCESS = 'access',
  LOCATION = 'location',
  SEASONAL = 'seasonal',
}

export enum MaterialCategory {
  BOX = 'box',
  PACKING = 'packing',
  PROTECTION = 'protection',
  SPECIALTY = 'specialty',
  EQUIPMENT = 'equipment',
}

export enum TariffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

/**
 * Subdocument Interfaces
 */

// Hourly Rates
export interface IHourlyRate {
  crewSize: number;
  baseRate: number;
  weekendRate?: number;
  holidayRate?: number;
  overtimeMultiplier?: number;
}

export interface ICrewAbilityEntry {
  crewSize: number;
  maxCubicFeet: number;
  maxWeightLbs: number;
}

export interface IHourlyRates {
  enabled: boolean;
  minimumHours: {
    weekday: number;
    weekend: number;
    holiday: number;
  };
  rates: IHourlyRate[];
  crewAbility: ICrewAbilityEntry[];
}

// Packing Rates
export interface IPackingRate {
  itemType: string;
  description: string;
  rate: number;
  unit: string;
  category: string;
}

export interface IPackingRates {
  enabled: boolean;
  rates: IPackingRate[];
}

// Auto Pricing
export interface IAutoPricing {
  enabled: boolean;
  maxHoursPerJob: number;
  useCrewAbilityLimits: boolean;
  applyWeekendSurcharge: boolean;
  weekendSurchargePercent: number;
  applyHolidaySurcharge: boolean;
  holidaySurchargePercent: number;
}

// Material
export interface IMaterial {
  id: string;
  name: string;
  description?: string;
  category: MaterialCategory;
  unitPrice: number;
  unit: string;
  isActive: boolean;
  inStock: boolean;
  stockQuantity?: number;
  minQuantity?: number;
  reorderPoint?: number;
  supplier?: string;
  sku?: string;
  notes?: string;
}

// Move Size
export interface IMoveSize {
  id: string;
  name: string;
  description?: string;
  minCubicFeet: number;
  maxCubicFeet: number;
  minWeightLbs: number;
  maxWeightLbs: number;
  recommendedCrewSize: number;
  estimatedHours: number;
  isActive: boolean;
}

// Room Size
export interface IRoomSize {
  id: string;
  name: string;
  description?: string;
  cubicFeet: number;
  weightLbs: number;
  commonItems: string[];
  isActive: boolean;
}

// Handicap
export interface IHandicap {
  id: string;
  name: string;
  description?: string;
  category: HandicapCategory;
  type: 'fixed_fee' | 'percentage' | 'per_unit';
  value: number;
  unit?: string;
  isActive: boolean;
  appliesTo: ('pickup' | 'delivery' | 'both')[];
  notes?: string;
}

// Distance Rate
export interface IDistanceRate {
  id: string;
  name: string;
  description?: string;
  minMiles: number;
  maxMiles: number;
  ratePerMile: number;
  minimumCharge?: number;
  isActive: boolean;
}

// Pricing Method Default
export interface IPricingMethodDefault {
  method: PricingMethodType;
  enabled: boolean;
  isDefault: boolean;
  configuration?: Record<string, any>;
}

/**
 * Main TariffSettings Interface
 */
export interface ITariffSettings extends Document {
  // Metadata
  name: string;
  description?: string;
  isActive: boolean;
  status: TariffStatus;
  version: string;
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Embedded Pricing Components
  hourlyRates: IHourlyRates;
  packingRates: IPackingRates;
  autoPricing: IAutoPricing;

  // Arrays of Subdocuments
  materials: IMaterial[];
  moveSizes: IMoveSize[];
  roomSizes: IRoomSize[];
  handicaps: IHandicap[];
  distanceRates: IDistanceRate[];
  pricingMethods: IPricingMethodDefault[];

  // Audit Fields
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
  auditLog?: {
    timestamp: Date;
    userId: string;
    action: string;
    changes?: Record<string, any>;
  }[];

  // Metadata
  notes?: string;
  tags?: string[];
  isArchived: boolean;
}
