import { Model } from 'mongoose';
import { defaultTariffData } from './default-tariff-data';
import { TariffSettings } from '../schemas/tariff-settings.schema';

/**
 * Seed Default Tariff Settings
 *
 * This function creates the default tariff settings if they don't already exist.
 * It's idempotent - safe to run multiple times.
 *
 * @param tariffModel - Mongoose model for TariffSettings
 * @returns Promise<TariffSettings> - The created or existing tariff settings
 */
export async function seedDefaultTariffSettings(
  tariffModel: Model<TariffSettings>
): Promise<TariffSettings> {
  try {
    // Check if default tariff already exists
    const existingTariff = await tariffModel.findOne({
      name: defaultTariffData.name,
    });

    if (existingTariff) {
      console.log('✅ Default tariff settings already exist');
      console.log(`   ID: ${existingTariff._id}`);
      console.log(`   Version: ${existingTariff.version}`);
      console.log(`   Status: ${existingTariff.status}`);
      return existingTariff;
    }

    // Create new default tariff
    console.log('🌱 Creating default tariff settings...');
    const tariff = new tariffModel(defaultTariffData);
    await tariff.save();

    console.log('✅ Default tariff settings created successfully');
    console.log(`   ID: ${tariff._id}`);
    console.log(`   Name: ${tariff.name}`);
    console.log(`   Version: ${tariff.version}`);
    console.log(`   Status: ${tariff.status}`);
    console.log('');
    console.log('📊 Seeded Data Summary:');
    console.log(`   ├─ Hourly Rates: ${tariff.hourlyRates.rates.length} crew sizes configured`);
    console.log(`   ├─ Crew Abilities: ${tariff.hourlyRates.crewAbility.length} crew capacities`);
    console.log(`   ├─ Packing Rates: ${tariff.packingRates.rates.length} rate configurations`);
    console.log(`   ├─ Materials: ${tariff.materials.length} items`);
    console.log(`   ├─ Move Sizes: ${tariff.moveSizes.length} categories`);
    console.log(`   ├─ Room Sizes: ${tariff.roomSizes.length} room types`);
    console.log(`   ├─ Handicaps: ${tariff.handicaps.length} access difficulty types`);
    console.log(`   ├─ Distance Rates: ${tariff.distanceRates.length} distance tiers`);
    console.log(`   └─ Pricing Methods: ${tariff.pricingMethods.length} methods configured`);
    console.log('');

    // Log active items breakdown
    const activeMaterials = tariff.materials.filter(m => m.isActive).length;
    const activeHandicaps = tariff.handicaps.filter(h => h.isActive).length;
    const activeMoveSizes = tariff.moveSizes.filter(ms => ms.isActive).length;

    console.log('🎯 Active Items:');
    console.log(`   ├─ Materials: ${activeMaterials}/${tariff.materials.length}`);
    console.log(`   ├─ Handicaps: ${activeHandicaps}/${tariff.handicaps.length}`);
    console.log(`   └─ Move Sizes: ${activeMoveSizes}/${tariff.moveSizes.length}`);
    console.log('');

    // Log pricing configuration
    console.log('💰 Pricing Configuration:');
    console.log(`   ├─ Hourly Rates: ${tariff.hourlyRates.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   ├─ Packing Rates: ${tariff.packingRates.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   ├─ Auto Pricing: ${tariff.autoPricing.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   ├─ Max Hours/Job: ${tariff.autoPricing.maxHoursPerJob}`);
    console.log(`   ├─ Weekend Surcharge: ${tariff.autoPricing.weekendSurchargePercent}%`);
    console.log(`   └─ Holiday Surcharge: ${tariff.autoPricing.holidaySurchargePercent}%`);
    console.log('');

    return tariff;
  } catch (error) {
    console.error('❌ Error seeding default tariff settings:', error);
    throw error;
  }
}

/**
 * Validate Seeded Data
 *
 * Performs validation checks on the seeded tariff data
 *
 * @param tariff - The seeded tariff settings
 * @returns boolean - True if validation passes
 */
export function validateSeededTariff(tariff: TariffSettings): boolean {
  const errors: string[] = [];

  // Validate hourly rates
  if (tariff.hourlyRates.rates.length === 0) {
    errors.push('No hourly rates configured');
  }

  // Validate crew abilities match hourly rates
  if (tariff.hourlyRates.rates.length !== tariff.hourlyRates.crewAbility.length) {
    errors.push('Crew abilities count does not match hourly rates count');
  }

  // Validate materials
  if (tariff.materials.length === 0) {
    errors.push('No materials configured');
  }

  // Validate move sizes
  if (tariff.moveSizes.length === 0) {
    errors.push('No move sizes configured');
  }

  // Validate room sizes
  if (tariff.roomSizes.length === 0) {
    errors.push('No room sizes configured');
  }

  // Validate handicaps
  if (tariff.handicaps.length === 0) {
    errors.push('No handicaps configured');
  }

  // Validate pricing methods - at least one should be default
  const defaultMethod = tariff.pricingMethods.find(pm => pm.isDefault);
  if (!defaultMethod) {
    errors.push('No default pricing method configured');
  }

  // Validate enabled pricing methods
  const enabledMethods = tariff.pricingMethods.filter(pm => pm.enabled);
  if (enabledMethods.length === 0) {
    errors.push('No enabled pricing methods');
  }

  // Log validation results
  if (errors.length > 0) {
    console.error('⚠️  Validation Warnings:');
    errors.forEach(error => console.error(`   - ${error}`));
    return false;
  }

  console.log('✅ All validation checks passed');
  return true;
}

