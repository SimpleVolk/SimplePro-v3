import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TariffSettings } from '../../tariff-settings/schemas/tariff-settings.schema';
import {
  seedDefaultTariffSettings,
  validateSeededTariff,
  getTariffStatistics,
} from '../../tariff-settings/seed-data/seed-tariff-settings';

/**
 * Tariff Settings Seeder
 *
 * NestJS-compatible seeder for initializing default tariff settings
 * Can be run:
 * 1. Automatically on application startup (if SEED_DATA=true)
 * 2. Manually via CLI or admin interface
 * 3. As part of deployment scripts
 */
@Injectable()
export class TariffSettingsSeeder {
  private readonly logger = new Logger(TariffSettingsSeeder.name);

  constructor(
    @InjectModel(TariffSettings.name)
    private readonly tariffModel: Model<TariffSettings>,
  ) {}

  /**
   * Seed default tariff settings
   *
   * @returns Promise<boolean> - True if seeding was successful
   */
  async seed(): Promise<boolean> {
    try {
      this.logger.log('🌱 Starting tariff settings seed process...');
      this.logger.log('');

      // Seed the default tariff
      const tariff = await seedDefaultTariffSettings(this.tariffModel);

      // Validate the seeded data
      const isValid = validateSeededTariff(tariff);

      if (!isValid) {
        this.logger.warn(
          '⚠️  Tariff validation failed - please review warnings',
        );
      }

      // Get and log statistics
      const stats = getTariffStatistics(tariff);
      this.logger.log('');
      this.logger.log('📈 Tariff Statistics:');
      this.logger.log(JSON.stringify(stats, null, 2));
      this.logger.log('');

      this.logger.log('✅ Tariff settings seed process completed successfully');
      return true;
    } catch (error) {
      this.logger.error('❌ Error during tariff settings seed process:', error);
      return false;
    }
  }

  /**
   * Check if default tariff exists
   *
   * @returns Promise<boolean> - True if default tariff exists
   */
  async hasDefaultTariff(): Promise<boolean> {
    try {
      const count = await this.tariffModel.countDocuments({
        name: 'Default Tariff Settings',
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking for default tariff:', error);
      return false;
    }
  }

  /**
   * Get default tariff
   *
   * @returns Promise<TariffSettings | null>
   */
  async getDefaultTariff(): Promise<TariffSettings | null> {
    try {
      return await this.tariffModel.findOne({
        name: 'Default Tariff Settings',
      });
    } catch (error) {
      this.logger.error('Error fetching default tariff:', error);
      return null;
    }
  }

  /**
   * Reset default tariff (delete and recreate)
   *
   * @returns Promise<boolean> - True if reset was successful
   */
  async reset(): Promise<boolean> {
    try {
      this.logger.log('🔄 Resetting default tariff settings...');

      // Delete existing default tariff
      await this.tariffModel.deleteOne({
        name: 'Default Tariff Settings',
      });

      this.logger.log('🗑️  Existing default tariff deleted');

      // Seed fresh data
      const success = await this.seed();

      if (success) {
        this.logger.log('✅ Default tariff settings reset successfully');
      }

      return success;
    } catch (error) {
      this.logger.error('❌ Error resetting default tariff:', error);
      return false;
    }
  }

  /**
   * Validate existing tariff data
   *
   * @returns Promise<boolean> - True if validation passes
   */
  async validate(): Promise<boolean> {
    try {
      const tariff = await this.getDefaultTariff();

      if (!tariff) {
        this.logger.warn('⚠️  No default tariff found');
        return false;
      }

      this.logger.log('🔍 Validating default tariff settings...');
      const isValid = validateSeededTariff(tariff);

      if (isValid) {
        this.logger.log('✅ Validation passed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('❌ Error validating tariff:', error);
      return false;
    }
  }

  /**
   * Get statistics about seeded data
   *
   * @returns Promise<object | null> - Statistics object or null
   */
  async getStatistics(): Promise<object | null> {
    try {
      const tariff = await this.getDefaultTariff();

      if (!tariff) {
        this.logger.warn('⚠️  No default tariff found');
        return null;
      }

      return getTariffStatistics(tariff);
    } catch (error) {
      this.logger.error('❌ Error getting statistics:', error);
      return null;
    }
  }
}

/**
 * Standalone Seeder Function
 *
 * Can be called directly from scripts without NestJS dependency injection
 *
 * @param mongoUri - MongoDB connection string
 * @returns Promise<boolean> - True if seeding was successful
 */
export async function runTariffSeeder(mongoUri: string): Promise<boolean> {
  const mongoose = require('mongoose');

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Get model
    const TariffModel = mongoose.model('TariffSettings');

    // Run seed
    await seedDefaultTariffSettings(TariffModel);

    console.log('');
    console.log('✅ Seeding completed successfully');
    console.log('🔌 Disconnecting from MongoDB...');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

    return true;
  } catch (error) {
    console.error('❌ Seeding failed:', error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    return false;
  }
}
