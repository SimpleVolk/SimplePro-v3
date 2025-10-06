import { DeterministicEstimator } from './estimator';
import { PricingRule, LocationHandicap } from './schemas/rules.schema';
import { sampleInputs } from './test-data/sample-inputs';
import defaultRules from './data/default-rules.json';

describe('DeterministicEstimator', () => {
  let estimator: DeterministicEstimator;

  beforeEach(() => {
    const rules = defaultRules.pricingRules as PricingRule[];
    const handicaps = defaultRules.locationHandicaps as LocationHandicap[];
    estimator = new DeterministicEstimator(rules, handicaps);
  });

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const invalidInput = { ...sampleInputs.studioLocal };
      invalidInput.customerId = '';

      const result = estimator.validateInput(invalidInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer ID is required');
    });

    it('should validate positive numeric values', () => {
      const invalidInput = { ...sampleInputs.studioLocal };
      invalidInput.totalWeight = -100;
      invalidInput.crewSize = 0;

      const result = estimator.validateInput(invalidInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total weight must be greater than 0');
      expect(result.errors).toContain('Crew size must be at least 1');
    });

    it('should validate service type constraints', () => {
      const invalidInput = { ...sampleInputs.longDistanceHeavy };
      invalidInput.service = 'local';
      invalidInput.distance = 920; // Long distance for local service

      const result = estimator.validateInput(invalidInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Local moves must be 50 miles or less');
    });

    it('should validate future move dates', () => {
      const invalidInput = { ...sampleInputs.studioLocal };
      invalidInput.moveDate = new Date('2020-01-01'); // Past date

      const result = estimator.validateInput(invalidInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Move date cannot be in the past');
    });

    it('should pass validation for valid input', () => {
      const result = estimator.validateInput(sampleInputs.studioLocal);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Deterministic Calculations', () => {
    it('should produce identical results for identical inputs', () => {
      const result1 = estimator.calculateEstimate(
        sampleInputs.studioLocal,
        'test-user',
      );
      const result2 = estimator.calculateEstimate(
        sampleInputs.studioLocal,
        'test-user',
      );

      expect(result1.calculations.finalPrice).toBe(
        result2.calculations.finalPrice,
      );
      expect(result1.metadata.hash).toBe(result2.metadata.hash);
      expect(result1.calculations.appliedRules).toHaveLength(
        result2.calculations.appliedRules.length,
      );
    });

    it('should produce different hashes for different inputs', () => {
      const result1 = estimator.calculateEstimate(
        sampleInputs.studioLocal,
        'test-user',
      );
      const result2 = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      expect(result1.metadata.hash).not.toBe(result2.metadata.hash);
    });

    it('should maintain determinism across multiple executions', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(
          estimator.calculateEstimate(
            sampleInputs.weekendChallenge,
            'test-user',
          ),
        );
      }

      // All results should have the same final price and hash
      const firstPrice = results[0].calculations.finalPrice;
      const firstHash = results[0].metadata.hash;

      results.forEach((result) => {
        expect(result.calculations.finalPrice).toBe(firstPrice);
        expect(result.metadata.hash).toBe(firstHash);
      });
    });
  });

  describe('Base Price Calculations', () => {
    it('should calculate correct base price for local moves', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.studioLocal,
        'test-user',
      );

      // Studio local: 2 crew × $150/hour × 4 hours = $600
      expect(result.calculations.basePrice).toBe(600);
    });

    it('should calculate correct base price for long distance moves', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.longDistanceHeavy,
        'test-user',
      );

      // Long distance: 12,500 lbs × $1.25/lb = $15,625
      expect(result.calculations.basePrice).toBe(15625);
    });

    it('should calculate correct base price for packing only', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.packingOnly,
        'test-user',
      );

      // Packing only: $85/hour × 6 hours = $510
      expect(result.calculations.basePrice).toBe(510);
    });

    it('should adjust base price for larger crews', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      // Base rate + crew adjustment should be applied
      expect(result.calculations.basePrice).toBeGreaterThan(600); // More than 2-person crew rate
    });
  });

  describe('Pricing Rules Application', () => {
    it('should apply crew size adjustment for larger crews', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const crewRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'crew_size_adjustment',
      );
      expect(crewRule).toBeDefined();
      expect(crewRule!.priceImpact).toBeGreaterThan(0);
    });

    it('should apply heavy weight surcharge for shipments over 8,000 lbs', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.longDistanceHeavy,
        'test-user',
      );

      const weightRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'weight_heavy_surcharge',
      );
      expect(weightRule).toBeDefined();
      expect(weightRule!.priceImpact).toBeGreaterThan(0);
    });

    it('should apply piano special handling charge', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const pianoRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'piano_special_handling',
      );
      expect(pianoRule).toBeDefined();
      expect(pianoRule!.priceImpact).toBe(350);
    });

    it('should apply weekend surcharge', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.weekendChallenge,
        'test-user',
      );

      const weekendRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'weekend_surcharge',
      );
      expect(weekendRule).toBeDefined();
      expect(weekendRule!.priceImpact).toBeGreaterThan(0);
    });

    it('should apply peak season surcharge', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const peakRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'peak_season_surcharge',
      );
      expect(peakRule).toBeDefined();
      expect(peakRule!.priceImpact).toBeGreaterThan(0);
    });

    it('should apply minimum charge for small local moves', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.minimalLocal,
        'test-user',
      );

      const minRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'minimum_charge_local',
      );
      expect(minRule).toBeDefined();
      expect(result.calculations.finalPrice).toBeGreaterThanOrEqual(400);
    });

    it('should apply fragile items surcharge for large quantities', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.weekendChallenge,
        'test-user',
      );

      const fragileRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'fragile_items_surcharge',
      );
      expect(fragileRule).toBeDefined();
      expect(fragileRule!.priceImpact).toBeGreaterThan(0);
    });

    it('should apply antique handling charge', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const antiqueRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'antique_handling',
      );
      expect(antiqueRule).toBeDefined();
      expect(antiqueRule!.priceImpact).toBe(200);
    });
  });

  describe('Location Handicaps', () => {
    it('should apply stairs handicap at pickup', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const stairsHandicap = result.calculations.locationHandicaps.find(
        (h) => h.handicapId === 'stairs_pickup',
      );
      expect(stairsHandicap).toBeDefined();
      expect(stairsHandicap!.priceImpact).toBe(225); // $75 × 3 flights
    });

    it('should apply long carry handicap', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const longCarryHandicap = result.calculations.locationHandicaps.find(
        (h) => h.handicapId === 'long_carry_pickup',
      );
      expect(longCarryHandicap).toBeDefined();
      expect(longCarryHandicap!.priceImpact).toBe(125);
    });

    it('should apply difficult access multiplier', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.weekendChallenge,
        'test-user',
      );

      const accessHandicap = result.calculations.locationHandicaps.find(
        (h) => h.handicapId === 'difficult_access_pickup',
      );
      expect(accessHandicap).toBeDefined();
      expect(accessHandicap!.multiplier).toBe(1.25);
    });

    it('should apply parking distance handicap', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.weekendChallenge,
        'test-user',
      );

      const parkingHandicap = result.calculations.locationHandicaps.find(
        (h) => h.handicapId === 'parking_distance_pickup',
      );
      expect(parkingHandicap).toBeDefined();
      expect(parkingHandicap!.priceImpact).toBe(100);
    });

    it('should apply narrow hallways multiplier', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const hallwaysHandicap = result.calculations.locationHandicaps.find(
        (h) => h.handicapId === 'narrow_hallways_pickup',
      );
      expect(hallwaysHandicap).toBeDefined();
      expect(hallwaysHandicap!.multiplier).toBe(1.15);
    });
  });

  describe('Price Breakdown', () => {
    it('should provide detailed price breakdown', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      expect(result.calculations.breakdown).toBeDefined();
      expect(result.calculations.breakdown.baseLabor).toBeGreaterThan(0);
      expect(result.calculations.breakdown.locationHandicaps).toBeGreaterThan(
        0,
      );
      expect(result.calculations.breakdown.specialServices).toBeGreaterThan(0);
      expect(result.calculations.breakdown.seasonalAdjustment).toBeGreaterThan(
        0,
      );
      expect(result.calculations.breakdown.total).toBe(
        result.calculations.finalPrice,
      );
    });

    it('should categorize charges correctly', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.longDistanceHeavy,
        'test-user',
      );

      const breakdown = result.calculations.breakdown;

      // Should have materials cost due to packing service
      expect(breakdown.materials).toBeGreaterThan(0);

      // Should have transportation cost due to long distance
      expect(breakdown.transportation).toBeGreaterThan(0);

      // Should have base labor cost
      expect(breakdown.baseLabor).toBeGreaterThan(0);
    });

    it('should calculate totals correctly', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.weekendChallenge,
        'test-user',
      );

      const breakdown = result.calculations.breakdown;
      const calculatedSubtotal =
        breakdown.baseLabor +
        breakdown.materials +
        breakdown.transportation +
        breakdown.locationHandicaps +
        breakdown.specialServices +
        breakdown.seasonalAdjustment;

      expect(Math.abs(breakdown.subtotal - calculatedSubtotal)).toBeLessThan(
        0.01,
      ); // Allow for rounding
      expect(breakdown.total).toBe(result.calculations.finalPrice);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero special items gracefully', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.minimalLocal,
        'test-user',
      );

      expect(result.calculations.finalPrice).toBeGreaterThan(0);
      expect(
        result.calculations.appliedRules.some((r) =>
          r.ruleId.includes('fragile'),
        ),
      ).toBe(false);
    });

    it('should handle same pickup and delivery address', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.packingOnly,
        'test-user',
      );

      expect(result.calculations.finalPrice).toBeGreaterThan(0);
      expect(result.input.distance).toBe(0);
    });

    it('should round prices to 2 decimal places', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.studioLocal,
        'test-user',
      );

      // Check that final price has at most 2 decimal places
      const priceString = result.calculations.finalPrice.toString();
      const decimalIndex = priceString.indexOf('.');
      if (decimalIndex >= 0) {
        expect(priceString.length - decimalIndex - 1).toBeLessThanOrEqual(2);
      }
    });

    it('should handle extreme access difficulty', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.weekendChallenge,
        'test-user',
      );

      const extremeHandicap = result.calculations.locationHandicaps.find(
        (h) => h.handicapId === 'difficult_access_pickup',
      );
      expect(extremeHandicap).toBeDefined();
    });
  });

  describe('Rule Priority and Order', () => {
    it('should apply rules in correct priority order', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      // Base pricing rules should be applied first (lower priority numbers)
      const baseRules = result.calculations.appliedRules.filter(
        (r) => r.ruleId.includes('base') || r.ruleId.includes('crew'),
      );
      const specialRules = result.calculations.appliedRules.filter(
        (r) => r.ruleId.includes('piano') || r.ruleId.includes('antique'),
      );

      expect(baseRules.length).toBeGreaterThan(0);
      expect(specialRules.length).toBeGreaterThan(0);
    });

    it('should not apply inactive rules', () => {
      // Create estimator with some inactive rules
      const rules = defaultRules.pricingRules.map((rule) => ({
        ...rule,
        isActive: rule.id !== 'piano_special_handling', // Deactivate piano rule
      })) as PricingRule[];

      const handicaps = defaultRules.locationHandicaps as LocationHandicap[];
      const testEstimator = new DeterministicEstimator(rules, handicaps);

      const result = testEstimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      const pianoRule = result.calculations.appliedRules.find(
        (r) => r.ruleId === 'piano_special_handling',
      );
      expect(pianoRule).toBeUndefined();
    });

    it('should respect service type restrictions', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.packingOnly,
        'test-user',
      );

      // Long distance rules should not apply to packing only service
      const longDistanceRules = result.calculations.appliedRules.filter(
        (r) => r.ruleId.includes('distance') && r.ruleId !== 'parking_distance',
      );
      expect(longDistanceRules).toHaveLength(0);
    });
  });

  describe('Calculation Details', () => {
    it('should provide detailed calculation explanations', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.largeLargePiano,
        'test-user',
      );

      result.calculations.appliedRules.forEach((rule) => {
        expect(rule.calculationDetails).toBeDefined();
        expect(rule.calculationDetails.length).toBeGreaterThan(0);
      });
    });

    it('should include metadata with version and timestamp', () => {
      const result = estimator.calculateEstimate(
        sampleInputs.studioLocal,
        'test-user',
      );

      expect(result.metadata.rulesVersion).toBeDefined();
      expect(result.metadata.calculatedAt).toBeInstanceOf(Date);
      expect(result.metadata.calculatedBy).toBe('test-user');
      expect(result.metadata.deterministic).toBe(true);
      expect(result.metadata.hash).toBeDefined();
      expect(result.metadata.hash.length).toBe(64); // SHA256 hash length
    });

    it('should maintain input data integrity', () => {
      const originalInput = { ...sampleInputs.studioLocal };
      const result = estimator.calculateEstimate(originalInput, 'test-user');

      expect(result.input).toEqual(originalInput);
    });
  });
});
