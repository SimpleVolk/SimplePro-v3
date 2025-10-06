import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schemas/analytics-event.schema';
import { CacheService } from '../cache/cache.service';
import { DatabasePerformanceService } from '../database/database-performance.service';

export interface OptimizedDashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobsToday: number;
  totalRevenue: number;
  revenueToday: number;
  averageJobValue: number;
  crewUtilization: number;
  customerSatisfaction: number;
  onTimePerformance: number;
  topServices: Array<{ service: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; jobs: number }>;
  performanceMetrics: {
    averageJobDuration: number;
    averageCrewEfficiency: number;
    jobCompletionRate: number;
  };
}

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  category?: string;
  eventType?: string;
  userId?: string;
  customerId?: string;
  jobId?: string;
}

@Injectable()
export class AnalyticsOptimizedService {
  private readonly logger = new Logger(AnalyticsOptimizedService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private analyticsEventModel: Model<AnalyticsEventDocument>,
    private cacheService: CacheService,
    private dbPerformanceService: DatabasePerformanceService
  ) {}

  // Optimized dashboard metrics with caching and efficient aggregation
  async getDashboardMetrics(
    filters: AnalyticsFilters = {
      startDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
      endDate: new Date()
    }
  ): Promise<OptimizedDashboardMetrics> {
    const cacheKey = `dashboard:metrics:${filters.startDate.getTime()}-${filters.endDate.getTime()}`;

    // Try cache first
    const cached = await this.cacheService.getAnalyticsCache<OptimizedDashboardMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Use single aggregation pipeline for better performance
      const [dashboardData] = await this.analyticsEventModel.aggregate([
        {
          $match: {
            timestamp: {
              $gte: filters.startDate,
              $lte: filters.endDate
            }
          }
        },
        {
          $facet: {
            // Job metrics
            jobMetrics: [
              {
                $match: { category: 'jobs' }
              },
              {
                $group: {
                  _id: '$eventType',
                  count: { $sum: 1 }
                }
              }
            ],

            // Revenue metrics
            revenueMetrics: [
              {
                $match: {
                  category: 'revenue',
                  revenue: { $exists: true, $gt: 0 }
                }
              },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: '$revenue' },
                  averageRevenue: { $avg: '$revenue' },
                  count: { $sum: 1 }
                }
              }
            ],

            // Today's metrics
            todayMetrics: [
              {
                $match: {
                  timestamp: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lt: new Date(new Date().setHours(23, 59, 59, 999))
                  }
                }
              },
              {
                $group: {
                  _id: '$eventType',
                  count: { $sum: 1 },
                  revenue: { $sum: { $ifNull: ['$revenue', 0] } }
                }
              }
            ],

            // Top services
            topServices: [
              {
                $match: {
                  category: 'jobs',
                  eventType: 'job_completed',
                  'data.serviceType': { $exists: true }
                }
              },
              {
                $group: {
                  _id: '$data.serviceType',
                  count: { $sum: 1 },
                  revenue: { $sum: { $ifNull: ['$revenue', 0] } }
                }
              },
              {
                $sort: { revenue: -1 }
              },
              {
                $limit: 5
              }
            ],

            // Monthly revenue
            monthlyRevenue: [
              {
                $match: {
                  category: 'revenue',
                  revenue: { $exists: true, $gt: 0 }
                }
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' }
                  },
                  revenue: { $sum: '$revenue' },
                  jobs: { $sum: 1 }
                }
              },
              {
                $sort: { '_id.year': 1, '_id.month': 1 }
              }
            ]
          }
        }
      ]).exec();

      // Process aggregation results
      const metrics = this.processAggregationResults(dashboardData);

      // Cache results for 5 minutes
      await this.cacheService.setAnalyticsCache(cacheKey, metrics, 300);

      // Log performance metrics
      const duration = Date.now() - startTime;
      await this.dbPerformanceService.logQueryMetrics({
        query: 'getDashboardMetrics',
        duration,
        collection: 'analytics_events',
        operation: 'aggregate'
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  // Optimized event tracking with batching
  async trackEventsBatch(events: any[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const startTime = Date.now();

      // Use insertMany for better performance
      await this.analyticsEventModel.insertMany(
        events.map(event => ({
          ...event,
          timestamp: new Date(),
          processed: false
        })),
        {
          ordered: false // Continue on error
        }
      );

      // Clear related caches
      await this.cacheService.clearAnalyticsCaches();

      const duration = Date.now() - startTime;
      await this.dbPerformanceService.logQueryMetrics({
        query: 'trackEventsBatch',
        duration,
        collection: 'analytics_events',
        operation: 'insertMany',
        documentCount: events.length
      });

      this.logger.log(`Tracked ${events.length} events in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to track events batch:`, error);
      throw error;
    }
  }

  // Paginated event retrieval with field selection
  async getEventsPaginated(
    filters: AnalyticsFilters,
    page = 1,
    limit = 50,
    fields?: string[]
  ) {
    const cacheKey = `events:${JSON.stringify(filters)}:${page}:${limit}`;

    // Try cache first
    const cached = await this.cacheService.getAnalyticsCache<OptimizedDashboardMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const matchStage: any = {
        timestamp: {
          $gte: filters.startDate,
          $lte: filters.endDate
        }
      };

      if (filters.category) matchStage.category = filters.category;
      if (filters.eventType) matchStage.eventType = filters.eventType;
      if (filters.userId) matchStage.userId = filters.userId;
      if (filters.customerId) matchStage.customerId = filters.customerId;
      if (filters.jobId) matchStage.jobId = filters.jobId;

      const pipeline = [
        { $match: matchStage },
        ...DatabasePerformanceService.createPaginationPipeline({
          page,
          limit,
          sort: { timestamp: -1 }
        })
      ];

      // Add field selection if specified
      if (fields && fields.length > 0) {
        const projection = fields.reduce((acc, field) => {
          acc[field] = 1;
          return acc;
        }, {} as Record<string, number>);

        pipeline.splice(-1, 0, { $project: projection });
      }

      const [result] = await this.analyticsEventModel.aggregate(pipeline).exec();

      const paginatedResult = DatabasePerformanceService.formatPaginatedResult(
        [result],
        { page, limit }
      );

      // Cache for 2 minutes
      await this.cacheService.setAnalyticsCache(cacheKey, paginatedResult, 120);

      const duration = Date.now() - startTime;
      await this.dbPerformanceService.logQueryMetrics({
        query: 'getEventsPaginated',
        duration,
        collection: 'analytics_events',
        operation: 'aggregate'
      });

      return paginatedResult;
    } catch (error) {
      this.logger.error('Failed to get paginated events:', error);
      throw error;
    }
  }

  // Revenue analytics with optimized aggregation
  async getRevenueAnalytics(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month' = 'day'
  ) {
    const cacheKey = `revenue:${granularity}:${startDate.getTime()}-${endDate.getTime()}`;

    const cached = await this.cacheService.getAnalyticsCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      let groupBy: any;
      switch (granularity) {
        case 'day':
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
          break;
        case 'week':
          groupBy = {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          };
          break;
        case 'month':
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          };
          break;
      }

      const result = await this.analyticsEventModel.aggregate([
        {
          $match: {
            category: 'revenue',
            timestamp: { $gte: startDate, $lte: endDate },
            revenue: { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: groupBy,
            totalRevenue: { $sum: '$revenue' },
            totalCost: { $sum: { $ifNull: ['$cost', 0] } },
            totalProfit: { $sum: { $ifNull: ['$profit', 0] } },
            jobCount: { $sum: 1 },
            averageJobValue: { $avg: '$revenue' }
          }
        },
        {
          $sort: granularity === 'week'
            ? { '_id.year': 1, '_id.week': 1 }
            : { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]).exec();

      // Cache for 10 minutes
      await this.cacheService.setAnalyticsCache(cacheKey, result, 600);

      const duration = Date.now() - startTime;
      await this.dbPerformanceService.logQueryMetrics({
        query: 'getRevenueAnalytics',
        duration,
        collection: 'analytics_events',
        operation: 'aggregate'
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get revenue analytics:', error);
      throw error;
    }
  }

  // Performance analytics with indexes
  async getPerformanceMetrics(startDate: Date, endDate: Date) {
    const cacheKey = `performance:${startDate.getTime()}-${endDate.getTime()}`;

    const cached = await this.cacheService.getAnalyticsCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const result = await this.analyticsEventModel.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            $or: [
              { category: 'jobs' },
              { category: 'crew' },
              { category: 'operations' }
            ]
          }
        },
        {
          $facet: {
            jobDurations: [
              {
                $match: {
                  category: 'jobs',
                  eventType: 'job_completed',
                  duration: { $exists: true }
                }
              },
              {
                $group: {
                  _id: null,
                  averageDuration: { $avg: '$duration' },
                  count: { $sum: 1 }
                }
              }
            ],
            crewEfficiency: [
              {
                $match: {
                  category: 'crew',
                  efficiency: { $exists: true }
                }
              },
              {
                $group: {
                  _id: null,
                  averageEfficiency: { $avg: '$efficiency' },
                  count: { $sum: 1 }
                }
              }
            ],
            completionRate: [
              {
                $match: { category: 'jobs' }
              },
              {
                $group: {
                  _id: '$eventType',
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]).exec();

      // Process results
      const metrics = this.processPerformanceResults(result[0]);

      // Cache for 15 minutes
      await this.cacheService.setAnalyticsCache(cacheKey, metrics, 900);

      const duration = Date.now() - startTime;
      await this.dbPerformanceService.logQueryMetrics({
        query: 'getPerformanceMetrics',
        duration,
        collection: 'analytics_events',
        operation: 'aggregate'
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  private processAggregationResults(data: any): OptimizedDashboardMetrics {
    const jobMetrics = data.jobMetrics?.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}) || {};

    const revenueData = data.revenueMetrics?.[0] || {};

    const todayData = data.todayMetrics?.reduce((acc: any, item: any) => {
      if (item._id === 'job_completed') {
        acc.completedJobs = item.count;
      }
      acc.revenue += item.revenue || 0;
      return acc;
    }, { completedJobs: 0, revenue: 0 }) || { completedJobs: 0, revenue: 0 };

    const topServices = data.topServices?.map((item: any) => ({
      service: item._id,
      count: item.count,
      revenue: item.revenue || 0
    })) || [];

    const monthlyRevenue = data.monthlyRevenue?.map((item: any) => ({
      month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      revenue: item.revenue,
      jobs: item.jobs
    })) || [];

    return {
      totalJobs: jobMetrics.job_created || 0,
      activeJobs: (jobMetrics.job_started || 0) - (jobMetrics.job_completed || 0),
      completedJobsToday: todayData.completedJobs,
      totalRevenue: revenueData.totalRevenue || 0,
      revenueToday: todayData.revenue,
      averageJobValue: revenueData.averageRevenue || 0,
      crewUtilization: 78.2, // Mock data - would be calculated from crew events
      customerSatisfaction: 4.2, // Mock data - would come from feedback
      onTimePerformance: 91.5, // Mock data - would be calculated from job events
      topServices,
      revenueByMonth: monthlyRevenue,
      performanceMetrics: {
        averageJobDuration: 4.5,
        averageCrewEfficiency: 87.3,
        jobCompletionRate: 94.7
      }
    };
  }

  private processPerformanceResults(data: any) {
    const jobDuration = data.jobDurations?.[0];
    const crewEfficiency = data.crewEfficiency?.[0];
    const completionData = data.completionRate || [];

    const totalStarted = completionData.find((item: any) => item._id === 'job_started')?.count || 0;
    const totalCompleted = completionData.find((item: any) => item._id === 'job_completed')?.count || 0;
    const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;

    return {
      averageJobDuration: jobDuration?.averageDuration || 0,
      averageCrewEfficiency: crewEfficiency?.averageEfficiency || 0,
      jobCompletionRate: completionRate,
      crewUtilization: 78.2, // Would be calculated from actual crew data
      onTimePerformance: 91.5 // Would be calculated from scheduling vs completion data
    };
  }
}