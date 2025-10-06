/**
 * Mock Cache Service for Testing
 *
 * This mock provides an in-memory implementation of CacheService
 * without requiring Redis connection, making tests faster and more reliable.
 */

export const mockCacheService = {
  cache: new Map<string, any>(),

  async get(key: string): Promise<any> {
    return this.cache.get(key) || null;
  },

  async set(key: string, value: any, _options?: any): Promise<void> {
    this.cache.set(key, value);
  },

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  },

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  },

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  },

  async invalidateByTags(_tags: string[]): Promise<void> {
    // In-memory implementation doesn't track tags, so just clear all
    // In real tests, you might want to implement tag tracking
  },

  async clear(): Promise<void> {
    this.cache.clear();
  },

  async onModuleInit(): Promise<void> {
    // No-op for mock
  },

  async onModuleDestroy(): Promise<void> {
    this.cache.clear();
  },

  isConnected(): boolean {
    return true;
  },

  getStats() {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      errors: 0,
    };
  },

  resetStats(): void {
    // No-op for mock
  },

  // Domain-specific methods
  async getCustomerCache(customerId: string): Promise<any> {
    return this.get(`customer:${customerId}`);
  },

  async setCustomerCache(customerId: string, data: any, _options?: any): Promise<void> {
    return this.set(`customer:${customerId}`, data, _options);
  },

  async getJobCache(jobId: string): Promise<any> {
    return this.get(`job:${jobId}`);
  },

  async setJobCache(jobId: string, data: any, _options?: any): Promise<void> {
    return this.set(`job:${jobId}`, data, _options);
  },

  async getAnalyticsCache(key: string): Promise<any> {
    return this.get(`analytics:${key}`);
  },

  async setAnalyticsCache(key: string, data: any, _options?: any): Promise<void> {
    return this.set(`analytics:${key}`, data, _options);
  },

  async clearCustomerCaches(): Promise<void> {
    return this.deletePattern('customer:*');
  },

  async clearJobCaches(): Promise<void> {
    return this.deletePattern('job:*');
  },

  async clearAnalyticsCaches(): Promise<void> {
    return this.deletePattern('analytics:*');
  },
};

/**
 * Factory function to create a fresh mock instance
 */
export function createMockCacheService() {
  return {
    cache: new Map<string, any>(),

    async get(key: string): Promise<any> {
      return this.cache.get(key) || null;
    },

    async set(key: string, value: any, _options?: any): Promise<void> {
      this.cache.set(key, value);
    },

    async del(key: string): Promise<void> {
      this.cache.delete(key);
    },

    async exists(key: string): Promise<boolean> {
      return this.cache.has(key);
    },

    async deletePattern(pattern: string): Promise<number> {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let deleted = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deleted++;
        }
      }

      return deleted;
    },

    async invalidateByTags(_tags: string[]): Promise<void> {
      // No-op for simplified mock
    },

    async clear(): Promise<void> {
      this.cache.clear();
    },

    async onModuleInit(): Promise<void> {
      // No-op
    },

    async onModuleDestroy(): Promise<void> {
      this.cache.clear();
    },

    isConnected(): boolean {
      return true;
    },

    getStats() {
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        errors: 0,
      };
    },

    resetStats(): void {
      // No-op
    },

    async getCustomerCache(customerId: string): Promise<any> {
      return this.get(`customer:${customerId}`);
    },

    async setCustomerCache(customerId: string, data: any, _options?: any): Promise<void> {
      return this.set(`customer:${customerId}`, data, _options);
    },

    async getJobCache(jobId: string): Promise<any> {
      return this.get(`job:${jobId}`);
    },

    async setJobCache(jobId: string, data: any, _options?: any): Promise<void> {
      return this.set(`job:${jobId}`, data, _options);
    },

    async getAnalyticsCache(key: string): Promise<any> {
      return this.get(`analytics:${key}`);
    },

    async setAnalyticsCache(key: string, data: any, _options?: any): Promise<void> {
      return this.set(`analytics:${key}`, data, _options);
    },

    async clearCustomerCaches(): Promise<void> {
      await this.deletePattern('customer:*');
    },

    async clearJobCaches(): Promise<void> {
      await this.deletePattern('job:*');
    },

    async clearAnalyticsCaches(): Promise<void> {
      await this.deletePattern('analytics:*');
    },
  };
}
