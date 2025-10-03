import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to set cache TTL (Time To Live) in seconds
 * Used with CacheListInterceptor for automatic caching
 *
 * @param ttl - Time to live in seconds
 *
 * @example
 * ```typescript
 * @Get()
 * @CacheTTL(300) // Cache for 5 minutes
 * async findAll() {
 *   return this.customersService.findAll();
 * }
 * ```
 */
export const CacheTTL = (ttl: number) => SetMetadata('cache:ttl', ttl);
