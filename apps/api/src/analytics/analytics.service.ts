import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schemas/analytics-event.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { CacheService } from '../cache/cache.service';

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
    private analyticsEventModel: Model<AnalyticsEventDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Job.name)
    private jobModel: Model<JobDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
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
    limit: number = 100,
    skip: number = 0
  ): Promise<{ events: AnalyticsEvent[]; total: number }> {
    const query = {
      eventType,
      timestamp: {
        $gte: period.startDate,
        $lte: period.endDate
      }
    };

    const [events, total] = await Promise.all([
      this.analyticsEventModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.analyticsEventModel.countDocuments(query).exec()
    ]);

    return { events, total };
  }

  // Get events by category
  async getEventsByCategory(
    category: string,
    period: PeriodFilter,
    limit: number = 100,
    skip: number = 0
  ): Promise<{ events: AnalyticsEvent[]; total: number }> {
    const query = {
      category,
      timestamp: {
        $gte: period.startDate,
        $lte: period.endDate
      }
    };

    const [events, total] = await Promise.all([
      this.analyticsEventModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.analyticsEventModel.countDocuments(query).exec()
    ]);

    return { events, total };
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
          _id: null as null,
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

  /**
   * Helper method to calculate date range based on period
   */
  private calculateDateRange(period: 'today' | 'week' | 'month'): Date {
    const now = new Date();

    if (period === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Get activity metrics from real database queries
   * Replaces mock data with actual customer and job data
   */
  async getActivityMetrics(period: 'today' | 'week' | 'month' = 'today') {
    try {
      const startDate = this.calculateDateRange(period);

      // Run all queries in parallel for better performance
      const [leads, quotes, booked, cancellations] = await Promise.all([
        // Leads: Count customers with status 'lead' created within period
        this.customerModel.countDocuments({
          status: 'lead',
          createdAt: { $gte: startDate }
        }),

        // Quotes: Count jobs with status 'quoted' or 'estimate_sent' within period
        // Note: Using 'scheduled' as proxy since we don't have explicit 'quoted' status in schema
        this.jobModel.countDocuments({
          status: 'scheduled',
          createdAt: { $gte: startDate }
        }),

        // Booked: Count jobs with status 'scheduled' or 'in_progress' within period
        this.jobModel.countDocuments({
          status: { $in: ['scheduled', 'in_progress'] },
          createdAt: { $gte: startDate }
        }),

        // Cancellations: Count jobs with status 'cancelled' updated within period
        this.jobModel.countDocuments({
          status: 'cancelled',
          updatedAt: { $gte: startDate }
        })
      ]);

      return {
        leads,
        quotesSent: quotes,
        booked,
        cancellations
      };
    } catch (error) {
      this.logger.error(`Failed to get activity metrics: ${error.message}`, error.stack);
      // Return fallback values on error
      return {
        leads: 0,
        quotesSent: 0,
        booked: 0,
        cancellations: 0
      };
    }
  }

  /**
   * Get open items from real database queries
   * Replaces mock data with actual customer data
   */
  async getOpenItems() {
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Run all queries in parallel for better performance
      const [
        unassignedLeads,
        newLeads,
        staleOpportunities
      ] = await Promise.all([
        // Unassigned Leads: Count customers with status 'lead' and no assigned sales rep
        this.customerModel.countDocuments({
          status: 'lead',
          $or: [
            { assignedSalesRep: { $exists: false } },
            { assignedSalesRep: null }
          ]
        }),

        // New Leads: Count customers created in last 48 hours
        this.customerModel.countDocuments({
          createdAt: { $gte: twoDaysAgo }
        }),

        // Stale Opportunities: Count customers with status 'lead' or 'prospect'
        // and last contact date more than 7 days ago
        this.customerModel.countDocuments({
          status: { $in: ['lead', 'prospect'] },
          lastContactDate: { $lt: sevenDaysAgo }
        })
      ]);

      // TODO: Implement accepted not booked calculation
      // This requires estimate/quote tracking system which isn't fully implemented
      const acceptedNotBooked = 0;

      // TODO: Implement customer service tickets system
      const customerServiceTickets = 0;

      // TODO: Implement inventory submissions system
      const inventorySubmissions = 0;

      return {
        unassignedLeads,
        newLeads,
        acceptedNotBooked,
        staleOpportunities,
        customerServiceTickets,
        inventorySubmissions
      };
    } catch (error) {
      this.logger.error(`Failed to get open items: ${error.message}`, error.stack);
      // Return fallback values on error
      return {
        unassignedLeads: 0,
        newLeads: 0,
        acceptedNotBooked: 0,
        staleOpportunities: 0,
        customerServiceTickets: 0,
        inventorySubmissions: 0
      };
    }
  }

  /**
   * Get sales performance from real database queries
   * Replaces mock data with actual job and customer data
   */
  async getSalesPerformance(period: 'today' | 'week' | 'month' = 'month') {
    try {
      const startDate = this.calculateDateRange(period);

      // Get top performers by revenue using MongoDB aggregation
      const topPerformersData = await this.jobModel.aggregate([
        {
          $match: {
            status: { $in: ['scheduled', 'in_progress', 'completed'] },
            createdAt: { $gte: startDate },
            createdBy: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$createdBy',
            sales: { $sum: 1 },
            revenue: { $sum: '$estimatedCost' }
          }
        },
        {
          $sort: { revenue: -1 }
        },
        {
          $limit: 5
        }
      ]).exec();

      // Lookup user details for top performers
      const topPerformers = await Promise.all(
        topPerformersData.map(async (performer) => {
          try {
            const user = await this.userModel.findById(performer._id).exec();

            if (!user) {
              return {
                id: performer._id.toString(),
                name: 'Unknown User',
                role: 'Unknown',
                sales: performer.sales,
                revenue: Math.round(performer.revenue),
                conversion: 0 // TODO: Calculate from estimates
              };
            }

            return {
              id: performer._id.toString(),
              name: `${user.firstName} ${user.lastName}`,
              role: user.role?.name || 'Unknown',
              sales: performer.sales,
              revenue: Math.round(performer.revenue),
              conversion: 0 // TODO: Calculate conversion rate from estimates to jobs
            };
          } catch (error) {
            this.logger.error(`Failed to lookup user ${performer._id}: ${error.message}`);
            return {
              id: performer._id.toString(),
              name: 'Unknown User',
              role: 'Unknown',
              sales: performer.sales,
              revenue: Math.round(performer.revenue),
              conversion: 0
            };
          }
        })
      );

      // Get referral sources by leads
      const referralSourcesData = await this.customerModel.aggregate([
        {
          $match: {
            source: { $exists: true, $ne: null },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$source',
            leads: { $sum: 1 }
          }
        },
        {
          $sort: { leads: -1 }
        },
        {
          $limit: 10
        }
      ]).exec();

      // Calculate conversions for each source
      const referralSources = await Promise.all(
        referralSourcesData.map(async (source) => {
          try {
            // Find customers from this source that have jobs
            const customersWithJobs = await this.customerModel.aggregate([
              {
                $match: {
                  source: source._id,
                  createdAt: { $gte: startDate },
                  jobs: { $exists: true, $not: { $size: 0 } }
                }
              },
              {
                $count: 'total'
              }
            ]).exec();

            const conversions = customersWithJobs[0]?.total || 0;
            const conversionRate = source.leads > 0
              ? Math.round((conversions / source.leads) * 100)
              : 0;

            // Get total revenue from jobs associated with this source
            // This is a simplified calculation - ideally we'd join through customer->job relationship
            const revenue = 0; // TODO: Calculate actual revenue from jobs

            return {
              id: source._id,
              name: this.formatSourceName(source._id),
              leads: source.leads,
              conversions,
              revenue,
              conversionRate
            };
          } catch (error) {
            this.logger.error(`Failed to calculate conversions for source ${source._id}: ${error.message}`);
            return {
              id: source._id,
              name: this.formatSourceName(source._id),
              leads: source.leads,
              conversions: 0,
              revenue: 0,
              conversionRate: 0
            };
          }
        })
      );

      return {
        topPerformers,
        referralSources
      };
    } catch (error) {
      this.logger.error(`Failed to get sales performance: ${error.message}`, error.stack);
      // Return fallback values on error
      return {
        topPerformers: [],
        referralSources: []
      };
    }
  }

  /**
   * Format source name for display
   */
  private formatSourceName(source: string): string {
    const sourceMap: Record<string, string> = {
      'website': 'Website',
      'referral': 'Referrals',
      'google': 'Google',
      'facebook': 'Facebook',
      'yelp': 'Yelp',
      'direct': 'Direct',
      'other': 'Other'
    };

    return sourceMap[source] || source.charAt(0).toUpperCase() + source.slice(1);
  }
}