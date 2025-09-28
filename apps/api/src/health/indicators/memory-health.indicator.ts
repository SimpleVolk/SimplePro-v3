import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { SystemResourcesInfo } from '../interfaces/health-check.interface';

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  // Memory usage thresholds (configurable via environment variables)
  private readonly MEMORY_THRESHOLD = parseFloat(process.env.MEMORY_THRESHOLD || '0.9'); // 90%
  private readonly HEAP_THRESHOLD = parseFloat(process.env.HEAP_THRESHOLD || '0.9'); // 90%

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const systemInfo = this.getSystemResourcesInfo();
      
      // Check if memory usage is within acceptable limits
      const memoryHealthy = systemInfo.memory.percentage < this.MEMORY_THRESHOLD;
      const heapHealthy = systemInfo.memory.heap.percentage < this.HEAP_THRESHOLD;
      const isHealthy = memoryHealthy && heapHealthy;

      if (!isHealthy) {
        const issues = [];
        if (!memoryHealthy) {
          issues.push(`System memory usage: ${(systemInfo.memory.percentage * 100).toFixed(1)}%`);
        }
        if (!heapHealthy) {
          issues.push(`Heap memory usage: ${(systemInfo.memory.heap.percentage * 100).toFixed(1)}%`);
        }
        
        throw new Error(`Memory usage exceeds threshold: ${issues.join(', ')}`);
      }

      return this.getStatus(key, true, {
        status: 'up',
        ...systemInfo,
        thresholds: {
          memory: this.MEMORY_THRESHOLD,
          heap: this.HEAP_THRESHOLD
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown memory check error';
      
      throw new HealthCheckError(
        `Memory health check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          status: 'down',
          error: errorMessage,
          systemInfo: this.getSystemResourcesInfo()
        })
      );
    }
  }

  private getSystemResourcesInfo(): SystemResourcesInfo {
    const memUsage = process.memoryUsage();
    const totalSystemMemory = this.getTotalSystemMemory();
    
    // Calculate memory percentages
    const systemMemoryUsage = {
      used: memUsage.rss,
      total: totalSystemMemory,
      percentage: totalSystemMemory > 0 ? memUsage.rss / totalSystemMemory : 0
    };

    const heapMemoryUsage = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: memUsage.heapTotal > 0 ? memUsage.heapUsed / memUsage.heapTotal : 0
    };

    return {
      memory: {
        ...systemMemoryUsage,
        heap: heapMemoryUsage
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      processId: process.pid
    };
  }

  private getTotalSystemMemory(): number {
    try {
      const os = require('os');
      return os.totalmem();
    } catch {
      // Fallback if os module is not available
      return 0;
    }
  }

}
