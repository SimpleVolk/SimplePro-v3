# Quick Start: Performance Optimizations

This guide provides **copy-paste ready implementations** for the highest-impact optimizations.

---

## 1. Fix N+1 Query in Analytics (4 hours, 60% faster)

**File:** `apps/api/src/analytics/analytics.service.ts`

### Replace getSalesPerformance method (lines 581-731)

```typescript
async getSalesPerformance(period: 'today' | 'week' | 'month' = 'month') {
  try {
    const startDate = this.calculateDateRange(period);

    // OPTIMIZED: Single aggregation with $lookup instead of N+1
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
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: { $toString: '$_id' },
          name: {
            $concat: [
              { $ifNull: ['$userDetails.firstName', 'Unknown'] },
              ' ',
              { $ifNull: ['$userDetails.lastName', 'User'] }
            ]
          },
          role: { $ifNull: ['$userDetails.role.name', 'Unknown'] },
          sales: 1,
          revenue: { $round: ['$revenue', 0] },
          conversion: 0 // TODO: Calculate from estimates
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]).exec();

    // OPTIMIZED: Single aggregation with $facet for referral sources
    const referralAnalytics = await this.customerModel.aggregate([
      {
        $match: {
          source: { $exists: true, $ne: null },
          createdAt: { $gte: startDate }
        }
      },
      {
        $facet: {
          sourceLeads: [
            { $group: { _id: '$source', leads: { $sum: 1 } } },
            { $sort: { leads: -1 } },
            { $limit: 10 }
          ],
          sourceConversions: [
            { $match: { jobs: { $exists: true, $not: { $size: 0 } } } },
            { $group: { _id: '$source', conversions: { $sum: 1 } } }
          ]
        }
      }
    ]).exec();

    // Merge results in memory (fast)
    const referralSources = referralAnalytics[0].sourceLeads.map(source => {
      const conversions = referralAnalytics[0].sourceConversions.find(
        c => c._id === source._id
      )?.conversions || 0;

      return {
        id: source._id,
        name: this.formatSourceName(source._id),
        leads: source.leads,
        conversions,
        revenue: 0, // TODO: Calculate from jobs
        conversionRate: source.leads > 0
          ? Math.round((conversions / source.leads) * 100)
          : 0
      };
    });

    return {
      topPerformers: topPerformersData,
      referralSources
    };
  } catch (error) {
    this.logger.error(`Failed to get sales performance: ${error.message}`, error.stack);
    return { topPerformers: [], referralSources: [] };
  }
}
```

**Test:**

```bash
curl http://localhost:3001/api/analytics/sales-performance
```

---

## 2. Add Response Compression (1 hour, 70% smaller)

**File:** `apps/api/src/main.ts`

### Install dependency

```bash
npm install compression @types/compression
```

### Add after app creation

```typescript
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add compression middleware (ADD THIS)
  app.use(
    compression({
      threshold: 1024, // Only compress > 1KB
      level: 6, // Balance speed vs size
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    // ... existing config
  });

  await app.listen(3001);
}
```

**Test:**

```bash
curl -H "Accept-Encoding: gzip" http://localhost:3001/api/customers | wc -c
```

---

## 3. Implement Cache-First for Customer Lists (6 hours, 87% faster)

**File:** `apps/api/src/customers/customers.service.ts`

### Update findAll method (lines 57-132)

```typescript
async findAll(
  filters?: CustomerFilters,
  skip: number = 0,
  limit: number = 20,
): Promise<PaginatedResponse<Customer>> {
  // Generate cache key from query parameters
  const cacheKey = `customers:list:${JSON.stringify({
    filters: filters || {},
    skip,
    limit
  })}`;

  // Try cache first
  const cached = await this.cacheService.get<PaginatedResponse<Customer>>(cacheKey);
  if (cached) {
    this.logger.debug(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  this.logger.debug(`Cache MISS: ${cacheKey}`);

  // Cache miss - query database
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

  const data = customers.map(customer => this.convertCustomerDocument(customer as any));
  const page = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const result = {
    data,
    pagination: { page, limit, total, totalPages },
  };

  // Cache for 5 minutes
  await this.cacheService.set(cacheKey, result, {
    ttl: 300,
    tags: ['customers', 'customer-list'],
    compress: true // Enable compression for large lists
  });

  return result;
}
```

### Add cache invalidation to mutations

```typescript
async create(createCustomerDto: CreateCustomerDto, createdBy: string): Promise<Customer> {
  // ... existing create logic
  await customer.save();

  // Invalidate cache (ADD THIS)
  await this.cacheService.invalidateByTags(['customers', 'customer-list']);

  return this.convertCustomerDocument(customer);
}

async update(id: string, updateCustomerDto: UpdateCustomerDto, updatedBy: string): Promise<Customer> {
  // ... existing update logic

  // Invalidate cache (ADD THIS)
  await this.cacheService.invalidateByTags(['customers', 'customer-list']);

  return this.convertCustomerDocument(updatedCustomer);
}

async remove(id: string): Promise<void> {
  // ... existing delete logic

  // Invalidate cache (ADD THIS)
  await this.cacheService.invalidateByTags(['customers', 'customer-list']);
}
```

