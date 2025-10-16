import { Module, Global } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DatabasePerformanceService } from './database-performance.service';
import { IndexOptimizationService } from './index-optimization.service';
import { TransactionService } from './transaction.service';
import { loadSecrets, SecretConfig } from '../config/secrets.config';

/**
 * Global Database Module
 *
 * This module provides MongoDB connection using Mongoose with:
 * - Secure secret loading with environment variable fallback
 * - Production-optimized connection pooling and timeouts
 * - Replica set support with write concerns
 * - Comprehensive database services (circuit breaker, performance monitoring, etc.)
 *
 * Architecture:
 * - Uses forRootAsync() for dynamic configuration loading
 * - Loads secrets from .secrets/ directory (production) or env vars (development)
 * - Global module - MongooseModule is available in all feature modules
 * - IndexOptimizationService runs onModuleInit() to create 50+ optimized indexes
 *
 * Environment Variables (Development Fallback):
 * - MONGODB_URI - Full connection string (required)
 * - MONGODB_REPLICA_SET - Replica set name (optional, for replica set mode)
 * - MONGODB_MAX_POOL_SIZE - Max connections (default: 100)
 * - MONGODB_MIN_POOL_SIZE - Min connections (default: 10)
 * - MONGODB_READ_PREFERENCE - Read preference (default: primary or secondaryPreferred)
 *
 * Production Secrets (.secrets/ directory):
 * - mongodb_username - MongoDB username
 * - mongodb_password - MongoDB password (validated for strength)
 * - DATABASE_URL - Full connection URI (overrides username/password if set)
 */

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (): Promise<MongooseModuleOptions> => {
        let mongoUri: string;
        let secrets: SecretConfig | null = null;

        try {
          // Step 1: Try to load from secure secrets configuration (production)
          secrets = loadSecrets();
          mongoUri = secrets.mongodb.uri;

          // Validate that we got a valid URI from secrets
          if (!mongoUri || mongoUri.length === 0) {
            throw new Error('MongoDB URI from secrets is empty');
          }
        } catch (secretsError) {
          // Step 2: Fallback to environment variable for development
          mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

          if (!mongoUri) {
            const errorMessage = secretsError instanceof Error ? secretsError.message : 'Unknown error';
            throw new Error(
              'No MongoDB URI found. ' +
              'For production: ensure secrets are configured via production-secrets.sh script. ' +
              'For development: set MONGODB_URI or DATABASE_URL environment variable. ' +
              'Example: mongodb://username:password@localhost:27017/database?authSource=admin. ' +
              `Original error: ${errorMessage}`,
            );
          }

          // Log that we're using fallback (but don't log the actual URI)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DatabaseModule] Using environment variable fallback for MongoDB URI');
          }
        }

        // Step 3: Security validation - check for unsafe credentials patterns
        const lowerUri = mongoUri.toLowerCase();
        const unsafePatterns = [
          'admin:admin',
          'root:root',
          'test:test',
          'mongo:mongo',
          'password:password',
        ];

        for (const pattern of unsafePatterns) {
          if (lowerUri.includes(pattern)) {
            throw new Error(
              'MongoDB connection string contains default/unsafe credentials pattern. ' +
              'Please use secure, unique credentials for production databases. ' +
              'Pattern detected: ' + pattern,
            );
          }
        }

        // Step 4: Build Mongoose connection options
        const mongooseOptions: MongooseModuleOptions = {
          uri: mongoUri,

          // Connection pooling settings - optimized for replica set
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '100', 10),
          minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '10', 10),
          maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '300000', 10), // 5 minutes

          // Connection timeout settings
          serverSelectionTimeoutMS: parseInt(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000',
            10,
          ),
          socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
          connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),

          // Write concern for data safety in replica set (required for transactions)
          retryWrites: true,
          writeConcern: {
            w: 'majority', // Ensure writes are replicated to majority of nodes
            j: true, // Ensure writes are journaled for durability
            wtimeout: parseInt(process.env.MONGODB_WRITE_TIMEOUT || '10000', 10),
          },

          // Read preferences for replica set
          // Options: primary, primaryPreferred, secondary, secondaryPreferred, nearest
          // Use secondaryPreferred for better read scaling (falls back to primary if secondaries unavailable)
          // Use primary or primaryPreferred for transactions
          // For standalone MongoDB (no replica set), use 'primary'
          readPreference: (process.env.MONGODB_READ_PREFERENCE as any) ||
            (process.env.MONGODB_REPLICA_SET ? 'secondaryPreferred' : 'primary'),
          readConcern: { level: 'majority' }, // Ensure reads return committed data

          // Replica set specific settings (only set if MONGODB_REPLICA_SET is defined and not empty)
          ...(process.env.MONGODB_REPLICA_SET && {
            replicaSet: process.env.MONGODB_REPLICA_SET
          }),

          // Network and performance settings
          family: 4, // Use IPv4, skip trying IPv6

          // Heartbeat frequency for replica set monitoring
          heartbeatFrequencyMS: 10000, // Check replica set health every 10 seconds

          // Authentication and SSL
          authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
          tls: process.env.MONGODB_SSL === 'true',

          // Application metadata
          appName: 'SimplePro-v3-API',

          // Additional performance settings
          // maxStalenessSeconds: Only valid for secondary read preferences
          // Defines maximum replication lag acceptable for reads from secondaries
          ...(process.env.MONGODB_READ_PREFERENCE !== 'primary' && {
            maxStalenessSeconds: 90, // Accept up to 90 seconds of replication lag
          }),
          localThresholdMS: 15, // Latency window for server selection (15ms)

          // Connection monitoring
          serverMonitoringMode: 'auto' as any, // Automatic monitoring mode
        };

        return mongooseOptions;
      },
    }),
  ],
  providers: [
    CircuitBreakerService,
    DatabasePerformanceService,
    IndexOptimizationService,
    TransactionService,
  ],
  exports: [
    MongooseModule,
    CircuitBreakerService,
    DatabasePerformanceService,
    IndexOptimizationService,
    TransactionService,
  ],
})
export class DatabaseModule {}
