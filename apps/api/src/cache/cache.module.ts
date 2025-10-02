import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { CacheWarmerService } from './cache-warmer.service';
import { CacheMetricsService } from './cache-metrics.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [CacheController],
  providers: [CacheService, CacheWarmerService, CacheMetricsService],
  exports: [CacheService, CacheWarmerService, CacheMetricsService],
})
export class CacheModule {}
