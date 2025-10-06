import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisHealthInfo } from '../interfaces/health-check.interface';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redisClient: Redis | null = null;

  constructor() {
    super();
    this.initializeRedisClient();
  }

  private initializeRedisClient() {
    try {
      // Initialize Redis client with environment configuration
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true, // Don't connect immediately
        // Reduce connection noise for health checks
        enableReadyCheck: false,
      });

      // Handle connection events for monitoring
      this.redisClient.on('error', (error) => {
        console.warn('Redis health check connection error:', error.message);
      });
    } catch (error) {
      console.warn('Redis client initialization failed:', error);
      this.redisClient = null;
    }
  }

  async isHealthy(key: string, timeout = 5000): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      if (!this.redisClient) {
        throw new Error('Redis client not initialized');
      }

      // Perform a ping operation with timeout
      const pingResult = await Promise.race([
        this.redisClient.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), timeout),
        ),
      ]);

      if (pingResult !== 'PONG') {
        throw new Error(`Unexpected ping response: ${pingResult}`);
      }

      const responseTime = Date.now() - startTime;
      const healthInfo = await this.getRedisInfo(responseTime);

      return this.getStatus(key, true, healthInfo);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Redis error';

      throw new HealthCheckError(
        `Redis health check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          status: 'down' as const,
          responseTime,
          error: errorMessage,
        }),
      );
    }
  }

  private async getRedisInfo(responseTime: number): Promise<RedisHealthInfo> {
    try {
      if (!this.redisClient) {
        throw new Error('Redis client not available');
      }

      // Get Redis server information
      const info = await this.redisClient.info();
      const infoLines = info.split('\r\n');

      // Parse info into key-value pairs
      const infoObj: Record<string, string> = {};
      infoLines.forEach((line) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoObj[key] = value;
        }
      });

      // Get keyspace information
      let keyspaceInfo;
      try {
        const dbsize = await this.redisClient.dbsize();
        keyspaceInfo = {
          db0: {
            keys: dbsize,
            expires: 0, // Would need SCAN to get accurate expires count
          },
        };
      } catch {
        keyspaceInfo = undefined;
      }

      return {
        status: 'up',
        responseTime,
        info: {
          version: infoObj.redis_version || 'unknown',
          mode: infoObj.redis_mode || 'standalone',
          connectedClients: parseInt(infoObj.connected_clients || '0', 10),
          usedMemory: parseInt(infoObj.used_memory || '0', 10),
          keyspace: keyspaceInfo,
        },
      };
    } catch (error) {
      // Fallback to basic info if detailed info fails
      return {
        status: 'up',
        responseTime,
        info: {
          version: 'unknown',
          mode: 'unknown',
          connectedClients: 0,
          usedMemory: 0,
        },
      };
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error) {
        console.warn('Error closing Redis health check client:', error);
      }
    }
  }
}
