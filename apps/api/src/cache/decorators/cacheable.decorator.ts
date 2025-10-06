import { CacheOptions } from '../cache.service';

export interface CacheableOptions extends CacheOptions {
  keyPrefix?: string;
  keyGenerator?: (...args: any[]) => string;
}

/**
 * Method decorator for automatic caching
 * Caches the result of the method and returns cached value on subsequent calls
 *
 * @param options - Cache configuration options
 *
 * @example
 * ```typescript
 * @Cacheable({ ttl: 300, keyPrefix: 'customer' })
 * async findOne(id: string) {
 *   return await this.customerModel.findById(id);
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Get CacheService instance from the class
      const cacheService = this.cacheService;

      if (!cacheService) {
        // If no cache service, just execute the original method
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : generateDefaultCacheKey(
            options.keyPrefix || target.constructor.name,
            propertyKey,
            args,
          );

      try {
        // Try to get from cache
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache
        if (result !== null && result !== undefined) {
          await cacheService.set(cacheKey, result, {
            ttl: options.ttl,
            tags: options.tags,
            compress: options.compress,
          });
        }

        return result;
      } catch (error) {
        // On cache error, execute original method
        console.error(`Cache error in ${propertyKey}:`, error);
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Generate a default cache key from method name and arguments
 */
function generateDefaultCacheKey(
  prefix: string,
  methodName: string,
  args: any[],
): string {
  const argsKey = args.length > 0 ? ':' + JSON.stringify(args) : '';
  return `${prefix}:${methodName}${argsKey}`;
}
