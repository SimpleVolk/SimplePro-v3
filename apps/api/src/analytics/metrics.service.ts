import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsService, AnalyticsEventInput } from './analytics.service';

export interface MetricEvent {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
  userId: string;
}

export interface BusinessMetrics {
  // Revenue metrics
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageJobValue: number;
  revenueGrowthRate: number;

  // Operational metrics
  jobCompletionRate: number;
  averageJobDuration: number;
  crewUtilization: number;
  onTimeDeliveryRate: number;

  // Customer metrics
  customerSatisfactionScore: number;
  customerRetentionRate: number;
  newCustomerAcquisitionRate: number;
  churnRate: number;

  // Efficiency metrics
  estimateAccuracy: number;
  crewProductivity: number;
  equipmentUtilization: number;
  costPerJob: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private analyticsService: AnalyticsService) {}

  // Track a simple metric event
  async trackMetric(metric: MetricEvent): Promise<void> {
    try {
      const event: AnalyticsEventInput = {
        eventType: `metric_${metric.name}`,
        category: 'metrics',
        data: {
          metricName: metric.name,
          value: metric.value,
          tags: metric.tags || {}
        },
        userId: metric.userId,
        metadata: {
          source: 'metrics_service',
          tags: metric.tags
        }
      };

      await this.analyticsService.trackEvent(event);
      this.logger.debug(`Tracked metric: ${metric.name} = ${metric.value}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to track metric ${metric.name}: ${errorMessage}`, errorStack);
    }
  }

  // Track job-related metrics
  async trackJobMetrics(jobData: {
    jobId: string;
    customerId: string;
    serviceType: string;
    revenue: number;
    cost: number;
    duration: number; // in hours
    crewSize: number;
    isOnTime: boolean;
    customerRating?: number;
    userId: string;
  }): Promise<void> {
    try {
      const profit = jobData.revenue - jobData.cost;
      const profitMargin = jobData.revenue > 0 ? (profit / jobData.revenue) * 100 : 0;

      // Track multiple job-related events
      const events: AnalyticsEventInput[] = [
        // Job completion event
        {
          eventType: 'job_completed',
          category: 'jobs',
          data: {
            serviceType: jobData.serviceType,
            crewSize: jobData.crewSize,
            duration: jobData.duration,
            onTime: jobData.isOnTime,
            customerRating: jobData.customerRating
          },
          userId: jobData.userId,
          jobId: jobData.jobId,
          customerId: jobData.customerId,
          revenue: jobData.revenue,
          cost: jobData.cost,
          profit: profit,
          duration: jobData.duration * 60, // convert to minutes
          efficiency: this.calculateJobEfficiency(jobData)
        },

        // Revenue event
        {
          eventType: 'revenue_generated',
          category: 'revenue',
          data: {
            source: 'job_completion',
            serviceType: jobData.serviceType,
            profitMargin: profitMargin
          },
          userId: jobData.userId,
          jobId: jobData.jobId,
          customerId: jobData.customerId,
          revenue: jobData.revenue,
          cost: jobData.cost,
          profit: profit
        }
      ];

      // Track customer satisfaction if rating provided
      if (jobData.customerRating) {
        events.push({
          eventType: 'customer_feedback',
          category: 'customer',
          data: {
            rating: jobData.customerRating,
            serviceType: jobData.serviceType
          },
          userId: jobData.userId,
          jobId: jobData.jobId,
          customerId: jobData.customerId
        });
      }

      // Track on-time performance
      events.push({
        eventType: jobData.isOnTime ? 'job_ontime' : 'job_delayed',
        category: 'performance',
        data: {
          serviceType: jobData.serviceType,
          duration: jobData.duration
        },
        userId: jobData.userId,
        jobId: jobData.jobId,
        customerId: jobData.customerId
      });

      // Save all events
      await Promise.all(events.map(event => this.analyticsService.trackEvent(event)));

      this.logger.log(`Tracked job metrics for job ${jobData.jobId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to track job metrics: ${errorMessage}`, errorStack);
    }
  }

  // Track crew performance metrics
  async trackCrewMetrics(crewData: {
    crewId: string;
    memberId: string;
    jobId: string;
    hoursWorked: number;
    efficiency: number;
    rating?: number;
    userId: string;
  }): Promise<void> {
    try {
      const event: AnalyticsEventInput = {
        eventType: 'crew_performance',
        category: 'crew',
        data: {
          hoursWorked: crewData.hoursWorked,
          efficiency: crewData.efficiency,
          rating: crewData.rating
        },
        userId: crewData.userId,
        jobId: crewData.jobId,
        crewId: crewData.crewId,
        duration: crewData.hoursWorked * 60, // convert to minutes
        efficiency: crewData.efficiency
      };

      await this.analyticsService.trackEvent(event);
      this.logger.debug(`Tracked crew metrics for crew ${crewData.crewId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to track crew metrics: ${errorMessage}`, errorStack);
    }
  }

  // Track customer acquisition
  async trackCustomerAcquisition(customerData: {
    customerId: string;
    source: string; // 'website', 'referral', 'social_media', etc.
    estimatedValue: number;
    userId: string;
  }): Promise<void> {
    try {
      const event: AnalyticsEventInput = {
        eventType: 'customer_acquired',
        category: 'customer',
        data: {
          source: customerData.source,
          estimatedValue: customerData.estimatedValue
        },
        userId: customerData.userId,
        customerId: customerData.customerId
      };

      await this.analyticsService.trackEvent(event);
      this.logger.log(`Tracked customer acquisition: ${customerData.customerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to track customer acquisition: ${errorMessage}`, errorStack);
    }
  }

  // Track estimate metrics
  async trackEstimateMetrics(estimateData: {
    estimateId: string;
    customerId: string;
    serviceType: string;
    estimatedValue: number;
    actualValue?: number;
    wasAccepted: boolean;
    conversionTime?: number; // days from estimate to job
    userId: string;
  }): Promise<void> {
    try {
      const events: AnalyticsEventInput[] = [
        // Estimate generated
        {
          eventType: 'estimate_generated',
          category: 'estimates',
          data: {
            serviceType: estimateData.serviceType,
            estimatedValue: estimateData.estimatedValue,
            wasAccepted: estimateData.wasAccepted
          },
          userId: estimateData.userId,
          estimateId: estimateData.estimateId,
          customerId: estimateData.customerId
        }
      ];

      // Track estimate acceptance/rejection
      if (estimateData.wasAccepted) {
        events.push({
          eventType: 'estimate_accepted',
          category: 'estimates',
          data: {
            serviceType: estimateData.serviceType,
            conversionTime: estimateData.conversionTime
          },
          userId: estimateData.userId,
          estimateId: estimateData.estimateId,
          customerId: estimateData.customerId,
          revenue: estimateData.actualValue || estimateData.estimatedValue
        });

        // Track estimate accuracy if actual value available
        if (estimateData.actualValue) {
          const accuracy = this.calculateEstimateAccuracy(
            estimateData.estimatedValue,
            estimateData.actualValue
          );

          events.push({
            eventType: 'estimate_accuracy',
            category: 'estimates',
            data: {
              estimatedValue: estimateData.estimatedValue,
              actualValue: estimateData.actualValue,
              accuracy: accuracy,
              serviceType: estimateData.serviceType
            },
            userId: estimateData.userId,
            estimateId: estimateData.estimateId,
            customerId: estimateData.customerId,
            efficiency: accuracy
          });
        }
      } else {
        events.push({
          eventType: 'estimate_rejected',
          category: 'estimates',
          data: {
            serviceType: estimateData.serviceType,
            estimatedValue: estimateData.estimatedValue
          },
          userId: estimateData.userId,
          estimateId: estimateData.estimateId,
          customerId: estimateData.customerId
        });
      }

      await Promise.all(events.map(event => this.analyticsService.trackEvent(event)));
      this.logger.log(`Tracked estimate metrics for estimate ${estimateData.estimateId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to track estimate metrics: ${errorMessage}`, errorStack);
    }
  }

  // Get current business metrics summary
  async getBusinessMetrics(period?: { startDate: Date; endDate: Date }): Promise<BusinessMetrics> {
    try {
      const defaultPeriod = period || {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      };

      const dashboardMetrics = await this.analyticsService.getDashboardMetrics(defaultPeriod);

      // Calculate business metrics from dashboard data
      return {
        // Revenue metrics
        totalRevenue: dashboardMetrics.totalRevenue,
        monthlyRecurringRevenue: dashboardMetrics.totalRevenue / 30 * 30, // Approximate MRR
        averageJobValue: dashboardMetrics.averageJobValue,
        revenueGrowthRate: 15.2, // Mock data - would be calculated from historical comparison

        // Operational metrics
        jobCompletionRate: dashboardMetrics.performanceMetrics.jobCompletionRate,
        averageJobDuration: dashboardMetrics.performanceMetrics.averageJobDuration,
        crewUtilization: dashboardMetrics.crewUtilization,
        onTimeDeliveryRate: dashboardMetrics.onTimePerformance,

        // Customer metrics
        customerSatisfactionScore: dashboardMetrics.customerSatisfaction,
        customerRetentionRate: 87.3, // Mock data
        newCustomerAcquisitionRate: 12.5, // Mock data
        churnRate: 4.2, // Mock data

        // Efficiency metrics
        estimateAccuracy: 92.8, // Mock data
        crewProductivity: dashboardMetrics.performanceMetrics.averageCrewEfficiency,
        equipmentUtilization: 78.5, // Mock data
        costPerJob: dashboardMetrics.averageJobValue * 0.65 // Mock cost ratio
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to get business metrics: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  // Private helper methods
  private calculateJobEfficiency(jobData: {
    duration: number;
    crewSize: number;
    serviceType: string;
  }): number {
    // Mock efficiency calculation based on expected vs actual duration
    const expectedDurations = {
      'local': 4.0,
      'long_distance': 8.0,
      'storage': 2.0,
      'packing_only': 3.0
    };

    const expected = expectedDurations[jobData.serviceType as keyof typeof expectedDurations] || 4.0;
    const efficiency = Math.max(0, Math.min(100, (expected / jobData.duration) * 100));

    return Math.round(efficiency * 10) / 10; // Round to 1 decimal place
  }

  private calculateEstimateAccuracy(estimated: number, actual: number): number {
    const difference = Math.abs(estimated - actual);
    const accuracy = Math.max(0, 100 - (difference / estimated) * 100);
    return Math.round(accuracy * 10) / 10; // Round to 1 decimal place
  }
}