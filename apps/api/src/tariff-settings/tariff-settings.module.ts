import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TariffSettingsController } from './tariff-settings.controller';
import { TariffSettingsService } from './tariff-settings.service';
import {
  TariffSettings,
  TariffSettingsSchema,
} from './schemas/tariff-settings.schema';
import { AuthModule } from '../auth/auth.module';
import { TariffSettingsSeeder } from '../database/seeders/tariff-settings.seeder';

/**
 * TariffSettings Module
 *
 * Manages all pricing and tariff configuration for the moving company.
 * Provides comprehensive CRUD operations for tariff settings and all
 * subdocument collections (materials, handicaps, move sizes, etc.).
 *
 * Features:
 * - Complete tariff settings management (CRUD)
 * - Hourly rates configuration with crew size support
 * - Packing rates and material pricing
 * - Auto-pricing configuration
 * - Materials inventory management
 * - Move sizes and room sizes definitions
 * - Location handicaps (stairs, parking, access, etc.)
 * - Distance-based pricing rates
 * - Pricing method defaults
 * - Validation and cloning capabilities
 * - Active tariff caching for performance
 *
 * Security:
 * - JWT authentication required for all endpoints
 * - Role-based access control (RBAC)
 * - Granular permissions (read, create, update, delete, activate)
 * - Rate limiting to prevent abuse
 * - Audit logging for all changes
 *
 * Performance:
 * - In-memory caching of active tariff settings
 * - Comprehensive MongoDB indexing
 * - Text search capabilities
 * - Optimized query patterns
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TariffSettings.name, schema: TariffSettingsSchema },
    ]),
    AuthModule, // For authentication and authorization
  ],
  controllers: [TariffSettingsController],
  providers: [TariffSettingsService, TariffSettingsSeeder],
  exports: [TariffSettingsService, TariffSettingsSeeder], // Export service and seeder for use in other modules
})
export class TariffSettingsModule {}