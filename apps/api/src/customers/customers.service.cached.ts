/**
 * This file contains cache-enhanced methods for CustomersService
 *
 * To integrate:
 * 1. Add CacheService to CustomersService constructor (DONE)
 * 2. Replace findAll, findOne, findByEmail with these cached versions
 * 3. Add cache invalidation to create, update, remove methods
 */

import { Customer, CustomerFilters } from './interfaces/customer.interface';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { CacheService } from '../cache/cache.service';

/**
 * CACHED findAll - Cache paginated customer lists
 * Cache key pattern: customers:list:{filters}:{skip}:{limit}
 * TTL: 5 minutes
 * Invalidated when: Any customer is created/updated/deleted
 */
export async function findAllCached(
  this: any,
  filters?: CustomerFilters,
  skip: number = 0,
  limit: number = 20,
): Promise<PaginatedResponse<Customer>> {
  const cacheService: CacheService = this.cacheService;

  // Generate cache key from filters
  const cacheKey = `customers:list:${JSON.stringify(filters || {})}:${skip}:${limit}`;

  // Try cache first
  const cached = await cacheService.get<PaginatedResponse<Customer>>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build MongoDB query object
  const query: any = {};

  if (filters) {
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.source) query.source = filters.source;
    if (filters.assignedSalesRep) query.assignedSalesRep = filters.assignedSalesRep;

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.leadScoreMin !== undefined || filters.leadScoreMax !== undefined) {
      query.leadScore = {};
      if (filters.leadScoreMin !== undefined) {
        query.leadScore.$gte = filters.leadScoreMin;
      }
      if (filters.leadScoreMax !== undefined) {
        query.leadScore.$lte = filters.leadScoreMax;
      }
    }

    if (filters.createdAfter || filters.createdBefore) {
      query.createdAt = {};
      if (filters.createdAfter) query.createdAt.$gte = filters.createdAfter;
      if (filters.createdBefore) query.createdAt.$lte = filters.createdBefore;
    }

    if (filters.lastContactAfter || filters.lastContactBefore) {
      query.lastContactDate = {};
      if (filters.lastContactAfter) query.lastContactDate.$gte = filters.lastContactAfter;
      if (filters.lastContactBefore) query.lastContactDate.$lte = filters.lastContactBefore;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }
  }

  const [total, customers] = await Promise.all([
    this.customerModel.countDocuments(query).exec(),
    this.customerModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
  ]);

  const data = customers.map((customer: any) => this.convertCustomerDocument(customer));
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

  // Cache the result for 5 minutes
  await cacheService.set(cacheKey, result, { ttl: 300, tags: ['customers'] });

  return result;
}

/**
 * CACHED findOne - Cache individual customer lookups
 * Cache key pattern: customer:{id}
 * TTL: 10 minutes
 * Invalidated when: Customer is updated/deleted
 */
export async function findOneCached(
  this: any,
  id: string
): Promise<Customer> {
  const cacheService: CacheService = this.cacheService;

  // Try cache first
  const cached = await cacheService.getCustomerCache<Customer>(id);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const customer = await this.customerModel.findById(id).exec();
  if (!customer) {
    throw new Error(`Customer with ID ${id} not found`);
  }

  const result = this.convertCustomerDocument(customer);

  // Cache for 10 minutes
  await cacheService.setCustomerCache(id, result);

  return result;
}

/**
 * CACHED findByEmail - Cache email lookups
 * Cache key pattern: customer:email:{email}
 * TTL: 10 minutes
 */
export async function findByEmailCached(
  this: any,
  email: string
): Promise<Customer | null> {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = `customer:email:${email.toLowerCase()}`;

  const cached = await cacheService.get<Customer | null>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const customer = await this.customerModel.findOne({
    email: new RegExp(`^${email}$`, 'i')
  }).exec();

  const result = customer ? this.convertCustomerDocument(customer) : null;

  await cacheService.set(cacheKey, result, { ttl: 600, tags: ['customers'] });

  return result;
}

/**
 * CACHED getCustomerStats - Cache analytics statistics
 * Cache key: customers:stats
 * TTL: 5 minutes
 */
export async function getCustomerStatsCached(this: any) {
  const cacheService: CacheService = this.cacheService;

  const cacheKey = 'customers:stats';

  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCount, recentCount, statusCounts, typeCounts, sourceCounts] = await Promise.all([
    this.customerModel.countDocuments().exec(),
    this.customerModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).exec(),
    this.customerModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).exec(),
    this.customerModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]).exec(),
    this.customerModel.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]).exec()
  ]);

  const stats = {
    total: totalCount,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    recentlyCreated: recentCount,
  };

  statusCounts.forEach(({ _id, count }) => {
    stats.byStatus[_id] = count;
  });

  typeCounts.forEach(({ _id, count }) => {
    stats.byType[_id] = count;
  });

  sourceCounts.forEach(({ _id, count }) => {
    stats.bySource[_id] = count;
  });

  // Cache for 5 minutes
  await cacheService.set(cacheKey, stats, { ttl: 300, tags: ['customers', 'analytics'] });

  return stats;
}

/**
 * CACHE INVALIDATION for create
 * Invalidate list caches and stats when a customer is created
 */
export async function invalidateCacheOnCreate(cacheService: CacheService) {
  await Promise.all([
    cacheService.deletePattern('customers:list:*'),
    cacheService.del('customers:stats'),
  ]);
}

/**
 * CACHE INVALIDATION for update
 * Invalidate specific customer cache, list caches, and stats
 */
export async function invalidateCacheOnUpdate(cacheService: CacheService, customerId: string) {
  await Promise.all([
    cacheService.del(`customer:${customerId}`),
    cacheService.deletePattern('customer:email:*'),
    cacheService.deletePattern('customers:list:*'),
    cacheService.del('customers:stats'),
  ]);
}

/**
 * CACHE INVALIDATION for delete
 * Invalidate all customer-related caches
 */
export async function invalidateCacheOnDelete(cacheService: CacheService, customerId: string) {
  await Promise.all([
    cacheService.del(`customer:${customerId}`),
    cacheService.deletePattern('customer:email:*'),
    cacheService.deletePattern('customers:list:*'),
    cacheService.del('customers:stats'),
    cacheService.clearCustomerCaches(),
  ]);
}
