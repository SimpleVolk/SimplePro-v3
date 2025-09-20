import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schemas/analytics-event.schema';

export interface AnalyticsEventInput {
  eventType: string;
  category: string;
  data: Record<string, any>;
  userId: string;
  customerId?: string;
  jobId?: string;
  estimateId?: string;
  crewId?: string;
  revenue?: number;
  cost?: number;
  profit?: number;
  location?: {
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  duration?: number;
  efficiency?: number;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
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

export interface PeriodFilter {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private analyticsEventModel: Model<AnalyticsEventDocument>
  ) {}

  // Track events for analytics
  async trackEvent(event: AnalyticsEventInput): Promise<AnalyticsEvent> {
    try {
      const analyticsEvent = new this.analyticsEventModel({
        ...event,
        timestamp: new Date(),
        processed: false,
      });

      const savedEvent = await analyticsEvent.save();
      this.logger.log(`Tracked event: ${event.eventType} for user ${event.userId}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get dashboard metrics
  async getDashboardMetrics(period?: PeriodFilter): Promise<DashboardMetrics> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultPeriod = period || {
      startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1), // Last 6 months
      endDate: now
    };

    try {
      // Parallel aggregation queries for performance
      const [
        jobMetrics,
        revenueMetrics,
        todayMetrics,
        serviceMetrics,
        monthlyRevenue,
        performanceMetrics
      ] = await Promise.all([
        this.getJobMetrics(defaultPeriod),
        this.getRevenueMetrics(defaultPeriod),
        this.getTodayMetrics(startOfToday),
        this.getTopServices(defaultPeriod),
        this.getMonthlyRevenue(defaultPeriod),
        this.getPerformanceMetrics(defaultPeriod)
      ]);

      return {
        totalJobs: jobMetrics.total,
        activeJobs: jobMetrics.active,
        completedJobsToday: todayMetrics.completedJobs,
        totalRevenue: revenueMetrics.total,
        revenueToday: todayMetrics.revenue,
        averageJobValue: revenueMetrics.average,
        crewUtilization: performanceMetrics.crewUtilization,
        customerSatisfaction: 4.2, // Mock data - would come from customer feedback
        onTimePerformance: performanceMetrics.onTimePerformance,
        topServices: serviceMetrics,
        revenueByMonth: monthlyRevenue,
        performanceMetrics: {
          averageJobDuration: performanceMetrics.averageJobDuration,
          averageCrewEfficiency: performanceMetrics.averageCrewEfficiency,
          jobCompletionRate: performanceMetrics.jobCompletionRate,
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get events by type and period
  async getEventsByType(
    eventType: string,
    period: PeriodFilter,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return this.analyticsEventModel
      .find({
        eventType,
        timestamp: {
          $gte: period.startDate,
          $lte: period.endDate
        }
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  // Get events by category
  async getEventsByCategory(
    category: string,
    period: PeriodFilter,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return this.analyticsEventModel
      .find({
        category,
        timestamp: {
          $gte: period.startDate,
          $lte: period.endDate
        }
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  // Revenue analytics
  async getRevenueAnalytics(period: PeriodFilter) {
    const pipeline = [
      {
        $match: {
          category: 'revenue',
          timestamp: {
            $gte: period.startDate,
            $lte: period.endDate
          },
          revenue: { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          totalRevenue: { $sum: '$revenue' },
          totalCost: { $sum: '$cost' },
          totalProfit: { $sum: '$profit' },
          jobCount: { $sum: 1 },
          averageJobValue: { $avg: '$revenue' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } as any
      }
    ];

    return this.analyticsEventModel.aggregate(pipeline).exec();
  }

  // Geographic analytics
  async getGeographicAnalytics(period: PeriodFilter) {
    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: period.startDate,
            $lte: period.endDate
          },
          'location.state': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            state: '$location.state',
            city: '$location.city'
          },
          jobCount: { $sum: 1 },
          totalRevenue: { $sum: '$revenue' },
          averageRevenue: { $avg: '$revenue' }
        }
      },
      {
        $sort: { jobCount: -1 } as any
      }
    ];

    return this.analyticsEventModel.aggregate(pipeline).exec();
  }

  // Private helper methods
  private async getJobMetrics(period: PeriodFilter) {
    const pipeline = [
      {
        $match: {
          category: 'jobs',
          timestamp: {
            $gte: period.startDate,
            $lte: period.endDate
          }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline).exec();
    const metrics = results.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      total: (metrics.job_created || 0),
      active: (metrics.job_started || 0) - (metrics.job_completed || 0),
      completed: metrics.job_completed || 0
    };
  }

  private async getRevenueMetrics(period: PeriodFilter) {
    const pipeline = [
      {
        $match: {
          category: 'revenue',
          timestamp: {
            $gte: period.startDate,
            $lte: period.endDate
          },
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
    ];

    const result = await this.analyticsEventModel.aggregate(pipeline).exec();
    return result[0] || { totalRevenue: 0, averageRevenue: 0, count: 0 };
  }

  private async getTodayMetrics(startOfToday: Date) {
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: startOfToday,
            $lt: endOfToday
          }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          revenue: { $sum: '$revenue' }
        }
      }
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline).exec();
    return results.reduce((acc, item) => {
      if (item._id === 'job_completed') {
        acc.completedJobs = item.count;
      }
      acc.revenue += item.revenue || 0;
      return acc;
    }, { completedJobs: 0, revenue: 0 });
  }

  private async getTopServices(period: PeriodFilter) {
    const pipeline = [
      {
        $match: {
          category: 'jobs',
          eventType: 'job_completed',
          timestamp: {
            $gte: period.startDate,
            $lte: period.endDate
          },
          'data.serviceType': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$data.serviceType',
          count: { $sum: 1 },
          revenue: { $sum: '$revenue' }
        }
      },
      {
        $sort: { revenue: -1 } as any
      },
      {
        $limit: 5
      }
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline).exec();
    return results.map(item => ({
      service: item._id,
      count: item.count,
      revenue: item.revenue || 0
    }));
  }

  private async getMonthlyRevenue(period: PeriodFilter) {
    const pipeline = [
      {
        $match: {
          category: 'revenue',
          timestamp: {
            $gte: period.startDate,
            $lte: period.endDate
          },
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
        $sort: { '_id.year': 1, '_id.month': 1 } as any
      }
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline).exec();
    return results.map(item => ({
      month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      revenue: item.revenue,
      jobs: item.jobs
    }));
  }

  private async getPerformanceMetrics(_period: PeriodFilter) {
    // Mock performance metrics - in a real implementation, these would be calculated from actual data
    return {
      averageJobDuration: 4.5, // hours
      averageCrewEfficiency: 87.3, // percentage
      jobCompletionRate: 94.7, // percentage
      crewUtilization: 78.2, // percentage
      onTimePerformance: 91.5 // percentage
    };
  }
}