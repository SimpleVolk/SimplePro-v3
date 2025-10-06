import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { DiskHealthIndicator } from './indicators/disk-health.indicator';
import { ExternalServiceHealthIndicator } from './indicators/external-service-health.indicator';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    MongooseModule.forFeature([]), // Empty array since we'll inject connection directly
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    ExternalServiceHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}
