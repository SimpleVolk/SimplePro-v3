import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService, PeriodFilter } from './analytics.service';
import { ReportsService } from './reports.service';
import type { CreateReportDto } from './reports.service';
import { MetricsService } from './metrics.service';
import type { MetricEvent } from './metrics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private reportsService: ReportsService,
    private metricsService: MetricsService
  ) {}

  // Dashboard metrics endpoint
  @Get('dashboard')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher')
  async getDashboardMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const period = this.parsePeriodFilter(startDate, endDate);
    return this.analyticsService.getDashboardMetrics(period || undefined);
  }

  // Business metrics endpoint
  @Get('business-metrics')
  @Roles('super_admin', 'admin', 'manager')
  async getBusinessMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const period = this.parsePeriodFilter(startDate, endDate);
    return this.metricsService.getBusinessMetrics(period || undefined);
  }

  // Revenue analytics endpoint
  @Get('revenue')
  @Roles('super_admin', 'admin', 'manager')
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const period = this.parsePeriodFilter(startDate, endDate);

    if (!period) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    return this.analyticsService.getRevenueAnalytics(period);
  }

  // Geographic analytics endpoint
  @Get('geographic')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher')
  async getGeographicAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const period = this.parsePeriodFilter(startDate, endDate);

    if (!period) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    return this.analyticsService.getGeographicAnalytics(period);
  }

  // Get events by type
  @Get('events/type/:eventType')
  @Roles('super_admin', 'admin', 'manager')
  async getEventsByType(
    @Param('eventType') eventType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const period = this.parsePeriodFilter(startDate, endDate);

    if (!period) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    const eventPage = page ? parseInt(page, 10) : 1;
    const eventLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const skip = (eventPage - 1) * eventLimit;

    const result = await this.analyticsService.getEventsByType(eventType, period, eventLimit, skip);

    return {
      success: true,
      events: result.events,
      pagination: {
        page: eventPage,
        limit: eventLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / eventLimit)
      }
    };
  }

  // Get events by category
  @Get('events/category/:category')
  @Roles('super_admin', 'admin', 'manager')
  async getEventsByCategory(
    @Param('category') category: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const period = this.parsePeriodFilter(startDate, endDate);

    if (!period) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    const eventPage = page ? parseInt(page, 10) : 1;
    const eventLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const skip = (eventPage - 1) * eventLimit;

    const result = await this.analyticsService.getEventsByCategory(category, period, eventLimit, skip);

    return {
      success: true,
      events: result.events,
      pagination: {
        page: eventPage,
        limit: eventLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / eventLimit)
      }
    };
  }

  // Activity metrics endpoint for dashboard
  @Get('activity-metrics')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getActivityMetrics(
    @Query('period') period: 'today' | 'week' | 'month' = 'today'
  ) {
    try {
      return await this.analyticsService.getActivityMetrics(period);
    } catch (error) {
      throw new BadRequestException('Failed to fetch activity metrics');
    }
  }

  // Open items endpoint for dashboard
  @Get('open-items')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getOpenItems() {
    try {
      return await this.analyticsService.getOpenItems();
    } catch (error) {
      throw new BadRequestException('Failed to fetch open items');
    }
  }

  // Sales performance endpoint for dashboard
  @Get('sales-performance')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getSalesPerformance(
    @Query('period') period: 'today' | 'week' | 'month' = 'month'
  ) {
    try {
      return await this.analyticsService.getSalesPerformance(period);
    } catch (error) {
      throw new BadRequestException('Failed to fetch sales performance');
    }
  }

  // Track custom metric
  @Post('metrics/track')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher', 'crew_lead', 'crew_member')
  async trackMetric(@Body() metricData: MetricEvent, @Request() req: any) {
    const metric = {
      ...metricData,
      userId: req.user.id
    };

    await this.metricsService.trackMetric(metric);
    return { success: true, message: 'Metric tracked successfully' };
  }

  // Track job metrics
  @Post('metrics/job')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher', 'crew_lead')
  async trackJobMetrics(
    @Body() jobData: {
      jobId: string;
      customerId: string;
      serviceType: string;
      revenue: number;
      cost: number;
      duration: number;
      crewSize: number;
      isOnTime: boolean;
      customerRating?: number;
    },
    @Request() req: any
  ) {
    const jobMetrics = {
      ...jobData,
      userId: req.user.id
    };

    await this.metricsService.trackJobMetrics(jobMetrics);
    return { success: true, message: 'Job metrics tracked successfully' };
  }

  // Track crew metrics
  @Post('metrics/crew')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher', 'crew_lead')
  async trackCrewMetrics(
    @Body() crewData: {
      crewId: string;
      memberId: string;
      jobId: string;
      hoursWorked: number;
      efficiency: number;
      rating?: number;
    },
    @Request() req: any
  ) {
    const crewMetrics = {
      ...crewData,
      userId: req.user.id
    };

    await this.metricsService.trackCrewMetrics(crewMetrics);
    return { success: true, message: 'Crew metrics tracked successfully' };
  }

  // Track customer acquisition
  @Post('metrics/customer-acquisition')
  @Roles('super_admin', 'admin', 'manager', 'sales')
  async trackCustomerAcquisition(
    @Body() customerData: {
      customerId: string;
      source: string;
      estimatedValue: number;
    },
    @Request() req: any
  ) {
    const acquisitionData = {
      ...customerData,
      userId: req.user.id
    };

    await this.metricsService.trackCustomerAcquisition(acquisitionData);
    return { success: true, message: 'Customer acquisition tracked successfully' };
  }

  // Track estimate metrics
  @Post('metrics/estimate')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher', 'sales')
  async trackEstimateMetrics(
    @Body() estimateData: {
      estimateId: string;
      customerId: string;
      serviceType: string;
      estimatedValue: number;
      actualValue?: number;
      wasAccepted: boolean;
      conversionTime?: number;
    },
    @Request() req: any
  ) {
    const metrics = {
      ...estimateData,
      userId: req.user.id
    };

    await this.metricsService.trackEstimateMetrics(metrics);
    return { success: true, message: 'Estimate metrics tracked successfully' };
  }

  // Reports endpoints
  @Get('reports')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher')
  async getReports(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filters = {
      type,
      status,
      visibility,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    };

    return this.reportsService.getReports(req.user.id, filters);
  }

  @Get('reports/:reportId')
  @Roles('super_admin', 'admin', 'manager', 'dispatcher')
  async getReport(@Param('reportId') reportId: string, @Request() req: any) {
    try {
      return await this.reportsService.getReportById(reportId, req.user.id);
    } catch (error) {
      throw new NotFoundException(error instanceof Error ? error.message : 'Report not found');
    }
  }

  @Post('reports')
  @Roles('super_admin', 'admin', 'manager')
  async createReport(@Body() createReportDto: CreateReportDto, @Request() req: any) {
    return this.reportsService.createReport(createReportDto, req.user.id);
  }

  @Post('reports/revenue')
  @Roles('super_admin', 'admin', 'manager')
  async generateRevenueReport(
    @Body() body: {
      startDate: string;
      endDate: string;
      filters?: Record<string, any>;
    }
  ) {
    const period: PeriodFilter = {
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate)
    };

    return this.reportsService.generateRevenueReport(period, body.filters);
  }

  @Post('reports/performance')
  @Roles('super_admin', 'admin', 'manager')
  async generatePerformanceReport(
    @Body() body: {
      startDate: string;
      endDate: string;
      filters?: Record<string, any>;
    }
  ) {
    const period: PeriodFilter = {
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate)
    };

    return this.reportsService.generatePerformanceReport(period, body.filters);
  }

  // Analytics metadata endpoints
  @Get('metadata/event-types')
  @Roles('super_admin', 'admin', 'manager')
  async getEventTypes() {
    return {
      eventTypes: [
        'job_created',
        'job_started',
        'job_completed',
        'job_cancelled',
        'estimate_generated',
        'estimate_accepted',
        'estimate_rejected',
        'customer_acquired',
        'customer_feedback',
        'crew_performance',
        'revenue_generated',
        'job_ontime',
        'job_delayed'
      ]
    };
  }

  @Get('metadata/categories')
  @Roles('super_admin', 'admin', 'manager')
  async getCategories() {
    return {
      categories: [
        'jobs',
        'customers',
        'revenue',
        'crew',
        'operations',
        'estimates',
        'performance',
        'metrics'
      ]
    };
  }

  @Get('metadata/report-types')
  @Roles('super_admin', 'admin', 'manager')
  async getReportTypes() {
    return {
      reportTypes: [
        { id: 'revenue', name: 'Revenue Report', description: 'Financial performance and revenue analytics' },
        { id: 'performance', name: 'Performance Report', description: 'Operational efficiency and job performance' },
        { id: 'operations', name: 'Operations Report', description: 'Crew utilization and operational metrics' },
        { id: 'crew', name: 'Crew Report', description: 'Individual and team performance analysis' },
        { id: 'customer', name: 'Customer Report', description: 'Customer satisfaction and retention analysis' },
        { id: 'custom', name: 'Custom Report', description: 'User-defined custom analytics report' }
      ]
    };
  }

  // Helper method to parse period filter
  private parsePeriodFilter(startDate?: string, endDate?: string): PeriodFilter | null {
    if (!startDate || !endDate) {
      return null;
    }

    try {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    } catch (error) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }
  }
}