/**
 * Update Existing Tariff (if needed)
 *
 * Updates an existing tariff with new data while preserving custom modifications
 *
 * @param tariffModel - Mongoose model for TariffSettings
 * @param tariffId - ID of the tariff to update
 * @returns Promise<TariffSettings | null>
 */
export async function updateExistingTariff(
  tariffModel: Model<TariffSettings>,
  tariffId: string
): Promise<TariffSettings | null> {
  try {
    const tariff = await tariffModel.findById(tariffId);

    if (!tariff) {
      console.error(`❌ Tariff with ID ${tariffId} not found`);
      return null;
    }

    console.log(`🔄 Updating tariff: ${tariff.name}`);

    // Add audit log entry
    tariff.auditLog.push({
      timestamp: new Date(),
      userId: 'system',
      action: 'UPDATE_FROM_SEED',
      changes: {
        operation: 'update',
        description: 'Updated from seed data',
      },
    });

    await tariff.save();

    console.log('✅ Tariff updated successfully');
    return tariff;
  } catch (error) {
    console.error('❌ Error updating tariff:', error);
    throw error;
  }
}

/**
 * Get Tariff Statistics
 *
 * Returns useful statistics about the tariff configuration
 *
 * @param tariff - The tariff settings
 * @returns Object with statistics
 */
export function getTariffStatistics(tariff: TariffSettings) {
  return {
    metadata: {
      name: tariff.name,
      version: tariff.version,
      status: tariff.status,
      isActive: tariff.isActive,
      effectiveFrom: tariff.effectiveFrom,
      effectiveTo: tariff.effectiveTo,
    },
    counts: {
      hourlyRates: tariff.hourlyRates.rates.length,
      crewAbilities: tariff.hourlyRates.crewAbility.length,
      packingRates: tariff.packingRates.rates.length,
      materials: {
        total: tariff.materials.length,
        active: tariff.materials.filter(m => m.isActive).length,
        byCategory: {
          box: tariff.materials.filter(m => m.category === 'box').length,
          packing: tariff.materials.filter(m => m.category === 'packing').length,
          protection: tariff.materials.filter(m => m.category === 'protection').length,
          specialty: tariff.materials.filter(m => m.category === 'specialty').length,
          equipment: tariff.materials.filter(m => m.category === 'equipment').length,
        },
      },
      moveSizes: {
        total: tariff.moveSizes.length,
        active: tariff.moveSizes.filter(ms => ms.isActive).length,
      },
      roomSizes: {
        total: tariff.roomSizes.length,
        active: tariff.roomSizes.filter(rs => rs.isActive).length,
      },
      handicaps: {
        total: tariff.handicaps.length,
        active: tariff.handicaps.filter(h => h.isActive).length,
        byCategory: {
          stairs: tariff.handicaps.filter(h => h.category === 'stairs').length,
          elevator: tariff.handicaps.filter(h => h.category === 'elevator').length,
          parking: tariff.handicaps.filter(h => h.category === 'parking').length,
          access: tariff.handicaps.filter(h => h.category === 'access').length,
          location: tariff.handicaps.filter(h => h.category === 'location').length,
          seasonal: tariff.handicaps.filter(h => h.category === 'seasonal').length,
        },
      },
      distanceRates: {
        total: tariff.distanceRates.length,
        active: tariff.distanceRates.filter(dr => dr.isActive).length,
      },
      pricingMethods: {
        total: tariff.pricingMethods.length,
        enabled: tariff.pricingMethods.filter(pm => pm.enabled).length,
        default: tariff.pricingMethods.filter(pm => pm.isDefault).length,
      },
    },
    pricing: {
      hourlyRatesEnabled: tariff.hourlyRates.enabled,
      packingRatesEnabled: tariff.packingRates.enabled,
      autoPricingEnabled: tariff.autoPricing.enabled,
      maxHoursPerJob: tariff.autoPricing.maxHoursPerJob,
      weekendSurcharge: tariff.autoPricing.weekendSurchargePercent,
      holidaySurcharge: tariff.autoPricing.holidaySurchargePercent,
    },
    audit: {
      createdBy: tariff.createdBy,
      lastModifiedBy: tariff.lastModifiedBy,
      auditLogEntries: tariff.auditLog?.length || 0,
    },
  };
}