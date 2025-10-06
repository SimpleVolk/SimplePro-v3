import { Model } from 'mongoose';
import { TariffSettings } from '../schemas/tariff-settings.schema';
import {
  validateSeededTariff,
  getTariffStatistics,
} from './seed-tariff-settings';
import { defaultTariffData } from './default-tariff-data';
import { TariffStatus } from '../interfaces/tariff-settings.interface';

describe('Tariff Settings Seed', () => {
  let tariffModel: Model<TariffSettings>;
  let mockTariff: any;

  beforeEach(() => {
    // Create a mock tariff based on default data
    mockTariff = {
      ...defaultTariffData,
      _id: 'mock-id-12345',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };

    // Mock the Mongoose model
    tariffModel = {
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      deleteOne: jest.fn(),
      constructor: jest.fn().mockImplementation(() => mockTariff),
    } as any;

    // Make the model callable as a constructor
    (tariffModel as any) = jest.fn().mockImplementation(() => mockTariff);
    Object.assign(tariffModel, {
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      deleteOne: jest.fn(),
    });
  });

  describe('defaultTariffData', () => {
    it('should have correct metadata', () => {
      expect(defaultTariffData.name).toBe('Default Tariff Settings');
      expect(defaultTariffData.version).toBe('1.0.0');
      expect(defaultTariffData.status).toBe(TariffStatus.ACTIVE);
      expect(defaultTariffData.isActive).toBe(true);
      expect(defaultTariffData.isArchived).toBe(false);
    });

    it('should have hourly rates configured', () => {
      expect(defaultTariffData.hourlyRates.enabled).toBe(true);
      expect(defaultTariffData.hourlyRates.rates).toHaveLength(10);
      expect(defaultTariffData.hourlyRates.crewAbility).toHaveLength(10);
    });

    it('should have valid minimum hours', () => {
      const minHours = defaultTariffData.hourlyRates.minimumHours;
      expect(minHours.weekday).toBe(2);
      expect(minHours.weekend).toBe(3);
      expect(minHours.holiday).toBe(3);
    });

    it('should have hourly rates for all crew sizes', () => {
      const rates = defaultTariffData.hourlyRates.rates;
      for (let i = 1; i <= 10; i++) {
        const rate = rates.find((r) => r.crewSize === i);
        expect(rate).toBeDefined();
        expect(rate!.baseRate).toBeGreaterThan(0);
      }
    });

    it('should have crew abilities matching hourly rates', () => {
      const abilities = defaultTariffData.hourlyRates.crewAbility;
      expect(abilities).toHaveLength(
        defaultTariffData.hourlyRates.rates.length,
      );

      abilities.forEach((ability, index) => {
        expect(ability.crewSize).toBe(index + 1);
        expect(ability.maxCubicFeet).toBeGreaterThan(0);
        expect(ability.maxWeightLbs).toBeGreaterThan(0);
      });
    });

    it('should have packing rates configured', () => {
      expect(defaultTariffData.packingRates.enabled).toBe(true);
      expect(defaultTariffData.packingRates.rates).toHaveLength(5);
    });

    it('should have auto pricing configured', () => {
      const autoPricing = defaultTariffData.autoPricing;
      expect(autoPricing.enabled).toBe(true);
      expect(autoPricing.maxHoursPerJob).toBe(10);
      expect(autoPricing.weekendSurchargePercent).toBe(10);
      expect(autoPricing.holidaySurchargePercent).toBe(15);
    });

    it('should have materials configured', () => {
      expect(defaultTariffData.materials).toHaveLength(14);

      // Check material categories
      const boxes = defaultTariffData.materials.filter(
        (m) => m.category === 'box',
      );
      const packing = defaultTariffData.materials.filter(
        (m) => m.category === 'packing',
      );
      const protection = defaultTariffData.materials.filter(
        (m) => m.category === 'protection',
      );
      const specialty = defaultTariffData.materials.filter(
        (m) => m.category === 'specialty',
      );

      expect(boxes.length).toBeGreaterThan(0);
      expect(packing.length).toBeGreaterThan(0);
      expect(protection.length).toBeGreaterThan(0);
      expect(specialty.length).toBeGreaterThan(0);
    });

    it('should have all materials active', () => {
      const activeMaterials = defaultTariffData.materials.filter(
        (m) => m.isActive,
      );
      expect(activeMaterials).toHaveLength(defaultTariffData.materials.length);
    });

    it('should have move sizes configured', () => {
      expect(defaultTariffData.moveSizes).toHaveLength(21);

      // Check specific move sizes
      const roomOrLess = defaultTariffData.moveSizes.find(
        (ms) => ms.name === 'Room or Less',
      );
      expect(roomOrLess).toBeDefined();
      expect(roomOrLess!.maxCubicFeet).toBe(75);

      const sixBedroom = defaultTariffData.moveSizes.find(
        (ms) => ms.name === '6 Bedroom House',
      );
      expect(sixBedroom).toBeDefined();
      expect(sixBedroom!.recommendedCrewSize).toBe(6);
    });

    it('should have room sizes configured', () => {
      expect(defaultTariffData.roomSizes).toHaveLength(7);

      // Check specific rooms
      const bedroom = defaultTariffData.roomSizes.find(
        (rs) => rs.name === 'Bedroom',
      );
      expect(bedroom).toBeDefined();
      expect(bedroom!.cubicFeet).toBe(153);
      expect(bedroom!.weightLbs).toBe(750);

      const office = defaultTariffData.roomSizes.find(
        (rs) => rs.name === 'Office',
      );
      expect(office).toBeDefined();
      expect(office!.cubicFeet).toBe(75);
    });

    it('should have handicaps configured', () => {
      expect(defaultTariffData.handicaps).toHaveLength(3);

      // Check specific handicaps
      const stairs = defaultTariffData.handicaps.find(
        (h) => h.name === 'Per Flight',
      );
      expect(stairs).toBeDefined();
      expect(stairs!.category).toBe('stairs');
      expect(stairs!.value).toBe(9);

      const elevator = defaultTariffData.handicaps.find(
        (h) => h.name === 'Standard Elevator',
      );
      expect(elevator).toBeDefined();
      expect(elevator!.value).toBe(18);
    });

    it('should have distance rates configured', () => {
      expect(defaultTariffData.distanceRates).toHaveLength(4);

      // Check distance tiers
      const local = defaultTariffData.distanceRates.find(
        (dr) => dr.minMiles === 0,
      );
      expect(local).toBeDefined();
      expect(local!.maxMiles).toBe(50);

      const crossCountry = defaultTariffData.distanceRates.find(
        (dr) => dr.minMiles === 501,
      );
      expect(crossCountry).toBeDefined();
      expect(crossCountry!.ratePerMile).toBe(1.75);
    });

    it('should have pricing methods configured', () => {
      expect(defaultTariffData.pricingMethods).toHaveLength(5);

      // Check for default method
      const defaultMethod = defaultTariffData.pricingMethods.find(
        (pm) => pm.isDefault,
      );
      expect(defaultMethod).toBeDefined();
      expect(defaultMethod!.enabled).toBe(true);

      // Count enabled methods
      const enabledMethods = defaultTariffData.pricingMethods.filter(
        (pm) => pm.enabled,
      );
      expect(enabledMethods.length).toBeGreaterThan(0);
    });

    it('should have audit log entry', () => {
      expect(defaultTariffData.auditLog).toHaveLength(1);
      expect(defaultTariffData.auditLog[0].action).toBe('INITIAL_SEED');
      expect(defaultTariffData.auditLog[0].userId).toBe('system');
    });
  });

  describe('validateSeededTariff', () => {
    it('should validate correct tariff data', () => {
      const isValid = validateSeededTariff(mockTariff as TariffSettings);
      expect(isValid).toBe(true);
    });

    it('should detect missing hourly rates', () => {
      const invalidTariff = {
        ...mockTariff,
        hourlyRates: { ...mockTariff.hourlyRates, rates: [] },
      };
      const isValid = validateSeededTariff(invalidTariff as TariffSettings);
      expect(isValid).toBe(false);
    });

    it('should detect crew ability mismatch', () => {
      const invalidTariff = {
        ...mockTariff,
        hourlyRates: {
          ...mockTariff.hourlyRates,
          crewAbility: mockTariff.hourlyRates.crewAbility.slice(0, 5), // Only 5 instead of 10
        },
      };
      const isValid = validateSeededTariff(invalidTariff as TariffSettings);
      expect(isValid).toBe(false);
    });

    it('should detect missing materials', () => {
      const invalidTariff = { ...mockTariff, materials: [] };
      const isValid = validateSeededTariff(invalidTariff as TariffSettings);
      expect(isValid).toBe(false);
    });

    it('should detect missing default pricing method', () => {
      const invalidTariff = {
        ...mockTariff,
        pricingMethods: mockTariff.pricingMethods.map((pm: any) => ({
          ...pm,
          isDefault: false,
        })),
      };
      const isValid = validateSeededTariff(invalidTariff as TariffSettings);
      expect(isValid).toBe(false);
    });
  });

  describe('getTariffStatistics', () => {
    it('should return complete statistics', () => {
      const stats = getTariffStatistics(mockTariff as TariffSettings);

      expect(stats.metadata).toBeDefined();
      expect(stats.metadata.name).toBe('Default Tariff Settings');
      expect(stats.metadata.version).toBe('1.0.0');

      expect(stats.counts).toBeDefined();
      expect(stats.counts.hourlyRates).toBe(10);
      expect(stats.counts.materials.total).toBe(14);
      expect(stats.counts.moveSizes.total).toBe(21);
      expect(stats.counts.roomSizes.total).toBe(7);
      expect(stats.counts.handicaps.total).toBe(3);
      expect(stats.counts.distanceRates.total).toBe(4);
      expect(stats.counts.pricingMethods.total).toBe(5);

      expect(stats.pricing).toBeDefined();
      expect(stats.pricing.hourlyRatesEnabled).toBe(true);
      expect(stats.pricing.autoPricingEnabled).toBe(true);
    });

    it('should count active items correctly', () => {
      const stats = getTariffStatistics(mockTariff as TariffSettings);

      expect(stats.counts.materials.active).toBe(14);
      expect(stats.counts.moveSizes.active).toBe(21);
      expect(stats.counts.roomSizes.active).toBe(7);
      expect(stats.counts.handicaps.active).toBe(3);
      expect(stats.counts.distanceRates.active).toBe(4);
    });

    it('should count materials by category', () => {
      const stats = getTariffStatistics(mockTariff as TariffSettings);

      expect(stats.counts.materials.byCategory).toBeDefined();
      expect(stats.counts.materials.byCategory.box).toBeGreaterThan(0);
      expect(stats.counts.materials.byCategory.packing).toBeGreaterThan(0);
      expect(stats.counts.materials.byCategory.protection).toBeGreaterThan(0);
      expect(stats.counts.materials.byCategory.specialty).toBeGreaterThan(0);
    });

    it('should count handicaps by category', () => {
      const stats = getTariffStatistics(mockTariff as TariffSettings);

      expect(stats.counts.handicaps.byCategory).toBeDefined();
      expect(stats.counts.handicaps.byCategory.stairs).toBe(1);
      expect(stats.counts.handicaps.byCategory.elevator).toBe(1);
      expect(stats.counts.handicaps.byCategory.access).toBe(1);
    });
  });

  describe('Data Integrity', () => {
    it('should have unique IDs for all materials', () => {
      const ids = defaultTariffData.materials.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs for all move sizes', () => {
      const ids = defaultTariffData.moveSizes.map((ms) => ms.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs for all room sizes', () => {
      const ids = defaultTariffData.roomSizes.map((rs) => rs.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs for all handicaps', () => {
      const ids = defaultTariffData.handicaps.map((h) => h.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have non-negative rates', () => {
      defaultTariffData.hourlyRates.rates.forEach((rate) => {
        expect(rate.baseRate).toBeGreaterThanOrEqual(0);
        if (rate.weekendRate !== undefined) {
          expect(rate.weekendRate).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should have valid crew sizes', () => {
      defaultTariffData.hourlyRates.rates.forEach((rate) => {
        expect(rate.crewSize).toBeGreaterThanOrEqual(1);
        expect(rate.crewSize).toBeLessThanOrEqual(10);
      });
    });

    it('should have valid move size ranges', () => {
      defaultTariffData.moveSizes.forEach((ms) => {
        expect(ms.minCubicFeet).toBeGreaterThanOrEqual(0);
        expect(ms.maxCubicFeet).toBeGreaterThan(ms.minCubicFeet);
        expect(ms.minWeightLbs).toBeGreaterThanOrEqual(0);
        expect(ms.maxWeightLbs).toBeGreaterThan(ms.minWeightLbs);
        expect(ms.recommendedCrewSize).toBeGreaterThanOrEqual(1);
        expect(ms.estimatedHours).toBeGreaterThan(0);
      });
    });

    it('should have valid handicap percentages', () => {
      defaultTariffData.handicaps.forEach((h) => {
        expect(h.value).toBeGreaterThan(0);
        expect(h.value).toBeLessThanOrEqual(100);
      });
    });
  });
});
