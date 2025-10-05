/**
 * Options for CacheEvict decorator
 */
export interface CacheEvictOptions {
  /**
   * Specific cache keys to evict
   */
  keys?: string[];

  /**
   * Cache key patterns to evict (supports wildcards)
   */
  patterns?: string[];

  /**
   * Cache tags to evict
   */
  tags?: string[];

  /**
   * If true, evicts all caches
   */
  allEntries?: boolean;

  /**
   * If true, eviction happens before method execution
   * If false (default), eviction happens after successful execution
   */
  beforeInvocation?: boolean;
}

/**
 * Method decorator for cache invalidation
 * Removes cached entries after method execution
 *
 * @param options - Cache eviction options
 *
 * @example
 * ```typescript
 * @CacheEvict({ patterns: ['customer:*'], tags: ['customers'] })
 * async update(id: string, updateDto: UpdateCustomerDto) {
 *   return await this.customerModel.findByIdAndUpdate(id, updateDto);
 * }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions = {}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const cacheService = this.cacheService;

      if (!cacheService) {
        // If no cache service, just execute the original method
        return originalMethod.apply(this, args);
      }

      const evictCache = async () => {
        try {
          if (options.allEntries) {
            await cacheService.clear();
            return;
          }

          // Evict specific keys
          if (options.keys && options.keys.length > 0) {
            for (const key of options.keys) {
              await cacheService.del(key);
            }
          }

          // Evict key patterns
          if (options.patterns && options.patterns.length > 0) {
            for (const pattern of options.patterns) {
              await cacheService.deletePattern(pattern);
            }
          }

          // Evict by tags
          if (options.tags && options.tags.length > 0) {
            await cacheService.invalidateByTags(options.tags);
          }
        } catch (error) {
          console.error(`Cache eviction error in ${propertyKey}:`, error);
        }
      };

      // Evict before invocation if specified
      if (options.beforeInvocation) {
        await evictCache();
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Evict after successful invocation (default behavior)
      if (!options.beforeInvocation) {
        await evictCache();
      }

      return result;
    };

    return descriptor;
  };
}