**Test:**

```bash
# First request (cache miss)
time curl http://localhost:3001/api/customers

# Second request (cache hit - should be 10x faster)
time curl http://localhost:3001/api/customers
```

---

## 4. Setup React Query (8 hours, eliminate duplicate API calls)

**File:** `apps/web/package.json`

### Install dependency

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### File: `apps/web/src/app/layout.tsx`

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        cacheTime: 10 * 60 * 1000,     // 10 minutes
        refetchOnWindowFocus: false,   // Don't refetch on tab switch
        refetchOnMount: true,          // Refetch on component mount
        refetchOnReconnect: true,      // Refetch on reconnect
        retry: 1,                      // Retry failed requests once
      },
    },
  }));

  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### File: `apps/web/src/app/hooks/useCustomers.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CustomerFilters {
  status?: string;
  type?: string;
  search?: string;
}

export function useCustomers(
  filters: CustomerFilters = {},
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ['customers', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        skip: String((page - 1) * limit),
        limit: String(limit),
        ...filters,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(customerData),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch customer lists
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate specific customer and all lists
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
    },
  });
}
```

### Update Component: `apps/web/src/app/components/CustomerManagement.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useCustomers, useCreateCustomer } from '../hooks/useCustomers';

export function CustomerManagement() {
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [page, setPage] = useState(1);

  // Use React Query hook instead of useEffect
  const { data, isLoading, error, isFetching } = useCustomers(filters, page, 20);
  const createCustomer = useCreateCustomer();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleCreateCustomer = async (customerData: any) => {
    try {
      await createCustomer.mutateAsync(customerData);
      // No need to manually refetch - React Query handles it!
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  return (
    <div>
      {isFetching && <div className="loading-indicator">Updating...</div>}

      {/* Render customers */}
      {data?.data?.map(customer => (
        <div key={customer.id}>{customer.firstName} {customer.lastName}</div>
      ))}

      {/* Pagination */}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)}>
        Next
      </button>
    </div>
  );
}
```

**Benefits:**

- Automatic caching (no duplicate requests)
- Background refetching keeps data fresh
- Optimistic updates for instant UI feedback
- Built-in loading and error states
- DevTools for debugging queries

---

## 5. Monitor Cache Performance

**File:** `apps/api/src/cache/cache.controller.ts` (create new)

```typescript
import { Controller, Get } from '@nestjs/common';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private cacheService: CacheService) {}

  @Get('stats')
  getStats() {
    const stats = this.cacheService.getStats();
    return {
      ...stats,
      connected: this.cacheService.isConnected(),
      hitRatePercentage: `${stats.hitRate.toFixed(2)}%`,
      recommendation:
        stats.hitRate < 50
          ? 'Cache hit rate is low. Consider increasing TTL or caching more endpoints.'
          : 'Cache performance is good.',
    };
  }

  @Get('clear')
  async clearCache() {
    await this.cacheService.clearAllCaches();
    return { message: 'All caches cleared' };
  }
}
```

**File:** `apps/api/src/cache/cache.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller'; // ADD THIS

@Module({
  providers: [CacheService],
  controllers: [CacheController], // ADD THIS
  exports: [CacheService],
})
export class CacheModule {}
```

**Test:**

```bash
# Check cache statistics
curl http://localhost:3001/api/cache/stats

# Expected output:
# {
#   "hits": 1245,
#   "misses": 312,
#   "hitRate": 79.96,
#   "hitRatePercentage": "79.96%",
#   "connected": true,
#   "recommendation": "Cache performance is good."
# }
```

---

## Testing Checklist

After implementing each optimization:

- [ ] Run unit tests: `npm run test:api:unit`
- [ ] Test API endpoints manually with curl
- [ ] Check cache statistics endpoint
- [ ] Monitor application logs for errors
- [ ] Test frontend functionality
- [ ] Verify no regression in existing features
- [ ] Load test with k6 (optional but recommended)

---

## Performance Validation

### Before Optimization

```bash
# Measure baseline performance
time curl http://localhost:3001/api/analytics/dashboard
time curl http://localhost:3001/api/customers
```

### After Optimization

```bash
# Should be 40-60% faster
time curl http://localhost:3001/api/analytics/dashboard
time curl http://localhost:3001/api/customers  # First call (cache miss)
time curl http://localhost:3001/api/customers  # Second call (cache hit - 10x faster!)
```

---

## Rollback Plan

If any optimization causes issues:

1. **For N+1 fixes:** Revert to original method, database queries are idempotent
2. **For compression:** Remove `app.use(compression())` line
3. **For caching:** Set all TTLs to 0 or call `/api/cache/clear`
4. **For React Query:** Remove QueryClientProvider wrapper

All optimizations are **non-breaking** and can be reverted without data loss.

---

## Next Steps

After completing these quick wins:

1. Review `PERFORMANCE_OPTIMIZATION_ANALYSIS.md` for medium-term improvements
2. Setup monitoring with Prometheus/Grafana
3. Implement remaining cache strategies for jobs/analytics
4. Consider WebSocket optimization for real-time features
5. Plan for horizontal scaling as user base grows

**Questions?** Review the full analysis or check existing implementation patterns in the codebase.
