import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TariffStatus } from '../interfaces/tariff-settings.interface';
import { HourlyRates, HourlyRatesSchema } from './hourly-rates.schema';
import { PackingRates, PackingRatesSchema } from './packing-rates.schema';
import { AutoPricing, AutoPricingSchema } from './auto-pricing.schema';
import { Material, MaterialSchema } from './material.schema';
import { MoveSize, MoveSizeSchema } from './move-size.schema';
import { RoomSize, RoomSizeSchema } from './room-size.schema';
import { Handicap, HandicapSchema } from './handicap.schema';
import { DistanceRate, DistanceRateSchema } from './distance-rate.schema';
import {
  PricingMethodDefault,
  PricingMethodDefaultSchema,
} from './pricing-method.schema';

export type TariffSettingsDocument = TariffSettings & Document;

/**
 * Audit Log Entry Schema
 * Tracks all changes made to tariff settings
 */
@Schema({ _id: false })
export class AuditLogEntry {
  @Prop({ required: true, type: Date })
  timestamp!: Date;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ type: Object })
  changes?: Record<string, any>;
}

export const AuditLogEntrySchema = SchemaFactory.createForClass(AuditLogEntry);

/**
 * Main TariffSettings Schema
 * Comprehensive configuration for all pricing and tariff rules
 */
@Schema({ collection: 'tariff_settings', timestamps: true })
export class TariffSettings {
  // Metadata
  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(TariffStatus),
    default: TariffStatus.ACTIVE,
  })
  status!: TariffStatus;

  @Prop({ required: true, maxlength: 50, default: '1.0.0' })
  version!: string;

  @Prop({ required: true, type: Date, default: Date.now })
  effectiveFrom!: Date;

  @Prop({ type: Date })
  effectiveTo?: Date;

  // Embedded Pricing Components
  @Prop({
    type: HourlyRatesSchema,
    required: true,
    default: () => ({
      enabled: true,
      minimumHours: { weekday: 2, weekend: 3, holiday: 3 },
      rates: [] as any[],
      crewAbility: [] as any[],
    }),
  })
  hourlyRates!: HourlyRates;

  @Prop({
    type: PackingRatesSchema,
    required: true,
    default: () => ({ enabled: true, rates: [] as any[] }),
  })
  packingRates!: PackingRates;

  @Prop({
    type: AutoPricingSchema,
    required: true,
    default: () => ({
      enabled: true,
      maxHoursPerJob: 12,
      useCrewAbilityLimits: true,
      applyWeekendSurcharge: true,
      weekendSurchargePercent: 10,
      applyHolidaySurcharge: true,
      holidaySurchargePercent: 15,
    }),
  })
  autoPricing!: AutoPricing;

  // Arrays of Subdocuments
  @Prop({ type: [MaterialSchema], default: [] })
  materials!: Material[];

  @Prop({ type: [MoveSizeSchema], default: [] })
  moveSizes!: MoveSize[];

  @Prop({ type: [RoomSizeSchema], default: [] })
  roomSizes!: RoomSize[];

  @Prop({ type: [HandicapSchema], default: [] })
  handicaps!: Handicap[];

  @Prop({ type: [DistanceRateSchema], default: [] })
  distanceRates!: DistanceRate[];

  @Prop({ type: [PricingMethodDefaultSchema], default: [] })
  pricingMethods!: PricingMethodDefault[];

  // Audit Fields
  @Prop({ required: true })
  createdBy!: string;

  @Prop({ required: true })
  lastModifiedBy!: string;

  @Prop({ type: [AuditLogEntrySchema], default: [] })
  auditLog!: AuditLogEntry[];

  // Additional Metadata
  @Prop({ maxlength: 2000 })
  notes?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ required: true, default: false })
  isArchived!: boolean;
}

export const TariffSettingsSchema =
  SchemaFactory.createForClass(TariffSettings);

// ============================
// Indexes for Performance
// ============================

// Single field indexes
TariffSettingsSchema.index({ name: 1 });
TariffSettingsSchema.index({ version: 1 });
TariffSettingsSchema.index({ isActive: 1 });
TariffSettingsSchema.index({ status: 1 });
TariffSettingsSchema.index({ effectiveFrom: 1 });
TariffSettingsSchema.index({ effectiveTo: 1 });
TariffSettingsSchema.index({ createdBy: 1 });
TariffSettingsSchema.index({ lastModifiedBy: 1 });
TariffSettingsSchema.index({ tags: 1 });
TariffSettingsSchema.index({ isArchived: 1 });

// Compound indexes for common query patterns
TariffSettingsSchema.index({ isActive: 1, effectiveFrom: 1, effectiveTo: 1 });
TariffSettingsSchema.index({ status: 1, isActive: 1 });
TariffSettingsSchema.index({ name: 1, version: 1 });
TariffSettingsSchema.index({ isArchived: 1, isActive: 1 });

