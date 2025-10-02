import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ConversionEvent,
  ConversionEventSchema,
} from './schemas/conversion-event.schema';
import {
  ConversionMetrics,
  ConversionMetricsSchema,
} from './schemas/conversion-metrics.schema';
import { ConversionTrackingService } from './conversion-tracking.service';
import { ConversionTrackingController } from './conversion-tracking.controller';
import { ConversionEventsListener } from './listeners/conversion-events.listener';
import { ConversionTrackingScheduler } from './conversion-tracking.scheduler';
import { QuoteHistoryModule } from '../quote-history/quote-history.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: ConversionEvent.name, schema: ConversionEventSchema },
      { name: ConversionMetrics.name, schema: ConversionMetricsSchema },
    ]),
    QuoteHistoryModule,
  ],
  controllers: [ConversionTrackingController],
  providers: [
    ConversionTrackingService,
    ConversionEventsListener,
    ConversionTrackingScheduler,
  ],
  exports: [ConversionTrackingService],
})
export class ConversionTrackingModule {}
