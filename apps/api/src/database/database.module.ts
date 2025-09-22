import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot(
      (() => {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
          throw new Error(
            'MONGODB_URI environment variable is required. ' +
            'Please provide a valid MongoDB connection string. ' +
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
        readPreference: process.env.MONGODB_READ_PREFERENCE || 'primary',
        readConcern: { level: 'majority' },

        // Network and performance settings
        family: 4, // Use IPv4, skip trying IPv6
        keepAlive: true,
        keepAliveInitialDelay: 300000, // 5 minutes

        // Monitoring and logging
        monitorCommands: process.env.NODE_ENV === 'development',
        compressors: ['zstd', 'zlib'], // Enable compression

        // Heartbeat settings
        heartbeatFrequencyMS: 10000, // 10 seconds

        // Buffer settings
        bufferMaxEntries: 0, // Disable mongoose buffering in favor of connection pooling

        // Authentication and SSL
        authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
        ssl: process.env.MONGODB_SSL === 'true',
        sslValidate: process.env.MONGODB_SSL_VALIDATE !== 'false',

        // Application metadata
        appName: 'SimplePro-v3-API',

        // Additional performance settings
        maxStalenessSeconds: 90, // For secondary reads
        localThresholdMS: 15, // Latency window for server selection
      }
    ),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}