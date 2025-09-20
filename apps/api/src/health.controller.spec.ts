import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.check();

    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('service', 'simplepro-api');

    // Timestamp should be a recent ISO string
    const timestamp = new Date(result.timestamp);
    const now = new Date();
    expect(timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(timestamp.getTime()).toBeGreaterThan(now.getTime() - 1000);
  });

  it('should return liveness status', () => {
    const result = controller.liveness();

    expect(result).toHaveProperty('status', 'ok');
  });

  it('should return readiness status', () => {
    const result = controller.readiness();

    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('ready', true);
  });
});