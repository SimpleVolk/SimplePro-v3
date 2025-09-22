import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation
  compress?: boolean; // Gzip compression for large objects
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0
  };

  // Cache TTL constants (in seconds)
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly SHORT_TTL = 300; // 5 minutes
  private readonly LONG_TTL = 86400; // 24 hours

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.stats.hits++;
        this.updateHitRate();

        // Handle compressed data
        const parsed = JSON.parse(value);
        if (parsed._compressed) {
          const zlib = require('zlib');
          const decompressed = zlib.gunzipSync(Buffer.from(parsed.data, 'base64'));
          return JSON.parse(decompressed.toString());
        }

        return parsed;
      } else {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = this.DEFAULT_TTL, tags = [], compress = false } = options;
      let serialized = JSON.stringify(value);

      // Compress large objects
      if (compress || serialized.length > 10000) {
        const zlib = require('zlib');
        const compressed = zlib.gzipSync(serialized);
        serialized = JSON.stringify({
          _compressed: true,
          data: compressed.toString('base64')
        });
      }

      await this.redis.setex(key, ttl, serialized);

      // Store tags for cache invalidation
      if (tags.length > 0) {
        const tagPromises = tags.map(tag =>
          this.redis.sadd(`tag:${tag}`, key)
        );
        await Promise.all(tagPromises);
      }

      this.stats.sets++;
      this.logger.debug(`Cached key ${key} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.stats.deletes++;
      this.logger.debug(`Deleted cache key ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
        this.stats.deletes += keys.length;
        this.logger.debug(`Invalidated ${keys.length} keys for tag ${tag}`);
      }
    } catch (error) {
      this.logger.error(`Cache tag invalidation error for tag ${tag}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => {
        if (value) {
          this.stats.hits++;
          try {
            const parsed = JSON.parse(value);
            if (parsed._compressed) {
              const zlib = require('zlib');
              const decompressed = zlib.gunzipSync(Buffer.from(parsed.data, 'base64'));
              return JSON.parse(decompressed.toString());
            }
            return parsed;
          } catch (error) {
            this.logger.error('Error parsing cached value:', error);
            return null;
          }
        } else {
          this.stats.misses++;
          return null;
        }
      });
    } catch (error) {
      this.logger.error('Cache mget error:', error);
      this.stats.misses += keys.length;
      return keys.map(() => null);
    } finally {
      this.updateHitRate();
    }
  }

  async mset<T>(keyValuePairs: Record<string, T>, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const [key, value] of Object.entries(keyValuePairs)) {
        let serialized = JSON.stringify(value);

        // Compress large objects
        if (serialized.length > 10000) {
          const zlib = require('zlib');
          const compressed = zlib.gzipSync(serialized);
          serialized = JSON.stringify({
            _compressed: true,
            data: compressed.toString('base64')
          });
        }

        pipeline.setex(key, ttl, serialized);
      }

      await pipeline.exec();
      this.stats.sets += Object.keys(keyValuePairs).length;
    } catch (error) {
      this.logger.error('Cache mset error:', error);
    }
  }

  // Cache patterns for common use cases
  async getUserCache(userId: string): Promise<any> {
    return this.get(`user:${userId}`);
  }

  async setUserCache(userId: string, userData: any, ttl: number = this.LONG_TTL): Promise<void> {
    await this.set(`user:${userId}`, userData, {
      ttl,
      tags: ['users', `user:${userId}`]
    });
  }

  async getJobCache(jobId: string): Promise<any> {
    return this.get(`job:${jobId}`);
  }

  async setJobCache(jobId: string, jobData: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.set(`job:${jobId}`, jobData, {
      ttl,
      tags: ['jobs', `job:${jobId}`]
    });
  }

  async getCustomerCache(customerId: string): Promise<any> {
    return this.get(`customer:${customerId}`);
  }

  async setCustomerCache(customerId: string, customerData: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.set(`customer:${customerId}`, customerData, {
      ttl,
      tags: ['customers', `customer:${customerId}`]
    });
  }

  async getAnalyticsCache(key: string): Promise<any> {
    return this.get(`analytics:${key}`);
  }

  async setAnalyticsCache(key: string, data: any, ttl: number = this.SHORT_TTL): Promise<void> {
    await this.set(`analytics:${key}`, data, {
      ttl,
      tags: ['analytics'],
      compress: true // Analytics data is often large
    });
  }

  async getPricingRulesCache(): Promise<any> {
    return this.get('pricing:rules');
  }

  async setPricingRulesCache(rules: any, ttl: number = this.LONG_TTL): Promise<void> {
    await this.set('pricing:rules', rules, {
      ttl,
      tags: ['pricing']
    });
  }

  // Cache management methods
  async clearUserCaches(): Promise<void> {
    await this.invalidateByTag('users');
  }

  async clearJobCaches(): Promise<void> {
    await this.invalidateByTag('jobs');
  }

  async clearCustomerCaches(): Promise<void> {
    await this.invalidateByTag('customers');
  }

  async clearAnalyticsCaches(): Promise<void> {
    await this.invalidateByTag('analytics');
  }

  async clearAllCaches(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('All caches cleared');
    } catch (error) {
      this.logger.error('Error clearing all caches:', error);
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0
    };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Decorator method for caching function results
  cache(key: string, options: CacheOptions = {}) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = typeof key === 'function' ? key(...args) : key;

        // Try to get from cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // If not in cache, execute method and cache result
        const result = await method.apply(this, args);
        await this.cacheService.set(cacheKey, result, options);

        return result;
      };
    };
  }
}