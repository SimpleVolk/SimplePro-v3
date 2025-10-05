/**
 * Cache-enhanced methods for AnalyticsService
 *
 * Analytics caching strategy:
 * - Dashboard metrics: 5 minutes TTL (real-time feel but reduce load)
 * - Revenue analysis: 10 minutes TTL (less volatile)
 * - Conversion funnel: 15 minutes TTL (stable over time)
 * - Performance metrics: 10 minutes TTL
 *
 * All analytics caches invalidated when jobs/customers are updated
 */

import { CacheService } from '../cache/cache.service';

/**
 * CACHED getDashboardMetrics - Cache dashboard KPIs
 * Cache key: analytics:dashboard:metrics
 * TTL: 5 minutes
 *
 * Returns real-time business metrics for dashboard
 */
export async function getDashboardMetricsCached(this: any) {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = 'analytics:dashboard:metrics';

  const cached = await cacheService.getAnalyticsCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Calculate current metrics
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalJobs,
    jobsThisMonth,
    jobsLastMonth,
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    totalCustomers,
    customersThisMonth,
    activeJobs,
  ] = await Promise.all([
    this.jobModel.countDocuments().exec(),
    this.jobModel.countDocuments({ createdAt: { $gte: thisMonth } }).exec(),
    this.jobModel.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }).exec(),
    this.jobModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricing.finalPrice' } } }
    ]).exec(),
    this.jobModel.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$pricing.finalPrice' } } }
    ]).exec(),
    this.jobModel.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$pricing.finalPrice' } } }
    ]).exec(),
    this.customerModel.countDocuments().exec(),
    this.customerModel.countDocuments({ createdAt: { $gte: thisMonth } }).exec(),
    this.jobModel.countDocuments({ status: 'in_progress' }).exec(),
  ]);

  const metrics = {
    jobs: {
      total: totalJobs,
      thisMonth: jobsThisMonth,
      lastMonth: jobsLastMonth,
      growth: jobsLastMonth > 0 ? ((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100 : 0,
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      thisMonth: revenueThisMonth[0]?.total || 0,
      lastMonth: revenueLastMonth[0]?.total || 0,
      growth: revenueLastMonth[0]?.total > 0
        ? ((revenueThisMonth[0]?.total - revenueLastMonth[0]?.total) / revenueLastMonth[0]?.total) * 100
        : 0,
    },
    customers: {
      total: totalCustomers,
      thisMonth: customersThisMonth,
      growth: 0, // Calculate if needed
    },
    activeJobs: activeJobs,
    timestamp: new Date(),
  };

  // Cache for 5 minutes
  await cacheService.setAnalyticsCache(cacheKey, metrics, 300);

  return metrics;
}

/**
 * CACHED getRevenueAnalysis - Cache revenue breakdown
 * Cache key: analytics:revenue:{startDate}:{endDate}
 * TTL: 10 minutes
 */
export async function getRevenueAnalysisCached(
  this: any,
  startDate: Date,
  endDate: Date
) {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = `analytics:revenue:${startDate.toISOString()}:${endDate.toISOString()}`;

  const cached = await cacheService.getAnalyticsCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Aggregate revenue by various dimensions
  const [
    byType,
    byStatus,
    byMonth,
    topCustomers,
  ] = await Promise.all([
    this.jobModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$type', revenue: { $sum: '$pricing.finalPrice' }, count: { $sum: 1 } } }
    ]).exec(),
    this.jobModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', revenue: { $sum: '$pricing.finalPrice' }, count: { $sum: 1 } } }
    ]).exec(),
    this.jobModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$pricing.finalPrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).exec(),
    this.jobModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'completed' } },
      { $group: { _id: '$customerId', revenue: { $sum: '$pricing.finalPrice' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]).exec(),
  ]);

  const analysis = {
    byType,
    byStatus,
    byMonth,
    topCustomers,
    totalRevenue: byStatus.reduce((sum: number, item: any) => sum + item.revenue, 0),
    totalJobs: byStatus.reduce((sum: number, item: any) => sum + item.count, 0),
  };

  // Cache for 10 minutes
  await cacheService.setAnalyticsCache(cacheKey, analysis, 600);

  return analysis;
}