// Indexes for subdocument arrays
TariffSettingsSchema.index({
  'materials.isActive': 1,
  'materials.category': 1,
});
TariffSettingsSchema.index({ 'materials.sku': 1 }, { sparse: true });
TariffSettingsSchema.index({
  'handicaps.isActive': 1,
  'handicaps.category': 1,
});
TariffSettingsSchema.index({ 'moveSizes.isActive': 1 });
TariffSettingsSchema.index({ 'roomSizes.isActive': 1 });
TariffSettingsSchema.index({ 'distanceRates.isActive': 1 });
TariffSettingsSchema.index({
  'pricingMethods.enabled': 1,
  'pricingMethods.isDefault': 1,
});

// Text search index for comprehensive search
TariffSettingsSchema.index(
  {
    name: 'text',
    description: 'text',
    notes: 'text',
    'materials.name': 'text',
    'handicaps.name': 'text',
  },
  {
    weights: {
      name: 10,
      description: 5,
      'materials.name': 3,
      'handicaps.name': 3,
      notes: 1,
    },
    name: 'tariff_settings_text_search',
  },
);

// ============================
// Pre-save Middleware
// ============================

TariffSettingsSchema.pre('save', function (next) {
  // Update timestamp
  if (this.isModified()) {
    this.set({ updatedAt: new Date() });
  }

  // Validate date range
  if (this.effectiveTo && this.effectiveFrom > this.effectiveTo) {
    return next(new Error('effectiveTo must be after effectiveFrom'));
  }

  // Ensure only one default pricing method
  const defaultMethods = this.pricingMethods.filter((pm) => pm.isDefault);
  if (defaultMethods.length > 1) {
    return next(new Error('Only one pricing method can be set as default'));
  }

  next();
});

// ============================
// Virtual Fields
// ============================

// Calculate total active materials count
TariffSettingsSchema.virtual('activeMaterialsCount').get(function (
  this: TariffSettingsDocument,
) {
  return this.materials.filter((m) => m.isActive).length;
});

// Calculate total active handicaps count
TariffSettingsSchema.virtual('activeHandicapsCount').get(function (
  this: TariffSettingsDocument,
) {
  return this.handicaps.filter((h) => h.isActive).length;
});

// Check if tariff is currently effective
TariffSettingsSchema.virtual('isCurrentlyEffective').get(function (
  this: TariffSettingsDocument,
) {
  const now = new Date();
  const isAfterStart = this.effectiveFrom <= now;
  const isBeforeEnd = !this.effectiveTo || this.effectiveTo >= now;
  return this.isActive && isAfterStart && isBeforeEnd;
});

// Ensure virtual fields are serialized
TariffSettingsSchema.set('toJSON', { virtuals: true });
TariffSettingsSchema.set('toObject', { virtuals: true });

// ============================
// Instance Methods
// ============================

/**
 * Add an audit log entry
 */
TariffSettingsSchema.methods.addAuditEntry = function (
  userId: string,
  action: string,
  changes?: Record<string, any>,
): void {
  this.auditLog.push({
    timestamp: new Date(),
    userId,
    action,
    changes,
  });
};

/**
 * Get active hourly rate for a specific crew size
 */
TariffSettingsSchema.methods.getHourlyRateForCrew = function (
  crewSize: number,
) {
  if (!this.hourlyRates.enabled) {
    return null;
  }
  return this.hourlyRates.rates.find((rate: any) => rate.crewSize === crewSize);
};

/**
 * Get crew ability limits for a specific crew size
 */
TariffSettingsSchema.methods.getCrewAbility = function (crewSize: number) {
  return this.hourlyRates.crewAbility.find(
    (ca: any) => ca.crewSize === crewSize,
  );
};

/**
 * Get active materials by category
 */
TariffSettingsSchema.methods.getActiveMaterialsByCategory = function (
  category: string,
) {
  return this.materials.filter(
    (m: any) => m.isActive && m.category === category,
  );
};

/**
 * Get active handicaps by category
 */
TariffSettingsSchema.methods.getActiveHandicapsByCategory = function (
  category: string,
) {
  return this.handicaps.filter(
    (h: any) => h.isActive && h.category === category,
  );
};

/**
 * Get distance rate for specific mileage
 */
TariffSettingsSchema.methods.getDistanceRateForMiles = function (
  miles: number,
) {
  return this.distanceRates.find(
    (dr: any) => dr.isActive && miles >= dr.minMiles && miles <= dr.maxMiles,
  );
};

/**
 * Get default pricing method
 */
TariffSettingsSchema.methods.getDefaultPricingMethod = function () {
  return this.pricingMethods.find((pm: any) => pm.enabled && pm.isDefault);
};
