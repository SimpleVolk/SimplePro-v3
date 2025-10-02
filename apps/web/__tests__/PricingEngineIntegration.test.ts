/**
 * Pricing Engine Integration Test Suite
 * Tests the complete pricing calculation workflow
 * Verifies that settings changes affect estimate calculations correctly
 */

import { DeterministicEstimator, defaultRules } from '@simplepro/pricing-engine';
import type { EstimateInput } from '@simplepro/pricing-engine';

describe('Pricing Engine Integration Tests', () => {
  let estimator: DeterministicEstimator;

  beforeEach(() => {
    estimator = new DeterministicEstimator(
      defaultRules.pricingRules as any,
      defaultRules.locationHandicaps as any
    );
  });

  describe('Test Scenario: 2 Bedroom Apartment - Weekend Move', () => {
    const baseInput: EstimateInput = {
      customerId: 'test-customer-123',
      service: 'local',
      moveDate: new Date('2025-10-11'), // Saturday
      pickup: {
        address: '123 Main St, Boston, MA 02101',
        floorLevel: 2,
        elevatorAccess: false,
        longCarry: false,
        parkingDistance: 20,
        accessDifficulty: 'moderate',
        stairsCount: 20,
        narrowHallways: false,
      },
      delivery: {
        address: '456 Oak Ave, Cambridge, MA 02138',
        floorLevel: 1,
        elevatorAccess: true,
        longCarry: false,
        parkingDistance: 10,
        accessDifficulty: 'easy',
        stairsCount: 0,
        narrowHallways: false,
      },
      totalWeight: 5886, // 2BR Apartment weight
      totalVolume: 654, // 2BR Apartment volume
      distance: 15,
      estimatedDuration: 4,
      crewSize: 3,
      isWeekend: true,
      isHoliday: false,
      seasonalPeriod: 'standard',
      specialtyCrewRequired: false,
      specialItems: {
        piano: true,
        antiques: false,
        artwork: false,
        fragileItems: 5,
        valuableItems: 2,
      },
      additionalServices: {
        packing: true,
        unpacking: false,
        assembly: true,
        storage: false,
        cleaning: false,
      },
      rooms: [],
    };

    it('should calculate base price correctly for 2BR apartment', () => {
      const result = estimator.calculateEstimate(baseInput, 'test-user');

      expect(result.calculations.finalPrice).toBeGreaterThan(0);
      expect(result.calculations.breakdown.baseLabor).toBeGreaterThan(0);
      expect(result.metadata.deterministic).toBe(true);
    });

    it('should apply weekend surcharge', () => {
      const weekdayInput = { ...baseInput, isWeekend: false };
      const weekendInput = { ...baseInput, isWeekend: true };

      const weekdayResult = estimator.calculateEstimate(weekdayInput, 'test-user');
      const weekendResult = estimator.calculateEstimate(weekendInput, 'test-user');

      // Weekend should cost more
      expect(weekendResult.calculations.finalPrice).toBeGreaterThan(
        weekdayResult.calculations.finalPrice
      );

      // Check that weekend rule is applied
      const hasWeekendRule = weekendResult.calculations.appliedRules.some(
        rule => rule.ruleId === 'weekend_surcharge'
      );
      expect(hasWeekendRule).toBe(true);
    });

    it('should apply piano special handling charge', () => {
      const withoutPiano = { ...baseInput, specialItems: { ...baseInput.specialItems, piano: false } };
      const withPiano = baseInput;

      const noPianoResult = estimator.calculateEstimate(withoutPiano, 'test-user');
      const pianoResult = estimator.calculateEstimate(withPiano, 'test-user');

      // Piano move should cost more
      expect(pianoResult.calculations.finalPrice).toBeGreaterThan(noPianoResult.calculations.finalPrice);

      // Check that piano rule is applied
      const hasPianoRule = pianoResult.calculations.appliedRules.some(
        rule => rule.ruleId === 'piano_special_handling'
      );
      expect(hasPianoRule).toBe(true);
    });

    it('should apply location handicaps for stairs', () => {
      const noStairs = {
        ...baseInput,
        pickup: { ...baseInput.pickup, stairsCount: 0 },
      };
      const withStairs = baseInput;

      const noStairsResult = estimator.calculateEstimate(noStairs, 'test-user');
      const stairsResult = estimator.calculateEstimate(withStairs, 'test-user');

      // Stairs should add cost
      expect(stairsResult.calculations.finalPrice).toBeGreaterThan(noStairsResult.calculations.finalPrice);
      expect(stairsResult.calculations.breakdown.locationHandicaps).toBeGreaterThan(0);
    });

    it('should apply packing service charge', () => {
      const noPacking = {
        ...baseInput,
        additionalServices: { ...baseInput.additionalServices, packing: false },
      };
      const withPacking = baseInput;

      const noPackingResult = estimator.calculateEstimate(noPacking, 'test-user');
      const packingResult = estimator.calculateEstimate(withPacking, 'test-user');

      // Packing should add cost
      expect(packingResult.calculations.finalPrice).toBeGreaterThan(noPackingResult.calculations.finalPrice);
      expect(packingResult.calculations.breakdown.specialServices).toBeGreaterThan(0);
    });

    it('should apply access difficulty multiplier', () => {
      const easyAccess = {
        ...baseInput,
        pickup: { ...baseInput.pickup, accessDifficulty: 'easy' as const },
      };
      const difficultAccess = {
        ...baseInput,
        pickup: { ...baseInput.pickup, accessDifficulty: 'difficult' as const },
      };

      const easyResult = estimator.calculateEstimate(easyAccess, 'test-user');
      const difficultResult = estimator.calculateEstimate(difficultAccess, 'test-user');

      // Difficult access should cost more
      expect(difficultResult.calculations.finalPrice).toBeGreaterThan(easyResult.calculations.finalPrice);
    });

    it('should provide complete price breakdown', () => {
      const result = estimator.calculateEstimate(baseInput, 'test-user');

      expect(result.calculations.breakdown).toHaveProperty('baseLabor');
      expect(result.calculations.breakdown).toHaveProperty('materials');
      expect(result.calculations.breakdown).toHaveProperty('transportation');
      expect(result.calculations.breakdown).toHaveProperty('locationHandicaps');
      expect(result.calculations.breakdown).toHaveProperty('specialServices');
      expect(result.calculations.breakdown).toHaveProperty('overhead');
      expect(result.calculations.breakdown).toHaveProperty('total');

      // Verify total matches final price
      expect(result.calculations.breakdown.total).toBe(result.calculations.finalPrice);
    });

    it('should be deterministic - same input produces same output', () => {
      const result1 = estimator.calculateEstimate(baseInput, 'test-user');
      const result2 = estimator.calculateEstimate(baseInput, 'test-user');
      const result3 = estimator.calculateEstimate(baseInput, 'test-user');

      expect(result1.calculations.finalPrice).toBe(result2.calculations.finalPrice);
      expect(result2.calculations.finalPrice).toBe(result3.calculations.finalPrice);
      expect(result1.metadata.hash).toBe(result2.metadata.hash);
      expect(result2.metadata.hash).toBe(result3.metadata.hash);
    });

    it('should include estimate metadata', () => {
      const result = estimator.calculateEstimate(baseInput, 'test-user');

      expect(result.estimateId).toBeTruthy();
      expect(result.metadata.deterministic).toBe(true);
      expect(result.metadata.hash).toBeTruthy();
      expect(result.metadata.timestamp).toBeTruthy();
      expect(result.metadata.calculatedBy).toBe('test-user');
    });

    it('should list all applied rules', () => {
      const result = estimator.calculateEstimate(baseInput, 'test-user');

      expect(result.calculations.appliedRules.length).toBeGreaterThan(0);

      result.calculations.appliedRules.forEach(rule => {
        expect(rule).toHaveProperty('ruleId');
        expect(rule).toHaveProperty('ruleName');
        expect(rule).toHaveProperty('priceImpact');
      });
    });
  });

  describe('Test Scenario: Large Move with Heavy Weight', () => {
    const heavyInput: EstimateInput = {
      customerId: 'test-customer-456',
      service: 'local',
      moveDate: new Date('2025-10-15'),
      pickup: {
        address: '789 Elm St, Brookline, MA 02445',
        floorLevel: 1,
        elevatorAccess: false,
        longCarry: true,
        parkingDistance: 100,
        accessDifficulty: 'extreme',
        stairsCount: 0,
        narrowHallways: true,
      },
      delivery: {
        address: '321 Pine Rd, Newton, MA 02458',
        floorLevel: 3,
        elevatorAccess: false,
        longCarry: false,
        parkingDistance: 50,
        accessDifficulty: 'difficult',
        stairsCount: 45,
        narrowHallways: true,
      },
      totalWeight: 11264, // 4BR House - over 8000 lbs
      totalVolume: 1872,
      distance: 8,
      estimatedDuration: 8,
      crewSize: 5,
      isWeekend: false,
      isHoliday: false,
      seasonalPeriod: 'standard',
      specialtyCrewRequired: true,
      specialItems: {
        piano: true,
        antiques: true,
        artwork: true,
        fragileItems: 15,
        valuableItems: 8,
      },
      additionalServices: {
        packing: true,
        unpacking: true,
        assembly: true,
        storage: false,
        cleaning: true,
      },
      rooms: [],
    };

    it('should apply heavy weight surcharge for moves over 8000 lbs', () => {
      const result = estimator.calculateEstimate(heavyInput, 'test-user');

      const hasHeavyWeightRule = result.calculations.appliedRules.some(
        rule => rule.ruleId === 'heavy_shipment_surcharge'
      );

      expect(hasHeavyWeightRule).toBe(true);
    });

    it('should apply crew size adjustment for 5+ movers', () => {
      const smallCrew = { ...heavyInput, crewSize: 2 };
      const largeCrew = heavyInput;

      const smallCrewResult = estimator.calculateEstimate(smallCrew, 'test-user');
      const largeCrewResult = estimator.calculateEstimate(largeCrew, 'test-user');

      // Large crew should cost more
      expect(largeCrewResult.calculations.finalPrice).toBeGreaterThan(
        smallCrewResult.calculations.finalPrice
      );
    });

    it('should handle multiple location handicaps correctly', () => {
      const result = estimator.calculateEstimate(heavyInput, 'test-user');

      // Should have significant location handicap costs
      expect(result.calculations.breakdown.locationHandicaps).toBeGreaterThan(100);

      // Multiple handicaps: long carry, extreme/difficult access, stairs, narrow hallways
      const locationRules = result.calculations.appliedRules.filter(
        rule => rule.ruleId.includes('stairs') ||
               rule.ruleId.includes('carry') ||
               rule.ruleId.includes('access') ||
               rule.ruleId.includes('parking') ||
               rule.ruleId.includes('narrow')
      );

      expect(locationRules.length).toBeGreaterThan(0);
    });

    it('should apply fragile items surcharge for large quantities', () => {
      const result = estimator.calculateEstimate(heavyInput, 'test-user');

      const hasFragileRule = result.calculations.appliedRules.some(
        rule => rule.ruleId === 'fragile_items_surcharge'
      );

      // Should apply when fragile items >= 10
      expect(hasFragileRule).toBe(true);
    });

    it('should apply antique handling charge', () => {
      const result = estimator.calculateEstimate(heavyInput, 'test-user');

      const hasAntiqueRule = result.calculations.appliedRules.some(
        rule => rule.ruleId === 'antique_handling'
      );

      expect(hasAntiqueRule).toBe(true);
    });

    it('should calculate total cost correctly for complex move', () => {
      const result = estimator.calculateEstimate(heavyInput, 'test-user');

      // Verify price is substantial for this complex move
      expect(result.calculations.finalPrice).toBeGreaterThan(1000);

      // Verify all breakdown components
      expect(result.calculations.breakdown.baseLabor).toBeGreaterThan(0);
      expect(result.calculations.breakdown.locationHandicaps).toBeGreaterThan(0);
      expect(result.calculations.breakdown.specialServices).toBeGreaterThan(0);

      // Sum should equal total
      const calculatedTotal =
        result.calculations.breakdown.baseLabor +
        result.calculations.breakdown.materials +
        result.calculations.breakdown.transportation +
        result.calculations.breakdown.locationHandicaps +
        result.calculations.breakdown.specialServices +
        result.calculations.breakdown.overhead;

      expect(Math.abs(calculatedTotal - result.calculations.breakdown.total)).toBeLessThan(0.01);
    });
  });

  describe('Test Scenario: Long Distance Move', () => {
    const longDistanceInput: EstimateInput = {
      customerId: 'test-customer-789',
      service: 'long_distance',
      moveDate: new Date('2025-11-01'),
      pickup: {
        address: '100 State St, Boston, MA 02109',
        floorLevel: 5,
        elevatorAccess: true,
        longCarry: false,
        parkingDistance: 15,
        accessDifficulty: 'easy',
        stairsCount: 0,
        narrowHallways: false,
      },
      delivery: {
        address: '500 Broadway, New York, NY 10012',
        floorLevel: 10,
        elevatorAccess: true,
        longCarry: false,
        parkingDistance: 25,
        accessDifficulty: 'moderate',
        stairsCount: 0,
        narrowHallways: false,
      },
      totalWeight: 7668, // 2BR House
      totalVolume: 1458,
      distance: 215, // Boston to NYC
      estimatedDuration: 12,
      crewSize: 4,
      isWeekend: false,
      isHoliday: false,
      seasonalPeriod: 'standard',
      specialtyCrewRequired: false,
      specialItems: {
        piano: false,
        antiques: false,
        artwork: true,
        fragileItems: 8,
        valuableItems: 3,
      },
      additionalServices: {
        packing: true,
        unpacking: false,
        assembly: false,
        storage: true,
        cleaning: false,
      },
      rooms: [],
    };

    it('should calculate long distance pricing differently than local', () => {
      const localInput = { ...longDistanceInput, service: 'local' as const, distance: 20 };

      const localResult = estimator.calculateEstimate(localInput, 'test-user');
      const longDistanceResult = estimator.calculateEstimate(longDistanceInput, 'test-user');

      // Long distance should be significantly more expensive
      expect(longDistanceResult.calculations.finalPrice).toBeGreaterThan(
        localResult.calculations.finalPrice
      );
    });

    it('should include transportation costs for long distance', () => {
      const result = estimator.calculateEstimate(longDistanceInput, 'test-user');

      expect(result.calculations.breakdown.transportation).toBeGreaterThan(0);
    });

    it('should validate service type constraints', () => {
      const invalidLocal = { ...longDistanceInput, service: 'local' as const };

      const validation = estimator.validateInput(invalidLocal);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Local moves must be 50 miles or less');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle minimum charge for small local moves', () => {
      const smallInput: EstimateInput = {
        customerId: 'test-customer-min',
        service: 'local',
        moveDate: new Date('2025-10-20'),
        pickup: {
          address: '10 Main St',
          floorLevel: 1,
          elevatorAccess: true,
          longCarry: false,
          parkingDistance: 10,
          accessDifficulty: 'easy',
          stairsCount: 0,
          narrowHallways: false,
        },
        delivery: {
          address: '20 Main St',
          floorLevel: 1,
          elevatorAccess: true,
          longCarry: false,
          parkingDistance: 10,
          accessDifficulty: 'easy',
          stairsCount: 0,
          narrowHallways: false,
        },
        totalWeight: 675, // Studio or less
        totalVolume: 75,
        distance: 2,
        estimatedDuration: 2,
        crewSize: 2,
        isWeekend: false,
        isHoliday: false,
        seasonalPeriod: 'standard',
        specialtyCrewRequired: false,
        specialItems: {
          piano: false,
          antiques: false,
          artwork: false,
          fragileItems: 0,
          valuableItems: 0,
        },
        additionalServices: {
          packing: false,
          unpacking: false,
          assembly: false,
          storage: false,
          cleaning: false,
        },
        rooms: [],
      };

      const result = estimator.calculateEstimate(smallInput, 'test-user');

      // Should apply minimum charge
      const hasMinimumRule = result.calculations.appliedRules.some(
        rule => rule.ruleId === 'minimum_charge_local'
      );

      expect(hasMinimumRule).toBe(true);
      expect(result.calculations.finalPrice).toBeGreaterThanOrEqual(150);
    });

    it('should round prices to 2 decimal places', () => {
      const input: EstimateInput = {
        customerId: 'test-customer-round',
        service: 'local',
        moveDate: new Date('2025-10-20'),
        pickup: {
          address: '100 Test St',
          floorLevel: 1,
          elevatorAccess: false,
          longCarry: false,
          parkingDistance: 20,
          accessDifficulty: 'easy',
          stairsCount: 5,
          narrowHallways: false,
        },
        delivery: {
          address: '200 Test Ave',
          floorLevel: 1,
          elevatorAccess: false,
          longCarry: false,
          parkingDistance: 20,
          accessDifficulty: 'easy',
          stairsCount: 0,
          narrowHallways: false,
        },
        totalWeight: 3888,
        totalVolume: 432,
        distance: 10,
        estimatedDuration: 4,
        crewSize: 2,
        isWeekend: false,
        isHoliday: false,
        seasonalPeriod: 'standard',
        specialtyCrewRequired: false,
        specialItems: {
          piano: false,
          antiques: false,
          artwork: false,
          fragileItems: 0,
          valuableItems: 0,
        },
        additionalServices: {
          packing: false,
          unpacking: false,
          assembly: false,
          storage: false,
          cleaning: false,
        },
        rooms: [],
      };

      const result = estimator.calculateEstimate(input, 'test-user');

      // Check that price has at most 2 decimal places
      const priceString = result.calculations.finalPrice.toFixed(2);
      expect(parseFloat(priceString)).toBe(result.calculations.finalPrice);
    });

    it('should handle zero special items gracefully', () => {
      const input: EstimateInput = {
        customerId: 'test-customer-zero',
        service: 'local',
        moveDate: new Date('2025-10-20'),
        pickup: {
          address: '100 Test St',
          floorLevel: 1,
          elevatorAccess: false,
          longCarry: false,
          parkingDistance: 20,
          accessDifficulty: 'easy',
          stairsCount: 0,
          narrowHallways: false,
        },
        delivery: {
          address: '200 Test Ave',
          floorLevel: 1,
          elevatorAccess: false,
          longCarry: false,
          parkingDistance: 20,
          accessDifficulty: 'easy',
          stairsCount: 0,
          narrowHallways: false,
        },
        totalWeight: 3888,
        totalVolume: 432,
        distance: 10,
        estimatedDuration: 4,
        crewSize: 2,
        isWeekend: false,
        isHoliday: false,
        seasonalPeriod: 'standard',
        specialtyCrewRequired: false,
        specialItems: {
          piano: false,
          antiques: false,
          artwork: false,
          fragileItems: 0,
          valuableItems: 0,
        },
        additionalServices: {
          packing: false,
          unpacking: false,
          assembly: false,
          storage: false,
          cleaning: false,
        },
        rooms: [],
      };

      const result = estimator.calculateEstimate(input, 'test-user');

      // Should not crash and should return valid result
      expect(result.calculations.finalPrice).toBeGreaterThan(0);
      expect(result.metadata.deterministic).toBe(true);
    });
  });
});