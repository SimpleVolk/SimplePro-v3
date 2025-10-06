/**
 * Cache-enhanced methods for JobsService
 *
 * Caching strategy for jobs:
 * - Individual jobs: 5 minutes TTL
 * - Job lists: 3 minutes TTL (frequent updates)
 * - Calendar views: 2 minutes TTL (very dynamic)
 * - Job stats: 5 minutes TTL
 */

import { Job, JobFilters } from './interfaces/job.interface';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { CacheService } from '../cache/cache.service';

/**
 * CACHED findAll - Cache paginated job lists
 * Cache key pattern: jobs:list:{filters}:{skip}:{limit}
 * TTL: 3 minutes
 */
export async function findAllCached(
  this: any,
  filters?: JobFilters,
  skip = 0,
  limit = 20,
): Promise<PaginatedResponse<Job>> {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = `jobs:list:${JSON.stringify(filters || {})}:${skip}:${limit}`;

  const cached = await cacheService.get<PaginatedResponse<Job>>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build MongoDB query
  const query: any = {};

  if (filters) {
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.assignedCrew) query.assignedCrew = filters.assignedCrew;

    if (filters.scheduledAfter || filters.scheduledBefore) {
      query.scheduledDate = {};
      if (filters.scheduledAfter)
        query.scheduledDate.$gte = filters.scheduledAfter;
      if (filters.scheduledBefore)
        query.scheduledDate.$lte = filters.scheduledBefore;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }
  }

  const [total, jobs] = await Promise.all([
    this.jobModel.countDocuments(query).exec(),
    this.jobModel
      .find(query)
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
  ]);

  const data = jobs.map((job: any) => this.convertJobDocument(job));
  const page = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const result = {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };

  // Cache for 3 minutes
  await cacheService.set(cacheKey, result, { ttl: 180, tags: ['jobs'] });

  return result;
}

/**
 * CACHED findOne - Cache individual job lookups
 * Cache key pattern: job:{id}
 * TTL: 5 minutes
 */
export async function findOneCached(this: any, id: string): Promise<Job> {
  const cacheService: CacheService = this.cacheService;

  const cached = await cacheService.getJobCache<Job>(id);
  if (cached) {
    return cached;
  }

  const job = await this.jobModel.findById(id).exec();
  if (!job) {
    throw new Error(`Job with ID ${id} not found`);
  }

  const result = this.convertJobDocument(job);

  // Cache for 5 minutes
  await cacheService.setJobCache(id, result);

  return result;
}

/**
 * CACHED getCalendarWeek - Cache weekly calendar view
 * Cache key pattern: jobs:calendar:{startDate}
 * TTL: 2 minutes (very dynamic, short TTL)
 */
export async function getCalendarWeekCached(
  this: any,
  startDate: Date,
): Promise<Job[]> {
  const cacheService: CacheService = this.cacheService;

  // Normalize to start of day for consistent cache keys
  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);

  const cacheKey = `jobs:calendar:${normalizedStart.toISOString()}`;

  const cached = await cacheService.get<Job[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const endDate = new Date(normalizedStart);
  endDate.setDate(endDate.getDate() + 7);

  const jobs = await this.jobModel
    .find({
      scheduledDate: {
        $gte: normalizedStart,
        $lt: endDate,
      },
    })
    .sort({ scheduledDate: 1 })
    .lean()
    .exec();

  const result = jobs.map((job: any) => this.convertJobDocument(job));

  // Cache for 2 minutes (calendar is dynamic)
  await cacheService.set(cacheKey, result, {
    ttl: 120,
    tags: ['jobs', 'calendar'],
  });

  return result;
}

/**
 * CACHED getJobStats - Cache job statistics
 * Cache key: jobs:stats
 * TTL: 5 minutes
 */
export async function getJobStatsCached(this: any) {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = 'jobs:stats';

  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [
    totalCount,
    scheduledCount,
    inProgressCount,
    completedCount,
    cancelledCount,
    revenueData,
  ] = await Promise.all([
    this.jobModel.countDocuments().exec(),
    this.jobModel.countDocuments({ status: 'scheduled' }).exec(),
    this.jobModel.countDocuments({ status: 'in_progress' }).exec(),
    this.jobModel.countDocuments({ status: 'completed' }).exec(),
    this.jobModel.countDocuments({ status: 'cancelled' }).exec(),
    this.jobModel
      .aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.finalPrice' } } },
      ])
      .exec(),
  ]);

  const stats = {
    total: totalCount,
    byStatus: {
      scheduled: scheduledCount,
      in_progress: inProgressCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    totalRevenue: revenueData[0]?.total || 0,
  };

  // Cache for 5 minutes
  await cacheService.set(cacheKey, stats, {
    ttl: 300,
    tags: ['jobs', 'analytics'],
  });

  return stats;
}

/**
 * CACHE INVALIDATION for create
 */
export async function invalidateCacheOnJobCreate(cacheService: CacheService) {
  await Promise.all([
    cacheService.deletePattern('jobs:list:*'),
    cacheService.deletePattern('jobs:calendar:*'),
    cacheService.del('jobs:stats'),
  ]);
}

/**
 * CACHE INVALIDATION for update
 */
export async function invalidateCacheOnJobUpdate(
  cacheService: CacheService,
  jobId: string,
) {
  await Promise.all([
    cacheService.del(`job:${jobId}`),
    cacheService.deletePattern('jobs:list:*'),
    cacheService.deletePattern('jobs:calendar:*'),
    cacheService.del('jobs:stats'),
  ]);
}

/**
 * CACHE INVALIDATION for status update
 * Status changes affect stats and lists heavily
 */
export async function invalidateCacheOnStatusChange(
  cacheService: CacheService,
  jobId: string,
) {
  await Promise.all([
    cacheService.del(`job:${jobId}`),
    cacheService.deletePattern('jobs:list:*'),
    cacheService.deletePattern('jobs:calendar:*'),
    cacheService.del('jobs:stats'),
    cacheService.clearJobCaches(), // Clear all job-related caches on status change
  ]);
}

/**
 * CACHE INVALIDATION for delete
 */
export async function invalidateCacheOnJobDelete(
  cacheService: CacheService,
  jobId: string,
) {
  await Promise.all([
    cacheService.del(`job:${jobId}`),
    cacheService.deletePattern('jobs:list:*'),
    cacheService.deletePattern('jobs:calendar:*'),
    cacheService.del('jobs:stats'),
  ]);
}
