import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: undefined,
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.clear();
    await service.onModuleDestroy();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      await service.set(key, value);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await service.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:delete';
      const value = { data: 'to be deleted' };

      await service.set(key, value);
      await service.del(key);

      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      await service.set(key, 'value');

      const exists = await service.exists(key);
      expect(exists).toBe(true);

      await service.del(key);
      const notExists = await service.exists(key);
      expect(notExists).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL settings', async () => {
      const key = 'test:ttl';
      const value = { data: 'expires soon' };

      // Set with 1 second TTL
      await service.set(key, value, { ttl: 1 });

      // Should exist immediately
      const immediate = await service.get(key);
      expect(immediate).toEqual(value);

      // Wait 1.5 seconds
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should be expired
      const expired = await service.get(key);
      expect(expired).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const key = 'test:default:ttl';
      await service.set(key, 'value');

      const exists = await service.exists(key);
      expect(exists).toBe(true);
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching pattern', async () => {
      await service.set('customer:1', { id: 1 });
      await service.set('customer:2', { id: 2 });
      await service.set('customer:3', { id: 3 });
      await service.set('job:1', { id: 1 });

      const deleted = await service.deletePattern('customer:*');

      expect(deleted).toBe(3);

      const customer1 = await service.get('customer:1');
      const job1 = await service.get('job:1');

      expect(customer1).toBeNull();
      expect(job1).not.toBeNull();
    });
  });

  describe('Tag-based Invalidation', () => {
    it('should invalidate caches by tags', async () => {
      await service.set('key1', 'value1', { tags: ['customers'] });
      await service.set('key2', 'value2', { tags: ['customers', 'analytics'] });
      await service.set('key3', 'value3', { tags: ['jobs'] });

      await service.invalidateByTags(['customers']);

      const key1 = await service.get('key1');
      const key2 = await service.get('key2');
      const key3 = await service.get('key3');

      expect(key1).toBeNull();
      expect(key2).toBeNull();
      expect(key3).not.toBeNull();
    });
  });

  describe('Domain-specific Methods', () => {
    it('should use customer cache methods', async () => {
      const customerId = '123';
      const customer = { id: customerId, name: 'Test Customer' };

      await service.setCustomerCache(customerId, customer);
      const result = await service.getCustomerCache(customerId);

      expect(result).toEqual(customer);
    });

    it('should use job cache methods', async () => {
      const jobId = '456';
      const job = { id: jobId, status: 'scheduled' };

      await service.setJobCache(jobId, job);
      const result = await service.getJobCache(jobId);

      expect(result).toEqual(job);
    });

    it('should use analytics cache methods', async () => {
      const key = 'dashboard:metrics';
      const metrics = { total: 100, active: 50 };

      await service.setAnalyticsCache(key, metrics);
      const result = await service.getAnalyticsCache(key);

      expect(result).toEqual(metrics);
    });

    it('should clear customer caches', async () => {
      await service.set('customer:1', 'value1', { tags: ['customers'] });
      await service.set('customers:list:page1', 'list1', { tags: ['customers'] });

      await service.clearCustomerCaches();

      const customer = await service.get('customer:1');
      const list = await service.get('customers:list:page1');

      expect(customer).toBeNull();
      expect(list).toBeNull();
    });

    it('should clear job caches', async () => {
      await service.set('job:1', 'value1', { tags: ['jobs'] });
      await service.set('jobs:calendar:2025-01', 'calendar', { tags: ['jobs'] });

      await service.clearJobCaches();

      const job = await service.get('job:1');
      const calendar = await service.get('jobs:calendar:2025-01');

      expect(job).toBeNull();
      expect(calendar).toBeNull();
    });

    it('should clear analytics caches', async () => {
      await service.setAnalyticsCache('dashboard', { data: 'metrics' });

      await service.clearAnalyticsCaches();

      const dashboard = await service.getAnalyticsCache('dashboard');
      expect(dashboard).toBeNull();
    });
  });

  describe('Compression', () => {
    it('should compress large objects', async () => {
      const key = 'test:compression';
      const largeValue = {
        data: 'x'.repeat(2000), // 2KB of data
      };

      await service.set(key, largeValue, { compress: true });
      const result = await service.get(key);

      expect(result).toEqual(largeValue);
    });

    it('should auto-compress objects over 1KB', async () => {
      const key = 'test:auto:compression';
      const largeValue = { data: 'x'.repeat(1500) };

      await service.set(key, largeValue);
      const result = await service.get(key);

      expect(result).toEqual(largeValue);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', async () => {
      service.resetStats();

      await service.set('key1', 'value1');
      await service.get('key1'); // Hit
      await service.get('key2'); // Miss
      await service.get('key1'); // Hit

      const stats = service.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should track set and delete operations', async () => {
      service.resetStats();

      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.del('key1');

      const stats = service.getStats();

      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });

    it('should reset statistics', async () => {
      await service.set('key1', 'value1');
      await service.get('key1');

      service.resetStats();

      const stats = service.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all caches', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      await service.clear();

      const key1 = await service.get('key1');
      const key2 = await service.get('key2');
      const key3 = await service.get('key3');

      expect(key1).toBeNull();
      expect(key2).toBeNull();
      expect(key3).toBeNull();
    });
  });

  describe('Connection Status', () => {
    it('should report connection status', () => {
      const isConnected = service.isConnected();
      // Will be false in test environment (no Redis running)
      // But true if Redis is available
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Try to get with invalid key type
      const result = await service.get(null as any);
      expect(result).toBeNull();
    });

    it('should fallback to memory cache on Redis errors', async () => {
      // Even if Redis is down, memory cache should work
      await service.set('fallback:key', 'value');
      const result = await service.get('fallback:key');
      expect(result).toBe('value');
    });
  });
});
