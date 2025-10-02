import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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
  errors: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: RedisClientType | null = null;
  private isRedisConnected = false;

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    errors: 0,
  };

  // Cache TTL constants (in seconds)
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly SHORT_TTL = 60; // 1 minute
  private readonly MEDIUM_TTL = 300; // 5 minutes
  private readonly LONG_TTL = 3600; // 1 hour
  private readonly EXTRA_LONG_TTL = 86400; // 24 hours

  // Fallback in-memory cache
  private memoryCache = new Map<string, { value: any; expires: number; tags?: string[] }>();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connectRedis();
    // Clean up expired entries every 5 minutes for in-memory fallback
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  async onModuleDestroy() {
    await this.disconnectRedis();
  }

  private async connectRedis(): Promise<void> {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

      this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}...`);

      this.redisClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Redis reconnection limit reached. Falling back to memory cache.');
              return new Error('Redis reconnection limit reached');
            }
            const delay = Math.min(retries * 100, 3000);
            this.logger.warn(`Redis reconnecting... Attempt ${retries}, delay ${delay}ms`);
            return delay;
          },
        },
        password: redisPassword,
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
        this.isRedisConnected = false;
        this.stats.errors++;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis client connecting...');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client ready');
        this.isRedisConnected = true;
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.warn('Redis client reconnecting...');
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
      this.isRedisConnected = true;
      this.logger.log('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis. Falling back to in-memory cache:', error);
      this.isRedisConnected = false;
      this.redisClient = null;
    }
  }

  private async disconnectRedis(): Promise<void> {
    if (this.redisClient && this.isRedisConnected) {
      try {
        await this.redisClient.quit();
        this.logger.log('Redis connection closed');
      } catch (error) {
        this.logger.error('Error closing Redis connection:', error);
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.isRedisConnected && this.redisClient) {
        const value = await this.redisClient.get(key) as string | null;

        if (value !== null) {
          this.stats.hits++;
          this.updateHitRate();

          // Handle compressed data
          if (value.startsWith('__COMPRESSED__:')) {
            const compressed = Buffer.from(value.substring(15), 'base64');
            const decompressed = await gunzip(compressed);
            return JSON.parse(decompressed.toString());
          }

          return JSON.parse(value) as T;
        }
      } else {
        // Fallback to memory cache
        return this.getFromMemory<T>(key);
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      // Try memory cache as fallback
      return this.getFromMemory<T>(key);
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      let serialized = JSON.stringify(value);

      // Compress large objects (> 1KB)
      if (options.compress || serialized.length > 1024) {
        const compressed = await gzip(Buffer.from(serialized));
        serialized = '__COMPRESSED__:' + compressed.toString('base64');
      }

      // Try Redis first
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.setEx(key, ttl, serialized);

        // Store tags for invalidation
        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            await this.redisClient.sAdd(`tag:${tag}`, key);
            await this.redisClient.expire(`tag:${tag}`, ttl);
          }
        }

        this.stats.sets++;
        this.logger.debug(`Cache set (Redis): ${key} (TTL: ${ttl}s, Size: ${serialized.length})`);
      } else {
        // Fallback to memory cache
        this.setInMemory(key, value, options);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      // Fallback to memory cache
      this.setInMemory(key, value, options);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
        this.stats.deletes++;
        this.logger.debug(`Cache delete (Redis): ${key}`);
      } else {
        this.memoryCache.delete(key);
        this.stats.deletes++;
        this.logger.debug(`Cache delete (Memory): ${key}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      this.memoryCache.delete(key);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
          return keys.length;
        }
        return 0;
      } else {
        // Memory cache pattern deletion
        let deleted = 0;
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            deleted++;
          }
        }
        this.logger.debug(`Deleted ${deleted} keys from memory matching pattern: ${pattern}`);
        return deleted;
      }
    } catch (error) {
      this.logger.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const exists = await this.redisClient.exists(key);
        return exists === 1;
      } else {
        const cached = this.memoryCache.get(key);
        return cached ? cached.expires > Date.now() : false;
      }
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushDb();
        this.logger.log('Cache cleared (Redis)');
      } else {
        this.memoryCache.clear();
        this.logger.log('Cache cleared (Memory)');
      }
    } catch (error) {
      this.logger.error('Cache clear error:', error);
      this.stats.errors++;
      this.memoryCache.clear();
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        for (const tag of tags) {
          const keys = await this.redisClient.sMembers(`tag:${tag}`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
            await this.redisClient.del(`tag:${tag}`);
            this.logger.debug(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
          }
        }
      } else {
        // Memory cache tag invalidation
        let deleted = 0;
        for (const [key, cached] of this.memoryCache.entries()) {
          if (cached.tags && cached.tags.some(tag => tags.includes(tag))) {
            this.memoryCache.delete(key);
            deleted++;
          }
        }
        this.logger.debug(`Invalidated ${deleted} cache entries by tags: ${tags.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
      this.stats.errors++;
    }
  }

  // ========== Domain-specific cache methods ==========

  /**
   * Analytics cache methods
   */
  async clearAnalyticsCaches(): Promise<void> {
    await this.invalidateByTags(['analytics', 'dashboard', 'reports']);
  }

  async getAnalyticsCache<T>(key: string): Promise<T | null> {
    return this.get<T>(`analytics:${key}`);
  }

  async setAnalyticsCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.set(`analytics:${key}`, value, {
      ttl: ttl || this.MEDIUM_TTL,
      tags: ['analytics'],
      compress: true,
    });
  }

  /**
   * Customer cache methods
   */
  async clearCustomerCaches(): Promise<void> {
    await this.invalidateByTags(['customers']);
    await this.deletePattern('customer:*');
    await this.deletePattern('customers:list:*');
  }

  async getCustomerCache<T>(customerId: string): Promise<T | null> {
    return this.get<T>(`customer:${customerId}`);
  }

  async setCustomerCache<T>(customerId: string, value: T): Promise<void> {
    return this.set(`customer:${customerId}`, value, {
      ttl: this.LONG_TTL,
      tags: ['customers']
    });
  }

  /**
   * Job cache methods
   */
  async clearJobCaches(): Promise<void> {
    await this.invalidateByTags(['jobs']);
    await this.deletePattern('job:*');
    await this.deletePattern('jobs:list:*');
    await this.deletePattern('jobs:calendar:*');
  }

  async getJobCache<T>(jobId: string): Promise<T | null> {
    return this.get<T>(`job:${jobId}`);
  }

  async setJobCache<T>(jobId: string, value: T): Promise<void> {
    return this.set(`job:${jobId}`, value, {
      ttl: this.MEDIUM_TTL,
      tags: ['jobs']
    });
  }

  /**
   * User cache methods
   */
  async clearUserCaches(): Promise<void> {
    await this.invalidateByTags(['users']);
    await this.deletePattern('user:*');
  }

  /**
   * Clear all domain caches
   */
  async clearAllCaches(): Promise<void> {
    await this.clear();
  }

  // ========== Statistics and monitoring ==========

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      errors: 0,
    };
  }

  isConnected(): boolean {
    return this.isRedisConnected;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // ========== Memory cache fallback methods ==========

  private getFromMemory<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);

    if (cached && cached.expires > Date.now()) {
      this.stats.hits++;
      this.updateHitRate();
      return cached.value as T;
    } else if (cached) {
      this.memoryCache.delete(key);
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  private setInMemory<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const expires = Date.now() + (ttl * 1000);

    this.memoryCache.set(key, {
      value,
      expires,
      tags: options.tags
    });

    this.stats.sets++;
    this.logger.debug(`Cache set (Memory): ${key} (TTL: ${ttl}s)`);
  }

  private cleanupExpired(): void {
    if (this.isRedisConnected) {
      return; // Redis handles expiration automatically
    }

    let cleaned = 0;
    const now = Date.now();

    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expires <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}
