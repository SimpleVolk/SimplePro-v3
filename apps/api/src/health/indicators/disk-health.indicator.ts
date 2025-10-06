import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  // Disk usage threshold (configurable via environment variable)
  private readonly DISK_THRESHOLD = parseFloat(process.env.DISK_THRESHOLD || '0.9'); // 90%

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const diskInfo = await this.getDiskInfo();
      
      if (!diskInfo) {
        // If we can't get disk info, consider it healthy (non-critical)
        return this.getStatus(key, true, {
          status: 'up',
          message: 'Disk information not available',
          available: true
        });
      }

      const isHealthy = diskInfo.percentage < this.DISK_THRESHOLD;

      if (!isHealthy) {
        throw new Error(
          `Disk usage exceeds threshold: ${(diskInfo.percentage * 100).toFixed(1)}% ` +
          `(${this.formatBytes(diskInfo.used)} / ${this.formatBytes(diskInfo.used + diskInfo.available)})`
        );
      }

      return this.getStatus(key, true, {
        status: 'up',
        ...diskInfo,
        threshold: this.DISK_THRESHOLD,
        formattedUsage: {
          used: this.formatBytes(diskInfo.used),
          available: this.formatBytes(diskInfo.available),
          total: this.formatBytes(diskInfo.used + diskInfo.available)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown disk check error';
      
      throw new HealthCheckError(
        `Disk health check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          status: 'down',
          error: errorMessage
        })
      );
    }
  }

  private async getDiskInfo(): Promise<{ used: number; available: number; percentage: number } | null> {
    try {
      // Get the current working directory as the path to check
      const checkPath = process.cwd();
      
      // Use fs.promises.stat to get file system statistics
      await fs.promises.stat(checkPath);
      
      // Try to use statvfs if available (Unix-like systems)
      if (this.isUnixLike()) {
        return this.getUnixDiskInfo(checkPath);
      } else {
        // For Windows or when statvfs is not available, use a fallback method
        return this.getWindowsDiskInfo(checkPath);
      }
    } catch (error) {
      console.warn('Could not retrieve disk information:', error);
      return null;
    }
  }

  private isUnixLike(): boolean {
    return process.platform !== 'win32';
  }

  private async getUnixDiskInfo(checkPath: string): Promise<{ used: number; available: number; percentage: number } | null> {
    try {
      // Use the 'df' command to get disk usage information
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      const output = execSync(`df -k "${checkPath}"`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      
      if (lines.length < 2) {
        return null;
      }

      // Parse the df output (skip header line)
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      if (parts.length < 4) {
        return null;
      }

      const totalKB = parseInt(parts[1], 10);
      const usedKB = parseInt(parts[2], 10);
      const availableKB = parseInt(parts[3], 10);

      // Convert KB to bytes
      const total = totalKB * 1024;
      const used = usedKB * 1024;
      const available = availableKB * 1024;
      const percentage = total > 0 ? used / total : 0;

      return { used, available, percentage };
    } catch (error) {
      console.warn('Unix disk info retrieval failed:', error);
      return null;
    }
  }

  private async getWindowsDiskInfo(checkPath: string): Promise<{ used: number; available: number; percentage: number } | null> {
    try {
      // For Windows, we'll use a simple estimation based on available space
      // This is less accurate but provides basic functionality
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      const drive = path.parse(checkPath).root;

      // Use PowerShell to get disk information
      const command = `powershell "Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3 AND DeviceID='${drive.replace('\\', '')}'"" | Select-Object Size,FreeSpace"`;
      const output = execSync(command, { encoding: 'utf8' });
      
      // Parse PowerShell output
      const lines = output.trim().split('\n');
      const dataLine = lines.find((line: string) => line.includes('Size') && line.includes('FreeSpace'));
      
      if (!dataLine) {
        return null;
      }

      // Extract numbers from the output
      const sizeMatch = dataLine.match(/Size\s*:\s*(\d+)/);
      const freeMatch = dataLine.match(/FreeSpace\s*:\s*(\d+)/);
      
      if (!sizeMatch || !freeMatch) {
        return null;
      }

      const total = parseInt(sizeMatch[1], 10);
      const available = parseInt(freeMatch[1], 10);
      const used = total - available;
      const percentage = total > 0 ? used / total : 0;

      return { used, available, percentage };
    } catch (error) {
      console.warn('Windows disk info retrieval failed:', error);
      return null;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
