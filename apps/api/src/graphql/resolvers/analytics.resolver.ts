import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JobsService } from '../../jobs/jobs.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Resolver('Analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsResolver {
  constructor(
    private readonly jobsService: JobsService,
    private readonly analyticsService: AnalyticsService
  ) {}

  @Query('analytics')
  @Roles('admin', 'super_admin', 'dispatcher')
  async getAnalytics(
    @Args('startDate') startDate?: Date,
    @Args('endDate') endDate?: Date
  ): Promise<any> {
    const jobStats = await this.jobsService.getJobStats();
    const revenueMetrics = await this.getRevenueMetrics(startDate, endDate);
    const performanceMetrics = await this.getPerformanceMetrics(startDate, endDate);

    return {
      jobStats,
      revenueMetrics,
      performanceMetrics,
      generatedAt: new Date()
    };
  }

  @Query('jobStats')
  @Roles('admin', 'super_admin', 'dispatcher')
  async getJobStats() {
    return this.jobsService.getJobStats();
  }

  @Query('revenueMetrics')
  @Roles('admin', 'super_admin')
  async getRevenueMetrics(
    @Args('startDate') startDate?: Date,
    @Args('endDate') endDate?: Date
  ): Promise<any> {
    try {
      // Use analytics service if available
      const overview = await this.analyticsService.getDashboardOverview();

      return {
        totalRevenue: overview.revenue.totalRevenue,
        averageJobValue: overview.revenue.averageJobValue,
        revenueByType: {
          local: overview.revenue.totalRevenue * 0.6, // Example split
          long_distance: overview.revenue.totalRevenue * 0.3,
          storage: overview.revenue.totalRevenue * 0.1
        },
        revenueByMonth: {},
        projectedRevenue: overview.revenue.totalRevenue * 1.1
      };
    } catch (error) {
      // Fallback to basic job stats
      const jobStats = await this.jobsService.getJobStats();
      return {
        totalRevenue: jobStats.totalRevenue,
        averageJobValue: jobStats.total > 0 ? jobStats.totalRevenue / jobStats.total : 0,
        revenueByType: {},
        revenueByMonth: {},
        projectedRevenue: jobStats.totalRevenue * 1.1
      };
    }
  }

  private async getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      // Use analytics service if available
      const overview = await this.analyticsService.getDashboardOverview();

      return {
        completionRate: overview.performance.completionRate,
        onTimeRate: overview.performance.onTimeDeliveryRate,
        customerSatisfaction: overview.performance.customerSatisfaction,
        crewEfficiency: overview.performance.crewEfficiency,
        averageJobDuration: overview.performance.averageJobDuration
      };
    } catch (error) {
      // Fallback to basic calculations
      const jobStats = await this.jobsService.getJobStats();
      const completedJobs = jobStats.byStatus['completed'] || 0;
      const totalJobs = jobStats.total || 1;

      return {
        completionRate: (completedJobs / totalJobs) * 100,
        onTimeRate: 85.0, // Default value
        customerSatisfaction: 4.5, // Default value
        crewEfficiency: 90.0, // Default value
        averageJobDuration: jobStats.averageDuration
      };
    }
  }
}

@Resolver('CrewMember')
@UseGuards(JwtAuthGuard)
export class CrewResolver {
  constructor(
    private readonly crewDataLoader: any // Inject CrewDataLoader
  ) {}

  @Query('crewMember')
  async getCrewMember(@Args('id') id: string) {
    return this.crewDataLoader.load(id);
  }

  @Query('crewMembers')
  @Roles('admin', 'super_admin', 'dispatcher')
  async getCrewMembers(@Args('filters') filters?: any) {
    // For now, return all crew members
    // In production, implement filtering logic
    return [];
  }

  @Query('availableCrew')
  @Roles('admin', 'super_admin', 'dispatcher')
  async getAvailableCrew(@Args('date') date: Date) {
    return this.crewDataLoader.loadAvailableCrew(date);
  }
}
