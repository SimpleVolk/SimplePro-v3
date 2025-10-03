import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DatabasePerformanceService } from './database-performance.service';
import { IndexOptimizationService } from './index-optimization.service';
import { TransactionService } from './transaction.service';
import { loadSecrets } from '../config/secrets.config';

@Global()
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
        // Connection pooling settings - optimized for replica set
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '100', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '10', 10),
        maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '300000', 10), // 5 minutes

        // Connection timeout settings
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
        connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),

        // Write concern for data safety in replica set (required for transactions)
        retryWrites: true,
        writeConcern: {
          w: 'majority', // Ensure writes are replicated to majority of nodes
          j: true, // Ensure writes are journaled for durability
          wtimeout: parseInt(process.env.MONGODB_WRITE_TIMEOUT || '10000', 10)
        },

        // Read preferences for replica set
        // Options: primary, primaryPreferred, secondary, secondaryPreferred, nearest
        // Use secondaryPreferred for better read scaling (falls back to primary if secondaries unavailable)
        // Use primary or primaryPreferred for transactions
        readPreference: (process.env.MONGODB_READ_PREFERENCE as any) || 'secondaryPreferred',
        readConcern: { level: 'majority' }, // Ensure reads return committed data

        // Replica set specific settings
        replicaSet: process.env.MONGODB_REPLICA_SET || 'simplepro-rs',

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
          maxStalenessSeconds: 90 // Accept up to 90 seconds of replication lag
        }),
        localThresholdMS: 15, // Latency window for server selection (15ms)

        // Automatic server discovery and monitoring
        serverSelectionRetryMS: 30000, // Retry server selection for 30 seconds

        // Connection monitoring
        serverMonitoringMode: 'auto' as any, // Automatic monitoring mode
      }
    ),
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