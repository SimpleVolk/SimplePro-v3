import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseHealthInfo } from '../interfaces/health-check.interface';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  async isHealthy(key: string, timeout = 5000): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Check database connection state
      if (this.connection.readyState !== 1) {
        throw new Error(
          `Database connection state: ${this.getConnectionStateText(this.connection.readyState)}`,
        );
      }

      // Perform a simple ping operation with timeout
      await Promise.race([
        this.connection.db?.admin().ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database ping timeout')), timeout),
        ),
      ]);

      const responseTime = Date.now() - startTime;
      const healthInfo = await this.getDatabaseInfo(responseTime);

      return this.getStatus(key, true, healthInfo);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown database error';

      throw new HealthCheckError(
        `Database health check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          status: 'down' as const,
          responseTime,
          error: errorMessage,
          connectionState: this.getConnectionStateText(
            this.connection.readyState,
          ),
        }),
      );
    }
  }

  private async getDatabaseInfo(
    responseTime: number,
  ): Promise<DatabaseHealthInfo> {
    try {
      // Get server status for connection information
      const serverStatus = await this.connection.db?.admin().serverStatus();
      const connectionInfo = serverStatus?.connections || {};

      // Get replica set information if available
      let replicaSetInfo;
      try {
        const replSetStatus = await this.connection.db
          ?.admin()
          .replSetGetStatus();
        const primary = replSetStatus?.members?.find(
          (member: any) => member.stateStr === 'PRIMARY',
        );
        const secondaries =
          replSetStatus?.members?.filter(
            (member: any) => member.stateStr === 'SECONDARY',
          ).length || 0;

        replicaSetInfo = {
          primary: !!primary,
          secondaries,
        };
      } catch {
        // Not a replica set or no permissions
        replicaSetInfo = undefined;
      }

      return {
        status: 'up',
        responseTime,
        connections: {
          active: connectionInfo.current || 0,
          available: connectionInfo.available || 0,
          total: connectionInfo.totalCreated || 0,
        },
        replicaSet: replicaSetInfo,
      };
    } catch (error) {
      // Fallback to basic info if detailed info fails
      return {
        status: 'up',
        responseTime,
        connections: {
          active: 0,
          available: 0,
          total: 0,
        },
      };
    }
  }

  private getConnectionStateText(state: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized',
    };
    return states[state as keyof typeof states] || `unknown(${state})`;
  }
}
