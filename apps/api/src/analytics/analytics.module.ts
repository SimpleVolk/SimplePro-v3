import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportsService } from './reports.service';
import { MetricsService } from './metrics.service';
import { AnalyticsEvent, AnalyticsEventSchema } from './schemas/analytics-event.schema';
import { Report, ReportSchema } from './schemas/report.schema';
// Future imports for enhanced analytics:
// import { CustomersModule } from '../customers/customers.module';
// import { JobsModule } from '../jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
    AuthModule,
    // Future imports for enhanced analytics:
    // CustomersModule,
    // JobsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportsService, MetricsService],
  exports: [AnalyticsService, ReportsService, MetricsService],
})
export class AnalyticsModule {}