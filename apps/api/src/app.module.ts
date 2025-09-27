import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Controllers
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

// Services
import { AppService } from './app.service';

// Core modules
import { DatabaseModule } from './database/database.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { EstimatesModule } from './estimates/estimates.module';
import { CustomersModule } from './customers/customers.module';
import { JobsModule } from './jobs/jobs.module';
import { PricingRulesModule } from './pricing-rules/pricing-rules.module';
// import { GraphqlModule } from './graphql/graphql.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';

// Security
import { CustomThrottlerGuard } from './common/guards/throttle.guard';

@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 60, // 60 requests per minute
      },
      {
        name: 'auth',
        ttl: 900000, // 15 minutes
        limit: 5, // 5 login attempts per 15 minutes
      },
      {
        name: 'api',
        ttl: 60000, // 1 minute
        limit: 100, // 100 API calls per minute
      },
    ]),
    DatabaseModule,
    AuthModule,
    EstimatesModule,
    CustomersModule,
    JobsModule,
    PricingRulesModule,
    // GraphqlModule,
    WebSocketModule,
    AnalyticsModule,
    SecurityModule
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}