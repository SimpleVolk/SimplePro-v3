/**
 * Tariff Settings Schemas - Central Export
 *
 * This file provides a single import point for all tariff-related schemas.
 * Import schemas from here to simplify your module imports.
 *
 * Example:
 * import { TariffSettings, TariffSettingsSchema } from './schemas';
 */

// Main Schema
export { TariffSettings, TariffSettingsSchema, AuditLogEntry } from './tariff-settings.schema';
export type { TariffSettingsDocument } from './tariff-settings.schema';

// Subdocument Schemas
export { HourlyRates, HourlyRatesSchema, HourlyRate, CrewAbilityEntry, MinimumHours } from './hourly-rates.schema';
export { PackingRates, PackingRatesSchema, PackingRate } from './packing-rates.schema';
export { AutoPricing, AutoPricingSchema } from './auto-pricing.schema';
export { Material, MaterialSchema } from './material.schema';
export { MoveSize, MoveSizeSchema } from './move-size.schema';
export { RoomSize, RoomSizeSchema } from './room-size.schema';
export { Handicap, HandicapSchema } from './handicap.schema';
export { DistanceRate, DistanceRateSchema } from './distance-rate.schema';
export { PricingMethodDefault, PricingMethodDefaultSchema } from './pricing-method.schema';

// Re-export interfaces for convenience
export * from '../interfaces/tariff-settings.interface';