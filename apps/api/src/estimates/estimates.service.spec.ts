import { Test, TestingModule } from '@nestjs/testing';
import { EstimatesService } from './estimates.service';
import {
  baseEstimateDto,
  largeEstimateDto,
  weekendEstimateDto,
  peakSeasonEstimateDto,
  minimalEstimateDto,
  difficultAccessEstimateDto,
  offSeasonEstimateDto,
} from '../../test/fixtures/estimates.fixture';

describe('EstimatesService', () => {
  let service: EstimatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EstimatesService],
    }).compile();

    service = module.get<EstimatesService>(EstimatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with deterministic estimator', () => {
      expect(service['estimator']).toBeDefined();
    });
  });

  describe('calculateEstimate - Basic Functionality', () => {
    it('should calculate estimate for base local move', () => {
      const result = service.calculateEstimate(baseEstimateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate).toBeDefined();
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should calculate estimate for large move with special items', () => {
      const result = service.calculateEstimate(largeEstimateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
      // Large move should be more expensive than base move
      const baseResult = service.calculateEstimate(baseEstimateDto);
      expect(result.estimate.totalPrice).toBeGreaterThan(baseResult.estimate.totalPrice);
    });

    it('should calculate estimate for minimal move', () => {
      const result = service.calculateEstimate(minimalEstimateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
    });

    it('should return estimate with proper structure', () => {
      const result = service.calculateEstimate(baseEstimateDto);

      expect(result.estimate).toHaveProperty('totalPrice');
      expect(result.estimate).toHaveProperty('basePrice');
      expect(result.estimate).toHaveProperty('calculations');
      expect(result.estimate).toHaveProperty('metadata');
    });

    it('should include metadata with calculatedAt timestamp', () => {
      const beforeCalc = new Date();
      const result = service.calculateEstimate(baseEstimateDto);
      const afterCalc = new Date();

      expect(result.estimate.metadata).toBeDefined();
      expect(result.estimate.metadata.calculatedAt).toBeDefined();
      const calcTime = new Date(result.estimate.metadata.calculatedAt);
      expect(calcTime.getTime()).toBeGreaterThanOrEqual(beforeCalc.getTime());
      expect(calcTime.getTime()).toBeLessThanOrEqual(afterCalc.getTime());
    });
  });

  describe('calculateEstimate - Pricing Rules Application', () => {
    it('should apply weekend surcharge for weekend moves', () => {
      const weekdayResult = service.calculateEstimate(baseEstimateDto);
      const weekendResult = service.calculateEstimate(weekendEstimateDto);

      // Weekend move should be more expensive
      expect(weekendResult.estimate.totalPrice).toBeGreaterThan(weekdayResult.estimate.totalPrice);
    });

    it('should apply peak season pricing', () => {
      const standardResult = service.calculateEstimate(baseEstimateDto);
      const peakResult = service.calculateEstimate(peakSeasonEstimateDto);

      // Peak season should be more expensive
      expect(peakResult.estimate.totalPrice).toBeGreaterThan(standardResult.estimate.totalPrice);
    });

    it('should apply off-season pricing correctly', () => {
      const result = service.calculateEstimate(offSeasonEstimateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
    });

    it('should apply special items surcharges', () => {
      const noPianoDto = { ...baseEstimateDto };
      const withPianoDto = {
        ...baseEstimateDto,
        inventory: {
          ...baseEstimateDto.inventory,
          specialItems: {
            piano: 1,
            antiques: 0,
            artwork: 0,
            fragileItems: 0,
          },
        },
      };

      const noPianoResult = service.calculateEstimate(noPianoDto);
      const withPianoResult = service.calculateEstimate(withPianoDto);

      expect(withPianoResult.estimate.totalPrice).toBeGreaterThan(noPianoResult.estimate.totalPrice);
    });

    it('should apply multiple special items surcharges', () => {
      const multipleSpecialItems = {
        ...largeEstimateDto,
        inventory: {
          ...largeEstimateDto.inventory,
          specialItems: {
            piano: 1,
            antiques: 3,
            artwork: 2,
            fragileItems: 10,
          },
        },
      };

      const result = service.calculateEstimate(multipleSpecialItems);

      expect(result.estimate.totalPrice).toBeGreaterThan(0);
      // Should have multiple surcharges applied
      expect(result.estimate.calculations.appliedRules.length).toBeGreaterThan(0);
    });
  });

  describe('calculateEstimate - Location Handicap Calculations', () => {
    it('should apply stairs surcharge', () => {
      const noStairsDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, stairs: 0 },
          delivery: { ...baseEstimateDto.locations.delivery, stairs: 0 },
        },
      };
      const withStairsDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, stairs: 30 },
          delivery: { ...baseEstimateDto.locations.delivery, stairs: 30 },
        },
      };

      const noStairsResult = service.calculateEstimate(noStairsDto);
      const withStairsResult = service.calculateEstimate(withStairsDto);

      expect(withStairsResult.estimate.totalPrice).toBeGreaterThan(noStairsResult.estimate.totalPrice);
    });

    it('should apply long carry surcharge', () => {
      const shortCarryDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, longCarry: 25 },
          delivery: { ...baseEstimateDto.locations.delivery, longCarry: 25 },
        },
      };
      const longCarryDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, longCarry: 150 },
          delivery: { ...baseEstimateDto.locations.delivery, longCarry: 150 },
        },
      };

      const shortResult = service.calculateEstimate(shortCarryDto);
      const longResult = service.calculateEstimate(longCarryDto);

      expect(longResult.estimate.totalPrice).toBeGreaterThan(shortResult.estimate.totalPrice);
    });

    it('should handle difficult access scenarios', () => {
      const result = service.calculateEstimate(difficultAccessEstimateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      // Difficult access should result in higher price
      const easyAccessResult = service.calculateEstimate(baseEstimateDto);
      expect(result.estimate.totalPrice).toBeGreaterThan(easyAccessResult.estimate.totalPrice);
    });

    it('should apply parking distance surcharge', () => {
      const closeParkingDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, parkingDistance: 10 },
          delivery: { ...baseEstimateDto.locations.delivery, parkingDistance: 10 },
        },
      };
      const farParkingDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, parkingDistance: 150 },
          delivery: { ...baseEstimateDto.locations.delivery, parkingDistance: 150 },
        },
      };

      const closeResult = service.calculateEstimate(closeParkingDto);
      const farResult = service.calculateEstimate(farParkingDto);

      expect(farResult.estimate.totalPrice).toBeGreaterThan(closeResult.estimate.totalPrice);
    });

    it('should handle narrow hallways condition', () => {
      const noNarrowDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, narrowHallways: false },
          delivery: { ...baseEstimateDto.locations.delivery, narrowHallways: false },
        },
      };
      const withNarrowDto = {
        ...baseEstimateDto,
        locations: {
          pickup: { ...baseEstimateDto.locations.pickup, narrowHallways: true },
          delivery: { ...baseEstimateDto.locations.delivery, narrowHallways: true },
        },
      };

      const noNarrowResult = service.calculateEstimate(noNarrowDto);
      const withNarrowResult = service.calculateEstimate(withNarrowDto);

      expect(withNarrowResult.estimate.totalPrice).toBeGreaterThanOrEqual(noNarrowResult.estimate.totalPrice);
    });
  });

  describe('calculateEstimate - Additional Services', () => {
    it('should apply packing service fee', () => {
      const noPackingDto = {
        ...baseEstimateDto,
        services: { packing: false, assembly: false, storage: false },
      };
      const withPackingDto = {
        ...baseEstimateDto,
        services: { packing: true, assembly: false, storage: false },
      };

      const noPackingResult = service.calculateEstimate(noPackingDto);
      const withPackingResult = service.calculateEstimate(withPackingDto);

      expect(withPackingResult.estimate.totalPrice).toBeGreaterThan(noPackingResult.estimate.totalPrice);
    });

    it('should apply assembly service fee', () => {
      const noAssemblyDto = {
        ...baseEstimateDto,
        services: { packing: false, assembly: false, storage: false },
      };
      const withAssemblyDto = {
        ...baseEstimateDto,
        services: { packing: false, assembly: true, storage: false },
      };

      const noAssemblyResult = service.calculateEstimate(noAssemblyDto);
      const withAssemblyResult = service.calculateEstimate(withAssemblyDto);

      expect(withAssemblyResult.estimate.totalPrice).toBeGreaterThan(noAssemblyResult.estimate.totalPrice);
    });

    it('should apply storage service fee', () => {
      const noStorageDto = {
        ...baseEstimateDto,
        services: { packing: false, assembly: false, storage: false },
      };
      const withStorageDto = {
        ...baseEstimateDto,
        services: { packing: false, assembly: false, storage: true },
      };

      const noStorageResult = service.calculateEstimate(noStorageDto);
      const withStorageResult = service.calculateEstimate(withStorageDto);

      expect(withStorageResult.estimate.totalPrice).toBeGreaterThan(noStorageResult.estimate.totalPrice);
    });

    it('should apply multiple additional services', () => {
      const allServicesDto = {
        ...baseEstimateDto,
        services: { packing: true, assembly: true, storage: true },
      };

      const result = service.calculateEstimate(allServicesDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      // Should be significantly more expensive with all services
      const noServicesResult = service.calculateEstimate({
        ...baseEstimateDto,
        services: { packing: false, assembly: false, storage: false },
      });
      expect(result.estimate.totalPrice).toBeGreaterThan(noServicesResult.estimate.totalPrice);
    });
  });

  describe('calculateEstimate - Crew Size Impact', () => {
    it('should calculate based on crew size', () => {
      const twoCrewDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, crewSize: 2 },
      };
      const fourCrewDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, crewSize: 4 },
      };

      const twoCrewResult = service.calculateEstimate(twoCrewDto);
      const fourCrewResult = service.calculateEstimate(fourCrewDto);

      expect(twoCrewResult.estimate.totalPrice).toBeLessThan(fourCrewResult.estimate.totalPrice);
    });

    it('should handle single crew member edge case', () => {
      const singleCrewDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, crewSize: 1 },
      };

      const result = service.calculateEstimate(singleCrewDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
    });

    it('should handle large crew size', () => {
      const largeCrewDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, crewSize: 6 },
      };

      const result = service.calculateEstimate(largeCrewDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
    });
  });

  describe('calculateEstimate - Weight and Volume Calculations', () => {
    it('should scale price with weight', () => {
      const lightDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, weight: 1000 },
      };
      const heavyDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, weight: 10000 },
      };

      const lightResult = service.calculateEstimate(lightDto);
      const heavyResult = service.calculateEstimate(heavyDto);

      expect(heavyResult.estimate.totalPrice).toBeGreaterThan(lightResult.estimate.totalPrice);
    });

    it('should scale price with volume', () => {
      const smallVolumeDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, volume: 200 },
      };
      const largeVolumeDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, volume: 2000 },
      };

      const smallResult = service.calculateEstimate(smallVolumeDto);
      const largeResult = service.calculateEstimate(largeVolumeDto);

      expect(largeResult.estimate.totalPrice).toBeGreaterThan(smallResult.estimate.totalPrice);
    });

    it('should handle zero weight edge case', () => {
      const zeroWeightDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, weight: 0 },
      };

      const result = service.calculateEstimate(zeroWeightDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle zero volume edge case', () => {
      const zeroVolumeDto = {
        ...baseEstimateDto,
        inventory: { ...baseEstimateDto.inventory, volume: 0 },
      };

      const result = service.calculateEstimate(zeroVolumeDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Private Helper Methods', () => {
    it('should correctly identify weekends', () => {
      const saturday = new Date('2025-06-21'); // Saturday
      const sunday = new Date('2025-06-22'); // Sunday
      const monday = new Date('2025-06-23'); // Monday

      expect(service['isWeekend'](saturday)).toBe(true);
      expect(service['isWeekend'](sunday)).toBe(true);
      expect(service['isWeekend'](monday)).toBe(false);
    });

    it('should correctly determine seasonal period for peak season', () => {
      const june = new Date('2025-06-15');
      const july = new Date('2025-07-15');
      const august = new Date('2025-08-15');

      expect(service['getSeasonalPeriod'](june)).toBe('peak');
      expect(service['getSeasonalPeriod'](july)).toBe('peak');
      expect(service['getSeasonalPeriod'](august)).toBe('peak');
    });

    it('should correctly determine seasonal period for off-peak season', () => {
      const january = new Date('2025-01-15');
      const february = new Date('2025-02-15');
      const march = new Date('2025-03-15');

      expect(service['getSeasonalPeriod'](january)).toBe('standard');
      expect(service['getSeasonalPeriod'](february)).toBe('standard');
      expect(service['getSeasonalPeriod'](march)).toBe('standard');
    });

    it('should map difficulty level 1 to easy', () => {
      expect(service['mapDifficultyLevel'](1)).toBe('easy');
    });

    it('should map difficulty level 2 to moderate', () => {
      expect(service['mapDifficultyLevel'](2)).toBe('moderate');
    });

    it('should map difficulty level 3 to difficult', () => {
      expect(service['mapDifficultyLevel'](3)).toBe('difficult');
    });

    it('should map difficulty level 4+ to extreme', () => {
      expect(service['mapDifficultyLevel'](4)).toBe('extreme');
      expect(service['mapDifficultyLevel'](5)).toBe('extreme');
    });
  });

  describe('Deterministic Pricing Verification', () => {
    it('should produce identical results for identical inputs', () => {
      const result1 = service.calculateEstimate(baseEstimateDto);
      const result2 = service.calculateEstimate(baseEstimateDto);

      expect(result1.estimate.totalPrice).toBe(result2.estimate.totalPrice);
      expect(result1.estimate.basePrice).toBe(result2.estimate.basePrice);
    });

    it('should produce deterministic hash for verification', () => {
      const result1 = service.calculateEstimate(baseEstimateDto);
      const result2 = service.calculateEstimate(baseEstimateDto);

      expect(result1.estimate.metadata.verificationHash).toBe(result2.estimate.metadata.verificationHash);
    });

    it('should produce different results for different inputs', () => {
      const result1 = service.calculateEstimate(baseEstimateDto);
      const result2 = service.calculateEstimate(largeEstimateDto);

      expect(result1.estimate.totalPrice).not.toBe(result2.estimate.totalPrice);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle moves with all optional fields set to zero', () => {
      const dto = {
        ...minimalEstimateDto,
        inventory: {
          weight: 0,
          volume: 0,
          crewSize: 1,
          specialItems: {
            piano: 0,
            antiques: 0,
            artwork: 0,
            fragileItems: 0,
          },
        },
      };

      const result = service.calculateEstimate(dto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle past move dates', () => {
      const pastDateDto = {
        ...baseEstimateDto,
        moveDate: '2020-01-01',
      };

      const result = service.calculateEstimate(pastDateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle far future move dates', () => {
      const futureDateDto = {
        ...baseEstimateDto,
        moveDate: '2030-12-31',
      };

      const result = service.calculateEstimate(futureDateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle extreme weight values', () => {
      const extremeWeightDto = {
        ...baseEstimateDto,
        inventory: {
          ...baseEstimateDto.inventory,
          weight: 50000, // Very heavy
        },
      };

      const result = service.calculateEstimate(extremeWeightDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
    });

    it('should handle extreme volume values', () => {
      const extremeVolumeDto = {
        ...baseEstimateDto,
        inventory: {
          ...baseEstimateDto.inventory,
          volume: 10000, // Very large
        },
      };

      const result = service.calculateEstimate(extremeVolumeDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.estimate.totalPrice).toBeGreaterThan(0);
    });
  });
});
