export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

export interface HealthIndicatorResult {
  [key: string]: {
    status: 'up' | 'down';
    message?: string;
    responseTime?: number;
    details?: Record<string, any>;
  };
}

export interface SystemResourcesInfo {
  memory: {
    used: number;
    total: number;
    percentage: number;
    heap: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  disk?: {
    used: number;
    available: number;
    percentage: number;
  };
  uptime: number;
  nodeVersion: string;
  processId: number;
}

export interface DatabaseHealthInfo {
  status: 'up' | 'down';
  responseTime: number;
  connections: {
    active: number;
    available: number;
    total: number;
  };
  replicaSet?: {
    primary: boolean;
    secondaries: number;
  };
}

export interface RedisHealthInfo {
  status: 'up' | 'down';
  responseTime: number;
  info: {
    version: string;
    mode: string;
    connectedClients: number;
    usedMemory: number;
    keyspace?: Record<string, any>;
  };
}

export interface ExternalServiceHealthInfo {
  status: 'up' | 'down';
  responseTime: number;
  endpoint: string;
  httpStatus?: number;
}

export enum HealthCheckLevel {
  BASIC = 'basic',
  DETAILED = 'detailed',
  FULL = 'full',
}
