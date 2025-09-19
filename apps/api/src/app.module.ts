import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';

// Core modules
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './core/database/database.module';

// Feature modules
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CrewsModule } from './modules/crews/crews.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// Controllers
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

// Services
import { AppService } from './app.service';

// Configuration
import configuration from './core/config/configuration';
import { validate } from './core/config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),

    // Logging
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (req) => ({
          context: 'HTTP',
        }),
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          },
        },
        autoLogging: false,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            params: req.params,
            headers: req.headers,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryWrites: true,
        w: 'majority',
      }),
      inject: [ConfigService],
    }),

    // Cache
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: require('cache-manager-redis-store'),
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        auth_pass: configService.get<string>('REDIS_PASSWORD'),
        ttl: 600, // 10 minutes default
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),

    // Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000),
        limit: configService.get<number>('RATE_LIMIT_MAX', 100),
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Event emitter
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Health checks
    TerminusModule,

    // Core modules
    DatabaseModule,
    AuthModule,

    // Feature modules
    UsersModule,
    CustomersModule,
    EstimatesModule,
    JobsModule,
    CrewsModule,
    InventoryModule,
    PaymentsModule,
    ReviewsModule,
    DocumentsModule,
    AnalyticsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}