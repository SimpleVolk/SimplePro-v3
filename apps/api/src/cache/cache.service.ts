import { Injectable, Logger } from '@nestjs/common';

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
  private readonly LONG_TTL = 86400; // 24 hours

  // In-memory cache implementation
  private memoryCache = new Map<string, { value: any; expires: number; tags?: string[] }>();

  constructor() {
    this.logger.log('Cache service initialized with in-memory storage');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
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
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      const expires = Date.now() + (ttl * 1000);

      this.memoryCache.set(key, {
        value,
        expires,
        tags: options.tags
      });

      this.stats.sets++;
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      this.stats.deletes++;
      this.logger.debug(`Cache delete: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const cached = this.memoryCache.get(key);
    return cached ? cached.expires > Date.now() : false;
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
      throw error;
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      let deleted = 0;
      for (const [key, cached] of this.memoryCache.entries()) {
        if (cached.tags && cached.tags.some(tag => tags.includes(tag))) {
          this.memoryCache.delete(key);
          deleted++;
        }
      }
      this.logger.debug(`Invalidated ${deleted} cache entries by tags: ${tags.join(', ')}`);
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
      throw error;
    }
  }

  // Analytics-specific cache methods
  async clearAnalyticsCaches(): Promise<void> {
    await this.invalidateByTags(['analytics', 'dashboard', 'reports']);
  }

  async getAnalyticsCache<T>(key: string): Promise<T | null> {
    return this.get<T>(`analytics:${key}`);
  }

  async setAnalyticsCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.set(`analytics:${key}`, value, { ttl: ttl || this.LONG_TTL, tags: ['analytics'] });
  }

  // Additional cache methods for performance monitor
  async clearUserCaches(): Promise<void> {
    await this.invalidateByTags(['users']);
  }

  async clearJobCaches(): Promise<void> {
    await this.invalidateByTags(['jobs']);
  }

  async clearCustomerCaches(): Promise<void> {
    await this.invalidateByTags(['customers']);
  }

  async clearAllCaches(): Promise<void> {
    await this.clear();
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

  // Cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Cleanup expired entries periodically
  private cleanupExpired(): void {
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

  // Initialize periodic cleanup
  onModuleInit(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }
}