/**
 * CACHED getConversionFunnel - Cache sales funnel metrics
 * Cache key: analytics:funnel:{startDate}:{endDate}
 * TTL: 15 minutes
 */
export async function getConversionFunnelCached(
  this: any,
  startDate: Date,
  endDate: Date
) {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = `analytics:funnel:${startDate.toISOString()}:${endDate.toISOString()}`;

  const cached = await cacheService.getAnalyticsCache(cacheKey);
  if (cached) {
    return cached;
  }

  const [
    leads,
    prospects,
    opportunities,
    quotes,
    scheduledJobs,
    completedJobs,
  ] = await Promise.all([
    this.customerModel.countDocuments({
      status: 'lead',
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec(),
    this.customerModel.countDocuments({
      status: 'prospect',
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec(),
    this.opportunityModel.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec(),
    this.estimateModel.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec(),
    this.jobModel.countDocuments({
      status: 'scheduled',
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec(),
    this.jobModel.countDocuments({
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec(),
  ]);

  const funnel = {
    stages: [
      { name: 'Leads', count: leads, conversion: 100 },
      { name: 'Prospects', count: prospects, conversion: leads > 0 ? (prospects / leads) * 100 : 0 },
      { name: 'Opportunities', count: opportunities, conversion: prospects > 0 ? (opportunities / prospects) * 100 : 0 },
      { name: 'Quotes', count: quotes, conversion: opportunities > 0 ? (quotes / opportunities) * 100 : 0 },
      { name: 'Scheduled', count: scheduledJobs, conversion: quotes > 0 ? (scheduledJobs / quotes) * 100 : 0 },
      { name: 'Completed', count: completedJobs, conversion: scheduledJobs > 0 ? (completedJobs / scheduledJobs) * 100 : 0 },
    ],
    overallConversion: leads > 0 ? (completedJobs / leads) * 100 : 0,
  };

  // Cache for 15 minutes (funnel is stable)
  await cacheService.setAnalyticsCache(cacheKey, funnel, 900);

  return funnel;
}

/**
 * CACHED getPerformanceMetrics - Cache performance KPIs
 * Cache key: analytics:performance
 * TTL: 10 minutes
 */
export async function getPerformanceMetricsCached(this: any) {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = 'analytics:performance';

  const cached = await cacheService.getAnalyticsCache(cacheKey);
  if (cached) {
    return cached;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    avgJobDuration,
    avgResponseTime,
    customerSatisfaction,
    onTimeCompletion,
  ] = await Promise.all([
    this.jobModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: thirtyDaysAgo } } },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ['$completedAt', '$scheduledDate'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      { $group: { _id: null, avg: { $avg: '$duration' } } }
    ]).exec(),
    this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: 'lead_response',
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      { $group: { _id: null, avg: { $avg: '$duration' } } }
    ]).exec(),
    this.jobModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, avg: { $avg: '$customerRating' } } }
    ]).exec(),
    this.jobModel.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $project: {
          onTime: {
            $cond: [
              { $lte: ['$completedAt', '$estimatedCompletionDate'] },
              1,
              0
            ]
          }
        }
      },
      { $group: { _id: null, rate: { $avg: '$onTime' } } }
    ]).exec(),
  ]);

  const metrics = {
    avgJobDurationHours: avgJobDuration[0]?.avg || 0,
    avgResponseTimeMinutes: avgResponseTime[0]?.avg || 0,
    customerSatisfactionScore: customerSatisfaction[0]?.avg || 0,
    onTimeCompletionRate: (onTimeCompletion[0]?.rate || 0) * 100,
  };

  // Cache for 10 minutes
  await cacheService.setAnalyticsCache(cacheKey, metrics, 600);

  return metrics;
}

/**
 * Invalidate all analytics caches
 * Call this when jobs or customers are updated
 */
export async function invalidateAnalyticsCaches(cacheService: CacheService) {
  await cacheService.clearAnalyticsCaches();
}
