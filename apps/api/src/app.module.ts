import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';

// Controllers
import { AppController } from './app.controller';

// Services
import { AppService } from './app.service';

// Core modules
import { DatabaseModule } from './database/database.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { EstimatesModule } from './estimates/estimates.module';
import { CustomersModule } from './customers/customers.module';
import { JobsModule } from './jobs/jobs.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { LeadActivitiesModule } from './lead-activities/lead-activities.module';
import { FollowUpRulesModule } from './follow-up-rules/follow-up-rules.module';
import { FollowUpSchedulerModule } from './follow-up-scheduler/follow-up-scheduler.module';
import { PricingRulesModule } from './pricing-rules/pricing-rules.module';
import { TariffSettingsModule } from './tariff-settings/tariff-settings.module';
import { CompanyModule } from './company/company.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { GraphQLModule } from './graphql/graphql.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';
import { HealthModule } from './health/health.module';
import { PartnersModule } from './partners/partners.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PartnerPortalModule } from './partner-portal/partner-portal.module';
import { QuoteHistoryModule } from './quote-history/quote-history.module';
import { ConversionTrackingModule } from './conversion-tracking/conversion-tracking.module';
import { DocumentsModule } from './documents/documents.module';
import { MessagesModule } from './messages/messages.module';
import { CrewScheduleModule } from './crew-schedule/crew-schedule.module';
import { NotificationsModule } from './notifications/notifications.module';

// Security
import { CustomThrottlerGuard } from './common/guards/throttle.guard';

@Module({
  imports: [
    // Rate limiting configuration - Production-grade security
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute
      },
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 5, // 5 login attempts per minute (strict for security)
      },
    ]),
    // Event emitter for automation workflows
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    EstimatesModule,
    CustomersModule,
    JobsModule,
    OpportunitiesModule,
    LeadActivitiesModule,
    FollowUpRulesModule,
    FollowUpSchedulerModule,
    PricingRulesModule,
    TariffSettingsModule,
    CompanyModule,
    AuditLogsModule,
    GraphQLModule,
    WebSocketModule,
    AnalyticsModule,
    SecurityModule,
    HealthModule,
    PartnersModule,
    ReferralsModule,
    PartnerPortalModule,
    QuoteHistoryModule,
    ConversionTrackingModule,
    DocumentsModule,
    MessagesModule,
    CrewScheduleModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
