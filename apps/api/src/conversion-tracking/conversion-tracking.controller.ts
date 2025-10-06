import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversionTrackingService } from './conversion-tracking.service';
import {
  TrackEventDto,
  DateRangeQueryDto,
  MetricsQueryDto,
  MonthlyMetricsQueryDto,
  RevenueForecastQueryDto,
  LeaderboardQueryDto,
} from './dto/conversion-tracking.dto';

@Controller('api/conversion-tracking')
@UseGuards(JwtAuthGuard)
export class ConversionTrackingController {
  constructor(
    private readonly conversionTrackingService: ConversionTrackingService,
  ) {}

  @Post('track-event')
  async trackEvent(@Body() dto: TrackEventDto) {
    const event = await this.conversionTrackingService.trackEvent(dto);
    return {
      success: true,
      event,
    };
  }

  @Get('funnel')
  async getConversionFunnel(@Query() dto: DateRangeQueryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const funnel = await this.conversionTrackingService.getConversionFunnel(
      startDate,
      endDate,
    );

    return {
      success: true,
      ...funnel,
    };
  }

  @Get('rates')
  async getConversionRates(@Query() dto: DateRangeQueryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const rates = await this.conversionTrackingService.getConversionRates(
      startDate,
      endDate,
    );

    return {
      success: true,
      rates,
      period: { startDate, endDate },
    };
  }

  @Get('attribution')
  async getAttributionReport(@Query() dto: DateRangeQueryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const report = await this.conversionTrackingService.getAttributionReport(
      startDate,
      endDate,
    );

    return {
      success: true,
      report,
      period: { startDate, endDate },
    };
  }

  @Get('metrics/daily')
  async getDailyMetrics(@Query() dto: MetricsQueryDto) {
    const date = new Date(dto.date);

    const metrics =
      await this.conversionTrackingService.calculateDailyMetrics(date);

    return {
      success: true,
      metrics,
    };
  }

  @Get('metrics/monthly')
  async getMonthlyMetrics(@Query() dto: MonthlyMetricsQueryDto) {
    const metrics =
      await this.conversionTrackingService.calculateMonthlyMetrics(
        dto.month,
        dto.year,
      );

    return {
      success: true,
      metrics,
    };
  }

  @Get('pipeline-velocity')
  async getPipelineVelocity() {
    const velocity = await this.conversionTrackingService.getPipelineVelocity();

    return {
      success: true,
      velocity,
    };
  }

  @Get('revenue-forecast')
  async getRevenueForecast(@Query() dto: RevenueForecastQueryDto) {
    const forecast = await this.conversionTrackingService.getForecastedRevenue(
      dto.months,
    );

    return {
      success: true,
      forecast,
    };
  }

  @Get('sales-rep/:id/performance')
  async getSalesRepPerformance(
    @Param('id') id: string,
    @Query() dto: DateRangeQueryDto,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const performance =
      await this.conversionTrackingService.getSalesRepPerformance(
        id,
        startDate,
        endDate,
      );

    return {
      success: true,
      performance,
    };
  }

  @Get('leaderboard')
  async getTopPerformers(@Query() dto: LeaderboardQueryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const limit = dto.limit || 10;

    const performers = await this.conversionTrackingService.getTopPerformers(
      startDate,
      endDate,
      limit,
    );

    return {
      success: true,
      topPerformers: performers,
    };
  }

  @Get('dashboard')
  async getDashboard(@Query() dto: DateRangeQueryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const [funnel, rates, attribution, velocity] = await Promise.all([
      this.conversionTrackingService.getConversionFunnel(startDate, endDate),
      this.conversionTrackingService.getConversionRates(startDate, endDate),
      this.conversionTrackingService.getAttributionReport(startDate, endDate),
      this.conversionTrackingService.getPipelineVelocity(),
    ]);

    const stages = funnel.funnelStages;

    // Calculate overall metrics
    const totalLeads = stages.find((s: any) => s.stage === 'Leads')?.count || 0;
    const totalQuotes =
      stages.find((s: any) => s.stage === 'Quotes Sent')?.count || 0;
    const totalJobs =
      stages.find((s: any) => s.stage === 'Jobs Created')?.count || 0;
    const totalQuoteValue =
      stages.find((s: any) => s.stage === 'Quotes Sent')?.value || 0;
    const totalJobValue =
      stages.find((s: any) => s.stage === 'Jobs Created')?.value || 0;

    return {
      success: true,
      period: { startDate, endDate },
      overallMetrics: {
        totalLeads,
        totalQuotes,
        totalJobs,
        overallConversionRate: rates.overallConversionRate,
        totalQuoteValue,
        totalJobValue,
        avgQuoteValue: totalQuotes > 0 ? totalQuoteValue / totalQuotes : 0,
        avgJobValue: totalJobs > 0 ? totalJobValue / totalJobs : 0,
      },
      funnelStages: stages,
      conversionRates: rates,
      attribution: attribution,
      pipelineVelocity: velocity,
    };
  }
}
