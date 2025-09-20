import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * API Integration Tests
 *
 * This test suite validates critical API endpoints.
 * Tests run against the actual application but skip database tests
 * if MongoDB is not available.
 *
 * To run with database:
 * 1. Start MongoDB: npm run docker:dev
 * 2. Run tests: npm run test:integration
 */

describe('SimplePro API Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create the testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Set test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-2024';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-2024';

    await app.init();
    console.log('✅ Test application initialized');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check Endpoints', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('service', 'simplepro-api');
        });
    });

    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
        });
    });

    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('ready', true);
        });
    });
  });

  describe('Estimate Calculation', () => {
    const testEstimate = {
      customer: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '(555) 987-6543'
      },
      pickupLocation: {
        address: '123 Old Street, Springfield, IL 62701',
        accessDifficulty: 'easy',
        floorNumber: 1,
        elevatorAccess: true,
        parkingDistance: 50
      },
      deliveryLocation: {
        address: '456 New Avenue, Springfield, IL 62703',
        accessDifficulty: 'medium',
        floorNumber: 2,
        elevatorAccess: false,
        parkingDistance: 100
      },
      moveDetails: {
        serviceType: 'local',
        moveDate: '2025-02-15',
        estimatedWeight: 5000,
        estimatedVolume: 800,
        crewSize: 3,
        truckSize: 'medium',
        isWeekend: false
      },
      inventory: [
        { name: 'Sofa', category: 'Furniture', weight: 150, volume: 80, specialHandling: false },
        { name: 'Refrigerator', category: 'Appliances', weight: 300, volume: 60, specialHandling: true },
        { name: 'Bedroom Set', category: 'Furniture', weight: 400, volume: 200, specialHandling: false }
      ],
      additionalServices: ['packing', 'assembly']
    };

    it('should calculate estimate for local move', () => {
      return request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(testEstimate)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('estimate');
          expect(res.body.estimate).toHaveProperty('estimateId');
          expect(res.body.estimate).toHaveProperty('calculations');
          expect(res.body.estimate.calculations).toHaveProperty('finalPrice');
          expect(res.body.estimate.calculations.finalPrice).toBeGreaterThan(0);
          expect(res.body.estimate).toHaveProperty('metadata');
          expect(res.body.estimate.metadata).toHaveProperty('deterministic', true);
          expect(res.body.estimate.metadata).toHaveProperty('hash');
        });
    });

    it('should reject estimate with invalid data', () => {
      return request(app.getHttpServer())
        .post('/estimates/calculate')
        .send({ invalid: 'data' })
        .expect(400);
    });

    it('should produce same estimate for identical inputs', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(testEstimate)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(testEstimate)
        .expect(200);

      // Should have same final price and hash (deterministic)
      expect(response1.body.estimate.calculations.finalPrice)
        .toBe(response2.body.estimate.calculations.finalPrice);

      expect(response1.body.estimate.metadata.hash)
        .toBe(response2.body.estimate.metadata.hash);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/api/nonexistent')
        .expect(404);
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent estimate calculations', async () => {
      const testEstimate = {
        customer: {
          firstName: 'Load',
          lastName: 'Test',
          email: 'load.test@example.com',
          phone: '(555) 111-2222'
        },
        pickupLocation: {
          address: '100 Test Lane, Springfield, IL 62701',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 25
        },
        deliveryLocation: {
          address: '200 New Street, Springfield, IL 62703',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 25
        },
        moveDetails: {
          serviceType: 'local',
          moveDate: '2025-03-01',
          estimatedWeight: 3000,
          estimatedVolume: 500,
          crewSize: 2,
          truckSize: 'small',
          isWeekend: false
        },
        inventory: [
          { name: 'Small Couch', category: 'Furniture', weight: 100, volume: 50, specialHandling: false }
        ],
        additionalServices: []
      };

      const promises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(testEstimate)
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.estimate.calculations.finalPrice).toBeGreaterThan(0);
      });

      // All should produce identical results (deterministic)
      const firstPrice = responses[0].body.estimate.calculations.finalPrice;
      responses.forEach(response => {
        expect(response.body.estimate.calculations.finalPrice).toBe(firstPrice);
      });
    }, 15000); // 15 second timeout for load test
  });
});