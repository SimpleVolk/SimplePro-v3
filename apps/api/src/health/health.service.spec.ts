import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { DiskHealthIndicator } from './indicators/disk-health.indicator';
import { ExternalServiceHealthIndicator } from './indicators/external-service-health.indicator';
import { HealthCheckLevel } from './interfaces/health-check.interface';

describe('HealthService', () => {
  let service: HealthService;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let databaseHealthIndicator: jest.Mocked<DatabaseHealthIndicator>;
  let redisHealthIndicator: jest.Mocked<RedisHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;
  let diskHealthIndicator: jest.Mocked<DiskHealthIndicator>;
  let externalServiceHealthIndicator: jest.Mocked<ExternalServiceHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockDatabaseHealthIndicator = {
      isHealthy: jest.fn(),
    };

    const mockRedisHealthIndicator = {
      isHealthy: jest.fn(),
    };

    const mockMemoryHealthIndicator = {
      isHealthy: jest.fn(),
    };

    const mockDiskHealthIndicator = {
      isHealthy: jest.fn(),
    };

    const mockExternalServiceHealthIndicator = {
      isHealthy: jest.fn(),
      getConfiguredServices: jest.fn().mockReturnValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: DatabaseHealthIndicator,
          useValue: mockDatabaseHealthIndicator,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: ExternalServiceHealthIndicator,
          useValue: mockExternalServiceHealthIndicator,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    healthCheckService = module.get(HealthCheckService);
    databaseHealthIndicator = module.get(DatabaseHealthIndicator);
    redisHealthIndicator = module.get(RedisHealthIndicator);
    memoryHealthIndicator = module.get(MemoryHealthIndicator);
    diskHealthIndicator = module.get(DiskHealthIndicator);
    externalServiceHealthIndicator = module.get(ExternalServiceHealthIndicator);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('basicHealthCheck', () => {
    it('should perform basic health check successfully', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {
          database: {
            status: 'up',
            responseTime: 100,
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await service.basicHealthCheck();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('simplepro-api');
      expect(result.details?.level).toBe(HealthCheckLevel.BASIC);
      expect(healthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function),
        ])
      );
    });

    it('should handle basic health check failure', async () => {
      const mockError = new Error('Database connection failed');
      healthCheckService.check.mockRejectedValue(mockError);

      const result = await service.basicHealthCheck();

      expect(result.status).toBe('error');
      expect(result.details?.level).toBe(HealthCheckLevel.BASIC);
    });
  });

  describe('detailedHealthCheck', () => {
    it('should perform detailed health check successfully', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {
          database: { status: 'up', responseTime: 100 },
          redis: { status: 'up', responseTime: 50 },
          memory: { status: 'up' },
          disk: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await service.detailedHealthCheck();

      expect(result.status).toBe('ok');
      expect(result.details?.level).toBe(HealthCheckLevel.DETAILED);
      expect(healthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function), // database
          expect.any(Function), // redis
          expect.any(Function), // memory
          expect.any(Function), // disk
        ])
      );
    });
  });

  describe('fullHealthCheck', () => {
    it('should perform full health check with external services', async () => {
      const mockExternalServices = [
        { key: 'external-api', url: 'https://api.example.com/health', timeout: 5000 },
        { key: 'stripe-api', url: 'https://status.stripe.com/api/v2/status.json', timeout: 5000 },
      ];

      externalServiceHealthIndicator.getConfiguredServices.mockReturnValue(mockExternalServices);

      const mockResult = {
        status: 'ok' as const,
        info: {
          database: { status: 'up', responseTime: 100 },
          redis: { status: 'up', responseTime: 50 },
          memory: { status: 'up' },
          disk: { status: 'up' },
          'external-api': { status: 'up', responseTime: 200 },
          'stripe-api': { status: 'up', responseTime: 150 },
        },
      };

      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await service.fullHealthCheck();

      expect(result.status).toBe('ok');
      expect(result.details?.level).toBe(HealthCheckLevel.FULL);
      expect(externalServiceHealthIndicator.getConfiguredServices).toHaveBeenCalled();
    });

    it('should perform full health check without external services', async () => {
      externalServiceHealthIndicator.getConfiguredServices.mockReturnValue([]);

      const mockResult = {
        status: 'ok' as const,
        info: {
          database: { status: 'up', responseTime: 100 },
          redis: { status: 'up', responseTime: 50 },
          memory: { status: 'up' },
          disk: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await service.fullHealthCheck();

      expect(result.status).toBe('ok');
      expect(result.details?.level).toBe(HealthCheckLevel.FULL);
    });
  });

  describe('livenessCheck', () => {
    it('should return liveness information', async () => {
      const result = await service.livenessCheck();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('simplepro-api');
      expect(result.info?.liveness).toBeDefined();
      expect(result.info.liveness.status).toBe('up');
      expect(result.info.liveness.uptime).toBeGreaterThan(0);
      expect(result.info.liveness.pid).toBe(process.pid);
    });
  });

  describe('readinessCheck', () => {
    it('should return ready when database is healthy', async () => {
      const mockResult = {
        status: 'ok' as const,
        info: {
          database: {
            status: 'up',
            responseTime: 100,
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockResult);

      const result = await service.readinessCheck();

      expect(result.status).toBe('ok');
      expect(result.details?.readiness?.ready).toBe(true);
    });

    it('should return not ready when database is unhealthy', async () => {
      const mockError = new Error('Database not available');
      healthCheckService.check.mockRejectedValue(mockError);

      const result = await service.readinessCheck();

      expect(result.status).toBe('error');
      expect(result.details?.readiness?.ready).toBe(false);
      expect(result.details?.readiness?.error).toBe('Database not available');
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      const result = await service.getSystemInfo();

      expect(result.service).toBe('simplepro-api');
      expect(result.node).toBeDefined();
      expect(result.node.version).toBe(process.version);
      expect(result.node.platform).toBe(process.platform);
      expect(result.node.pid).toBe(process.pid);
      expect(result.memory).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});
