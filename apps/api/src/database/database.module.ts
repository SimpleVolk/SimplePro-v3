import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DatabasePerformanceService } from './database-performance.service';
import { IndexOptimizationService } from './index-optimization.service';
import { loadSecrets } from '../config/secrets.config';

@Module({
  imports: [
    MongooseModule.forRoot(
      (() => {
        try {
          // Try to load from secure secrets configuration
          const secrets = loadSecrets();
          return secrets.mongodb.uri;
        } catch (error) {
          // Fallback to environment variable for development
          const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
          if (!mongoUri) {
            throw new Error(
              'MongoDB configuration failed. ' +
              'For production: ensure secrets are configured via production-secrets.sh script. ' +
              'For development: set MONGODB_URI or DATABASE_URL environment variable. ' +
              'Example: mongodb://username:password@localhost:27017/database'
            );
          }

          // Validate that the URI doesn't contain obvious default credentials
          if (mongoUri.includes('admin:admin') || mongoUri.includes('root:root') || mongoUri.includes('test:test')) {
            throw new Error(
              'MongoDB connection string contains default credentials. ' +
              'Please use secure, unique credentials for production databases.'
            );
          }

          return mongoUri;
        }
      })(),
      {
        // Connection pooling settings
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
        maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '300000', 10), // 5 minutes

        // Connection timeout settings
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
        connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),

        // Write concern for data safety
        retryWrites: true,
        writeConcern: {
          w: 'majority',
          j: true,
          wtimeout: parseInt(process.env.MONGODB_WRITE_TIMEOUT || '10000', 10)
        },

        // Read preferences for performance
        readPreference: (process.env.MONGODB_READ_PREFERENCE as any) || 'primary',
        readConcern: { level: 'majority' },

        // Network and performance settings
        family: 4, // Use IPv4, skip trying IPv6

        // Authentication and SSL
        authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
        tls: process.env.MONGODB_SSL === 'true',

        // Application metadata
        appName: 'SimplePro-v3-API',

        // Additional performance settings
        // maxStalenessSeconds is only valid for secondary read preferences
        // Removed as we're using primary read preference
        localThresholdMS: 15, // Latency window for server selection
      }
    ),
  ],
  providers: [
    CircuitBreakerService,
    DatabasePerformanceService,
    IndexOptimizationService
  ],
  exports: [
    MongooseModule,
    CircuitBreakerService,
    DatabasePerformanceService,
    IndexOptimizationService
  ],
})
export class DatabaseModule {}