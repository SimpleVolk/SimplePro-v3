#!/usr/bin/env node
/**
 * Standalone Tariff Settings Seeder CLI
 *
 * Usage:
 *   npm run seed:tariffs
 *   node dist/apps/api/database/seeders/run-seed.js
 *   ts-node apps/api/src/database/seeders/run-seed.ts
 *
 * Environment Variables:
 *   MONGODB_URI - MongoDB connection string (required)
 *   RESET_TARIFFS - If 'true', will delete existing default tariff and recreate
 */

import { config } from 'dotenv';
import * as mongoose from 'mongoose';
import * as path from 'path';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../../.env') });

import { TariffSettingsSchema } from '../../tariff-settings/schemas/tariff-settings.schema';
import {
  seedDefaultTariffSettings,
  validateSeededTariff,
  getTariffStatistics,
} from '../../tariff-settings/seed-data/seed-tariff-settings';

/**
 * Main seeding function
 */
async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const shouldReset = process.env.RESET_TARIFFS === 'true';

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI or DATABASE_URL environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  MONGODB_URI=mongodb://localhost:27017/simplepro npm run seed:tariffs');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           SimplePro - Tariff Settings Seeder                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in log
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Register the schema
    const TariffModel: any = mongoose.models.TariffSettings ||
      mongoose.model('TariffSettings', TariffSettingsSchema, 'tariff_settings');

    // Check for existing tariff
    const existingCount = await TariffModel.countDocuments({
      name: 'Default Tariff Settings',
    });

    if (existingCount > 0) {
      if (shouldReset) {
        console.log('🗑️  Deleting existing default tariff settings...');
        await TariffModel.deleteOne({ name: 'Default Tariff Settings' });
        console.log('✅ Existing tariff deleted');
        console.log('');
      } else {
        console.log('⚠️  Default tariff settings already exist');
        console.log('');
        console.log('Options:');
        console.log('  1. Use RESET_TARIFFS=true to delete and recreate');
        console.log('  2. Manually delete the existing tariff from MongoDB');
        console.log('  3. Skip seeding (recommended if tariff has custom modifications)');
        console.log('');

        // Show existing tariff info
        const existing: any = await TariffModel.findOne({ name: 'Default Tariff Settings' });
        if (existing) {
          console.log('📋 Existing Tariff Info:');
          console.log(`   ID: ${existing._id}`);
          console.log(`   Version: ${existing.version}`);
          console.log(`   Status: ${existing.status}`);
          console.log(`   Created: ${existing.createdAt}`);
          console.log(`   Updated: ${existing.updatedAt}`);
        }
        console.log('');

        await mongoose.disconnect();
        process.exit(0);
      }
    }

    // Seed the tariff
    console.log('🌱 Seeding default tariff settings...');
    console.log('');
    const tariff = await seedDefaultTariffSettings(TariffModel);

    // Validate the seeded data
    console.log('');
    console.log('🔍 Validating seeded data...');
    const isValid = validateSeededTariff(tariff);
    console.log('');

    if (!isValid) {
      console.warn('⚠️  Warning: Validation found some issues (see above)');
      console.log('');
    }

    // Get and display statistics
    const stats = getTariffStatistics(tariff);
    console.log('📈 Complete Statistics:');
    console.log('');
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    Seeding Completed Successfully                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Start the API server: npm run dev');
    console.log('  2. Access the tariff settings via API or web interface');
    console.log('  3. Customize pricing rules as needed for your business');
    console.log('');

    // Disconnect
    console.log('🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════════════╗');
    console.error('║                       Seeding Failed                               ║');
    console.error('╚════════════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error Details:');
    console.error(error);
    console.error('');

    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
}

// Run the seeder
main();