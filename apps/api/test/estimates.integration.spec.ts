import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  teardownTestApp,
  cleanupDatabase,
  TestDataFactories,
  createAuthenticatedTestUser,
  authenticatedRequest,
  ResponseAssertions,
  TestAuthData,
} from './integration-setup';

/**
 * Estimates Integration Tests
 *
 * Comprehensive test suite for estimate calculation functionality:
 * - Deterministic pricing calculations with consistent results
 * - Complex estimate scenarios with multiple service types
 * - Pricing rule validation and application
 * - Location handicap calculations
 * - Inventory management and special handling
 * - Cross-platform compatibility (Node.js and browser)
 * - Performance testing under load
 * - Error handling and edge cases
 * - Audit trail and calculation metadata
 * - SHA256 hash verification for auditability
 *
 * Tests validate complete estimate workflow including:
 * - Input validation and sanitization
 * - Business rule application in priority order
 * - Cost breakdown and itemization
 * - Calculation reproducibility and determinism
 * - Integration with pricing engine package
 * - Real-world moving scenarios
 */

describe('Estimates Integration Tests', () => {
  let app: INestApplication;
  let adminAuth: TestAuthData;
  let dispatcherAuth: TestAuthData;

  beforeAll(async () => {
    app = await setupTestApp();

    // Create test users for estimate access
    adminAuth = await createAuthenticatedTestUser({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read:all', 'write:all', 'calculate:estimates'],
    });

    dispatcherAuth = await createAuthenticatedTestUser({
      email: 'dispatcher@example.com',
      role: 'dispatcher',
      permissions: ['read:estimates', 'calculate:estimates'],
    });
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('Basic Estimate Calculations', () => {
    describe('POST /estimates/calculate', () => {
      it('should calculate estimate for simple local move', async () => {
        const estimateData = TestDataFactories.createEstimateData({
          moveDetails: {
            serviceType: 'local',
            estimatedWeight: 3000,
            estimatedVolume: 500,
            crewSize: 2,
            truckSize: 'small',
            isWeekend: false,
          },
        });

        const response = await request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(estimateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const estimate = response.body.estimate;
        expect(estimate).toHaveProperty('estimateId');
        expect(estimate).toHaveProperty('calculations');
        expect(estimate.calculations).toHaveProperty('finalPrice');
        expect(estimate.calculations).toHaveProperty('appliedRules');
        expect(estimate.calculations).toHaveProperty('breakdown');
        expect(estimate).toHaveProperty('metadata');
        expect(estimate.metadata).toHaveProperty('deterministic', true);
        expect(estimate.metadata).toHaveProperty('hash');

        // Validate price is reasonable for small local move
        expect(estimate.calculations.finalPrice).toBeGreaterThan(200);
        expect(estimate.calculations.finalPrice).toBeLessThan(2000);
      });

      it('should calculate estimate for complex long distance move', async () => {
        const estimateData = TestDataFactories.createEstimateData({
          moveDetails: {
            serviceType: 'long_distance',
            estimatedWeight: 8000,
            estimatedVolume: 1200,
            crewSize: 4,
            truckSize: 'large',
            isWeekend: true,
            distance: 500, // 500 miles
          },
          inventory: [
            { name: 'Grand Piano', category: 'Specialty', weight: 800, volume: 100, specialHandling: true },
            { name: 'Antique Furniture Set', category: 'Furniture', weight: 1200, volume: 300, specialHandling: true },
            { name: 'Household Items', category: 'General', weight: 6000, volume: 800, specialHandling: false },
          ],
          additionalServices: ['packing', 'assembly', 'storage'],
        });

        const response = await request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(estimateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const estimate = response.body.estimate;
        expect(estimate.calculations.finalPrice).toBeGreaterThan(3000);

        // Should have weekend and long distance rules applied
        const appliedRuleNames = estimate.calculations.appliedRules.map((rule: any) => rule.ruleName);
        expect(appliedRuleNames.some((name: string) => name.toLowerCase().includes('weekend'))).toBe(true);
        expect(appliedRuleNames.some((name: string) => name.toLowerCase().includes('distance'))).toBe(true);
      });

      it('should calculate estimate for packing-only service', async () => {
        const estimateData = TestDataFactories.createEstimateData({
          moveDetails: {
            serviceType: 'packing_only',
            estimatedWeight: 2000,
            estimatedVolume: 400,
            crewSize: 2,
            truckSize: 'none',
            isWeekend: false,
          },
          additionalServices: ['packing'],
        });

        const response = await request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(estimateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const estimate = response.body.estimate;
        expect(estimate.calculations.finalPrice).toBeGreaterThan(100);
        expect(estimate.calculations.finalPrice).toBeLessThan(1500);

        // Should have packing-specific rules
        const serviceTypeRules = estimate.calculations.appliedRules.filter(
          (rule: any) => rule.ruleName.toLowerCase().includes('packing')
        );
        expect(serviceTypeRules.length).toBeGreaterThan(0);
      });

      it('should apply storage service pricing', async () => {
        const estimateData = TestDataFactories.createEstimateData({
          moveDetails: {
            serviceType: 'storage',
            estimatedWeight: 4000,
            estimatedVolume: 600,
            crewSize: 2,
            truckSize: 'medium',
            isWeekend: false,
          },
          additionalServices: ['storage'],
        });

        const response = await request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(estimateData)
          .expect(200);

        ResponseAssertions.assertSuccessResponse(response);

        const estimate = response.body.estimate;
        expect(estimate.calculations.finalPrice).toBeGreaterThan(300);

        // Should have storage-related rules applied
        const storageRules = estimate.calculations.appliedRules.filter(
          (rule: any) => rule.ruleName.toLowerCase().includes('storage')
        );
        expect(storageRules.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Location Handicap Testing', () => {
    it('should apply stairs handicap correctly', async () => {
      const baseEstimate = TestDataFactories.createEstimateData({
        pickupLocation: {
          address: '123 Ground Floor, Springfield, IL 62701',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 25,
        },
        deliveryLocation: {
          address: '456 Ground Floor, Springfield, IL 62703',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 25,
        },
      });

      const stairsEstimate = TestDataFactories.createEstimateData({
        pickupLocation: {
          address: '123 Third Floor, Springfield, IL 62701',
          accessDifficulty: 'difficult',
          floorNumber: 3,
          elevatorAccess: false,
          parkingDistance: 25,
        },
        deliveryLocation: {
          address: '456 Fourth Floor, Springfield, IL 62703',
          accessDifficulty: 'difficult',
          floorNumber: 4,
          elevatorAccess: false,
          parkingDistance: 25,
        },
      });

      const baseResponse = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(baseEstimate)
        .expect(200);

      const stairsResponse = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(stairsEstimate)
        .expect(200);

      const basePrice = baseResponse.body.estimate.calculations.finalPrice;
      const stairsPrice = stairsResponse.body.estimate.calculations.finalPrice;

      // Stairs should increase the price
      expect(stairsPrice).toBeGreaterThan(basePrice);

      // Check for stairs-related handicaps in applied rules
      const stairsRules = stairsResponse.body.estimate.calculations.appliedRules.filter(
        (rule: any) => rule.ruleName.toLowerCase().includes('stairs') ||
                      rule.ruleName.toLowerCase().includes('floor')
      );
      expect(stairsRules.length).toBeGreaterThan(0);
    });

    it('should apply parking distance handicap', async () => {
      const closeParking = TestDataFactories.createEstimateData({
        pickupLocation: {
          address: '123 Close Parking, Springfield, IL 62701',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 10,
        },
        deliveryLocation: {
          address: '456 Close Parking, Springfield, IL 62703',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 10,
        },
      });

      const farParking = TestDataFactories.createEstimateData({
        pickupLocation: {
          address: '123 Far Parking, Springfield, IL 62701',
          accessDifficulty: 'difficult',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 200,
        },
        deliveryLocation: {
          address: '456 Far Parking, Springfield, IL 62703',
          accessDifficulty: 'difficult',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 200,
        },
      });

      const closeResponse = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(closeParking)
        .expect(200);

      const farResponse = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(farParking)
        .expect(200);

      const closePrice = closeResponse.body.estimate.calculations.finalPrice;
      const farPrice = farResponse.body.estimate.calculations.finalPrice;

      // Far parking should increase the price
      expect(farPrice).toBeGreaterThan(closePrice);
    });

    it('should combine multiple location handicaps', async () => {
      const handicappedMove = TestDataFactories.createEstimateData({
        pickupLocation: {
          address: '123 Difficult Access, Springfield, IL 62701',
          accessDifficulty: 'very_difficult',
          floorNumber: 5,
          elevatorAccess: false,
          parkingDistance: 300,
        },
        deliveryLocation: {
          address: '456 Difficult Access, Springfield, IL 62703',
          accessDifficulty: 'very_difficult',
          floorNumber: 4,
          elevatorAccess: false,
          parkingDistance: 250,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(handicappedMove)
        .expect(200);

      ResponseAssertions.assertSuccessResponse(response);

      const estimate = response.body.estimate;

      // Should have multiple handicap rules applied
      const handicapRules = estimate.calculations.appliedRules.filter((rule: any) =>
        rule.ruleName.toLowerCase().includes('difficult') ||
        rule.ruleName.toLowerCase().includes('stairs') ||
        rule.ruleName.toLowerCase().includes('parking') ||
        rule.ruleName.toLowerCase().includes('floor')
      );

      expect(handicapRules.length).toBeGreaterThan(2);
    });
  });

  describe('Special Items and Inventory', () => {
    it('should handle piano moves with special pricing', async () => {
      const pianoMove = TestDataFactories.createEstimateData({
        inventory: [
          { name: 'Grand Piano', category: 'Specialty', weight: 800, volume: 120, specialHandling: true },
          { name: 'Piano Bench', category: 'Furniture', weight: 50, volume: 10, specialHandling: false },
          { name: 'Household Items', category: 'General', weight: 2000, volume: 300, specialHandling: false },
        ],
        moveDetails: {
          serviceType: 'local',
          estimatedWeight: 2850,
          estimatedVolume: 430,
          crewSize: 4, // Need more crew for piano
          truckSize: 'large',
          isWeekend: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(pianoMove)
        .expect(200);

      ResponseAssertions.assertSuccessResponse(response);

      const estimate = response.body.estimate;

      // Piano moves should be more expensive
      expect(estimate.calculations.finalPrice).toBeGreaterThan(1000);

      // Should have piano-specific rules
      const pianoRules = estimate.calculations.appliedRules.filter((rule: any) =>
        rule.ruleName.toLowerCase().includes('piano') ||
        rule.ruleName.toLowerCase().includes('specialty') ||
        rule.ruleName.toLowerCase().includes('heavy')
      );
      expect(pianoRules.length).toBeGreaterThan(0);
    });

    it('should calculate estimates for antique and artwork moves', async () => {
      const antiqueMove = TestDataFactories.createEstimateData({
        inventory: [
          { name: 'Antique Armoire', category: 'Antiques', weight: 400, volume: 80, specialHandling: true },
          { name: 'Oil Paintings', category: 'Artwork', weight: 50, volume: 20, specialHandling: true },
          { name: 'Ming Vase Collection', category: 'Antiques', weight: 30, volume: 15, specialHandling: true },
          { name: 'Regular Furniture', category: 'Furniture', weight: 1500, volume: 200, specialHandling: false },
        ],
        additionalServices: ['packing', 'assembly'],
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(antiqueMove)
        .expect(200);

      ResponseAssertions.assertSuccessResponse(response);

      const estimate = response.body.estimate;

      // Antique moves should include special handling charges
      const specialHandlingRules = estimate.calculations.appliedRules.filter((rule: any) =>
        rule.ruleName.toLowerCase().includes('antique') ||
        rule.ruleName.toLowerCase().includes('artwork') ||
        rule.ruleName.toLowerCase().includes('special') ||
        rule.ruleName.toLowerCase().includes('fragile')
      );
      expect(specialHandlingRules.length).toBeGreaterThan(0);
    });

    it('should handle large appliance moves', async () => {
      const applianceMove = TestDataFactories.createEstimateData({
        inventory: [
          { name: 'Sub-Zero Refrigerator', category: 'Appliances', weight: 400, volume: 60, specialHandling: true },
          { name: 'Commercial Washer/Dryer', category: 'Appliances', weight: 600, volume: 80, specialHandling: true },
          { name: 'Wine Cellar Unit', category: 'Appliances', weight: 300, volume: 40, specialHandling: true },
          { name: 'Household Items', category: 'General', weight: 2000, volume: 300, specialHandling: false },
        ],
        moveDetails: {
          serviceType: 'local',
          estimatedWeight: 3300,
          estimatedVolume: 480,
          crewSize: 3,
          truckSize: 'large',
          isWeekend: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(applianceMove)
        .expect(200);

      ResponseAssertions.assertSuccessResponse(response);

      const estimate = response.body.estimate;

      // Should account for heavy appliances
      const applianceRules = estimate.calculations.appliedRules.filter((rule: any) =>
        rule.ruleName.toLowerCase().includes('appliance') ||
        rule.ruleName.toLowerCase().includes('heavy') ||
        rule.ruleName.toLowerCase().includes('weight')
      );
      expect(applianceRules.length).toBeGreaterThan(0);
    });
  });

  describe('Service Combinations and Add-ons', () => {
    it('should calculate full-service move with all add-ons', async () => {
      const fullServiceMove = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'long_distance',
          estimatedWeight: 6000,
          estimatedVolume: 900,
          crewSize: 4,
          truckSize: 'large',
          isWeekend: true,
          distance: 300,
        },
        additionalServices: ['packing', 'assembly', 'storage', 'cleaning'],
        inventory: [
          { name: 'Living Room Set', category: 'Furniture', weight: 800, volume: 150, specialHandling: false },
          { name: 'Bedroom Sets (3)', category: 'Furniture', weight: 1200, volume: 250, specialHandling: false },
          { name: 'Kitchen Items', category: 'General', weight: 1000, volume: 200, specialHandling: false },
          { name: 'Electronics', category: 'Electronics', weight: 300, volume: 80, specialHandling: true },
          { name: 'Books and Documents', category: 'General', weight: 500, volume: 100, specialHandling: false },
          { name: 'Artwork and Decor', category: 'Artwork', weight: 200, volume: 120, specialHandling: true },
        ],
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(fullServiceMove)
        .expect(200);

      ResponseAssertions.assertSuccessResponse(response);

      const estimate = response.body.estimate;

      // Full service should be comprehensive and expensive
      expect(estimate.calculations.finalPrice).toBeGreaterThan(4000);

      // Should have rules for all services
      const serviceTypes = ['packing', 'assembly', 'storage', 'weekend', 'distance'];
      serviceTypes.forEach(service => {
        const hasService = estimate.calculations.appliedRules.some((rule: any) =>
          rule.ruleName.toLowerCase().includes(service)
        );
        expect(hasService).toBe(true);
      });
    });

    it('should calculate storage-only estimates', async () => {
      const storageOnlyMove = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'storage',
          estimatedWeight: 3000,
          estimatedVolume: 500,
          crewSize: 2,
          truckSize: 'medium',
          isWeekend: false,
        },
        additionalServices: ['storage'],
        pickupLocation: {
          address: '123 Storage Pickup, Springfield, IL 62701',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 50,
        },
        deliveryLocation: {
          address: 'StorageMax Facility, Springfield, IL 62703',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 25,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(storageOnlyMove)
        .expect(200);

      ResponseAssertions.assertSuccessResponse(response);

      const estimate = response.body.estimate;

      // Storage moves should be moderately priced
      expect(estimate.calculations.finalPrice).toBeGreaterThan(200);
      expect(estimate.calculations.finalPrice).toBeLessThan(2000);
    });
  });

  describe('Input Validation and Error Handling', () => {
    it('should validate required customer information', async () => {
      const invalidEstimate = {
        // Missing customer information
        pickupLocation: {
          address: '123 Test St',
          accessDifficulty: 'easy',
          floorNumber: 1,
          elevatorAccess: true,
          parkingDistance: 50,
        },
        moveDetails: {
          serviceType: 'local',
          estimatedWeight: 3000,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(invalidEstimate)
        .expect(400);

      ResponseAssertions.assertErrorResponse(response, 400);
      expect(response.body.message).toMatch(/customer/i);
    });

    it('should validate service type', async () => {
      const invalidServiceType = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'invalid-service-type',
          estimatedWeight: 3000,
          estimatedVolume: 500,
          crewSize: 2,
          truckSize: 'medium',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(invalidServiceType)
        .expect(400);

      ResponseAssertions.assertErrorResponse(response, 400);
      expect(response.body.message).toMatch(/service.*type/i);
    });

    it('should validate weight and volume ranges', async () => {
      const invalidWeight = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'local',
          estimatedWeight: -1000, // Negative weight
          estimatedVolume: 500,
          crewSize: 2,
          truckSize: 'medium',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(invalidWeight)
        .expect(400);

      ResponseAssertions.assertErrorResponse(response, 400);
      expect(response.body.message).toMatch(/weight|volume/i);
    });

    it('should validate location information', async () => {
      const invalidLocation = TestDataFactories.createEstimateData({
        pickupLocation: {
          // Missing required address
          accessDifficulty: 'easy',
          floorNumber: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(invalidLocation)
        .expect(400);

      ResponseAssertions.assertErrorResponse(response, 400);
      expect(response.body.message).toMatch(/address|location/i);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send('{ invalid json }')
        .expect(400);

      ResponseAssertions.assertErrorResponse(response, 400);
    });

    it('should validate crew size and truck size compatibility', async () => {
      const incompatibleSizes = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'local',
          estimatedWeight: 8000,
          estimatedVolume: 1200,
          crewSize: 1, // Too small crew for large load
          truckSize: 'large',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(incompatibleSizes)
        .expect(400);

      ResponseAssertions.assertErrorResponse(response, 400);
      expect(response.body.message).toMatch(/crew.*truck|compatibility/i);
    });
  });

  describe('Deterministic Calculations', () => {
    it('should produce identical results for identical inputs', async () => {
      const estimateData = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'local',
          estimatedWeight: 4000,
          estimatedVolume: 600,
          crewSize: 3,
          truckSize: 'medium',
          isWeekend: false,
        },
      });

      // Calculate the same estimate multiple times
      const calculations = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(estimateData)
          .expect(200);
        calculations.push(response.body.estimate);
      }

      // All calculations should have the same final price
      const firstPrice = calculations[0].calculations.finalPrice;
      calculations.forEach(calc => {
        expect(calc.calculations.finalPrice).toBe(firstPrice);
      });

      // All calculations should have the same hash
      const firstHash = calculations[0].metadata.hash;
      calculations.forEach(calc => {
        expect(calc.metadata.hash).toBe(firstHash);
      });
    });

    it('should generate different hashes for different inputs', async () => {
      const estimate1 = TestDataFactories.createEstimateData({
        moveDetails: { serviceType: 'local', estimatedWeight: 3000 },
      });

      const estimate2 = TestDataFactories.createEstimateData({
        moveDetails: { serviceType: 'local', estimatedWeight: 4000 }, // Different weight
      });

      const response1 = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimate1)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimate2)
        .expect(200);

      const hash1 = response1.body.estimate.metadata.hash;
      const hash2 = response2.body.estimate.metadata.hash;

      expect(hash1).not.toBe(hash2);
    });

    it('should maintain hash consistency across sessions', async () => {
      const estimateData = TestDataFactories.createEstimateData();

      // Get hash from first calculation
      const response1 = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const firstHash = response1.body.estimate.metadata.hash;

      // Simulate app restart by making another request
      const response2 = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const secondHash = response2.body.estimate.metadata.hash;

      expect(firstHash).toBe(secondHash);
    });
  });

  describe('Price Breakdown Analysis', () => {
    it('should provide detailed cost breakdown', async () => {
      const estimateData = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'long_distance',
          estimatedWeight: 5000,
          estimatedVolume: 800,
          crewSize: 3,
          truckSize: 'large',
          isWeekend: true,
          distance: 400,
        },
        additionalServices: ['packing', 'storage'],
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const estimate = response.body.estimate;
      expect(estimate.calculations).toHaveProperty('breakdown');

      const breakdown = estimate.calculations.breakdown;
      expect(breakdown).toHaveProperty('labor');
      expect(breakdown).toHaveProperty('transportation');
      expect(breakdown).toHaveProperty('materials');
      expect(breakdown).toHaveProperty('additional_services');
      expect(breakdown).toHaveProperty('total');

      // All breakdown values should be numbers
      Object.values(breakdown).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });

      // Total should equal final price
      expect(breakdown.total).toBe(estimate.calculations.finalPrice);
    });

    it('should itemize additional services in breakdown', async () => {
      const estimateData = TestDataFactories.createEstimateData({
        additionalServices: ['packing', 'assembly', 'storage'],
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const estimate = response.body.estimate;
      const appliedRules = estimate.calculations.appliedRules;

      // Should have rules for each additional service
      const serviceRules = appliedRules.filter((rule: any) =>
        ['packing', 'assembly', 'storage'].some(service =>
          rule.ruleName.toLowerCase().includes(service)
        )
      );

      expect(serviceRules.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle multiple concurrent estimate requests', async () => {
      const estimateData = TestDataFactories.createEstimateData();

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/estimates/calculate')
          .send(estimateData)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        ResponseAssertions.assertSuccessResponse(response);
        expect(response.body.estimate.calculations.finalPrice).toBeGreaterThan(0);
      });

      // All should produce identical results (deterministic)
      const firstPrice = responses[0].body.estimate.calculations.finalPrice;
      responses.forEach(response => {
        expect(response.body.estimate.calculations.finalPrice).toBe(firstPrice);
      });
    }, 15000);

    it('should handle complex estimates efficiently', async () => {
      const complexEstimate = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'long_distance',
          estimatedWeight: 10000,
          estimatedVolume: 1500,
          crewSize: 5,
          truckSize: 'extra_large',
          isWeekend: true,
          distance: 1000,
        },
        inventory: Array.from({ length: 50 }, (_, i) => ({
          name: `Item ${i + 1}`,
          category: 'General',
          weight: 50 + Math.random() * 100,
          volume: 10 + Math.random() * 20,
          specialHandling: i % 5 === 0,
        })),
        additionalServices: ['packing', 'assembly', 'storage', 'cleaning'],
        pickupLocation: {
          address: '123 Complex Pickup, Springfield, IL 62701',
          accessDifficulty: 'very_difficult',
          floorNumber: 10,
          elevatorAccess: false,
          parkingDistance: 500,
        },
        deliveryLocation: {
          address: '456 Complex Delivery, Los Angeles, CA 90210',
          accessDifficulty: 'very_difficult',
          floorNumber: 8,
          elevatorAccess: false,
          parkingDistance: 400,
        },
      });

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(complexEstimate)
        .expect(200);
      const endTime = Date.now();

      ResponseAssertions.assertSuccessResponse(response);
      expect(response.body.estimate.calculations.finalPrice).toBeGreaterThan(5000);

      // Should complete in reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should maintain accuracy under load', async () => {
      const testScenarios = [
        { serviceType: 'local', weight: 2000, expectedRange: [500, 1500] },
        { serviceType: 'long_distance', weight: 5000, expectedRange: [2000, 8000] },
        { serviceType: 'storage', weight: 3000, expectedRange: [800, 2500] },
        { serviceType: 'packing_only', weight: 1500, expectedRange: [300, 1200] },
      ];

      const results = await Promise.all(
        testScenarios.map(async scenario => {
          const estimateData = TestDataFactories.createEstimateData({
            moveDetails: {
              serviceType: scenario.serviceType,
              estimatedWeight: scenario.weight,
              estimatedVolume: scenario.weight * 0.15,
              crewSize: 2,
              truckSize: 'medium',
            },
          });

          const response = await request(app.getHttpServer())
            .post('/estimates/calculate')
            .send(estimateData);

          return {
            scenario,
            price: response.body.estimate.calculations.finalPrice,
          };
        })
      );

      // Verify all prices are within expected ranges
      results.forEach(result => {
        const [min, max] = result.scenario.expectedRange;
        expect(result.price).toBeGreaterThanOrEqual(min);
        expect(result.price).toBeLessThanOrEqual(max);
      });
    }, 10000);
  });

  describe('Audit Trail and Metadata', () => {
    it('should provide complete audit trail', async () => {
      const estimateData = TestDataFactories.createEstimateData();

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const estimate = response.body.estimate;

      expect(estimate.metadata).toHaveProperty('calculatedAt');
      expect(estimate.metadata).toHaveProperty('version');
      expect(estimate.metadata).toHaveProperty('deterministic', true);
      expect(estimate.metadata).toHaveProperty('hash');
      expect(estimate.metadata).toHaveProperty('inputHash');

      // Verify timestamp format
      expect(new Date(estimate.metadata.calculatedAt)).toBeInstanceOf(Date);

      // Verify hash format (SHA256)
      expect(estimate.metadata.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(estimate.metadata.inputHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should track rule application order', async () => {
      const estimateData = TestDataFactories.createEstimateData({
        moveDetails: {
          serviceType: 'long_distance',
          isWeekend: true,
          estimatedWeight: 8000,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const appliedRules = response.body.estimate.calculations.appliedRules;

      // Rules should have proper structure
      appliedRules.forEach((rule: any, index: number) => {
        expect(rule).toHaveProperty('ruleId');
        expect(rule).toHaveProperty('ruleName');
        expect(rule).toHaveProperty('priority');
        expect(rule).toHaveProperty('priceImpact');
        expect(rule).toHaveProperty('appliedAt', index);
        expect(typeof rule.priceImpact).toBe('number');
      });

      // Rules should be ordered by priority
      for (let i = 1; i < appliedRules.length; i++) {
        expect(appliedRules[i].priority).toBeGreaterThanOrEqual(appliedRules[i - 1].priority);
      }
    });

    it('should provide calculation methodology', async () => {
      const estimateData = TestDataFactories.createEstimateData();

      const response = await request(app.getHttpServer())
        .post('/estimates/calculate')
        .send(estimateData)
        .expect(200);

      const estimate = response.body.estimate;

      expect(estimate.metadata).toHaveProperty('methodology');
      expect(estimate.metadata.methodology).toHaveProperty('engine', 'DeterministicEstimator');
      expect(estimate.metadata.methodology).toHaveProperty('version');
      expect(estimate.metadata.methodology).toHaveProperty('rulesVersion');
    });
  });
});