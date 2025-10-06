import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TariffSettingsService } from './tariff-settings.service';
import { TariffSettings } from './schemas/tariff-settings.schema';
import {
  baseTariffSettings,
  tariffWithMaterials,
  tariffWithMoveSizes,
  tariffWithHandicaps,
  tariffWithDistanceRates,
  createMockTariffSettings,
  materialDtos,
  handicapDtos,
  moveSizeDtos,
  validationTestCases,
} from '../../test/fixtures/tariff-settings.fixture';
import {
  createMockModel,
  createMockQueryChain,
} from '../../test/mocks/model.factory';
import { generateObjectId } from '../../test/utils/test-helpers';

describe('TariffSettingsService', () => {
  let service: TariffSettingsService;
  let tariffSettingsModel: any;

  const userId = generateObjectId();
  const tariffId = generateObjectId();

  beforeEach(async () => {
    tariffSettingsModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TariffSettingsService,
        {
          provide: getModelToken(TariffSettings.name),
          useValue: tariffSettingsModel,
        },
      ],
    }).compile();

    service = module.get<TariffSettingsService>(TariffSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all tariff settings', async () => {
      const mockTariffs = [
        createMockTariffSettings(),
        createMockTariffSettings(),
      ];
      tariffSettingsModel.find.mockReturnValue(
        createMockQueryChain(mockTariffs),
      );

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(tariffSettingsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isArchived: false,
        }),
      );
    });

    it('should filter by active status', async () => {
      tariffSettingsModel.find.mockReturnValue(createMockQueryChain([]));

      await service.findAll({ isActive: true });

      expect(tariffSettingsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });

    it('should filter by status', async () => {
      tariffSettingsModel.find.mockReturnValue(createMockQueryChain([]));

      await service.findAll({ status: 'active' });

      expect(tariffSettingsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        }),
      );
    });

    it('should search by text', async () => {
      tariffSettingsModel.find.mockReturnValue(createMockQueryChain([]));

      await service.findAll({ search: 'standard' });

      expect(tariffSettingsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $text: { $search: 'standard' },
        }),
      );
    });
  });

  describe('findActive', () => {
    it('should return active tariff settings', async () => {
      const mockActive = createMockTariffSettings({ isActive: true });
      tariffSettingsModel.findOne.mockReturnValue(
        createMockQueryChain(mockActive),
      );

      const result = await service.findActive();

      expect(result).toBeDefined();
      expect(result.isActive).toBe(true);
    });

    it('should use cache for repeated calls', async () => {
      const mockActive = createMockTariffSettings({ isActive: true });
      tariffSettingsModel.findOne.mockReturnValue(
        createMockQueryChain(mockActive),
      );

      await service.findActive();
      await service.findActive();

      // Should only call DB once due to caching
      expect(tariffSettingsModel.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when no active settings', async () => {
      tariffSettingsModel.findOne.mockReturnValue(createMockQueryChain(null));

      const result = await service.findActive();

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return tariff by ID', async () => {
      const mockTariff = createMockTariffSettings({ _id: tariffId });
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.findById(tariffId);

      expect(result).toBeDefined();
      expect(result._id).toBe(tariffId);
    });

    it('should throw NotFoundException when not found', async () => {
      tariffSettingsModel.findById.mockReturnValue(createMockQueryChain(null));

      await expect(service.findById(tariffId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create new tariff settings', async () => {
      tariffSettingsModel.findOne.mockResolvedValue(null);

      const result = await service.create(baseTariffSettings, userId);

      expect(result).toBeDefined();
    });

    it('should throw ConflictException for duplicate name+version', async () => {
      tariffSettingsModel.findOne.mockResolvedValue(createMockTariffSettings());

      await expect(service.create(baseTariffSettings, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should invalidate cache after creation', async () => {
      tariffSettingsModel.findOne.mockResolvedValue(null);

      await service.create(baseTariffSettings, userId);

      // Cache should be cleared
      expect(service['activeSettingsCache']).toBeNull();
    });
  });

  describe('update', () => {
    it('should update tariff settings', async () => {
      const mockExisting = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockExisting),
      );
      tariffSettingsModel.findOne.mockResolvedValue(null);
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain({
          ...mockExisting,
          description: 'Updated',
        }),
      );

      const result = await service.update(
        tariffId,
        { description: 'Updated' },
        userId,
      );

      expect(result.description).toBe('Updated');
    });

    it('should check for name+version conflicts', async () => {
      const mockExisting = createMockTariffSettings({ name: 'Old Name' });
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockExisting),
      );
      tariffSettingsModel.findOne.mockResolvedValue(
        createMockTariffSettings({ name: 'New Name' }),
      );

      await expect(
        service.update(tariffId, { name: 'New Name' }, userId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activate', () => {
    it('should activate tariff and deactivate others', async () => {
      const mockActivated = createMockTariffSettings({
        isActive: true,
        status: 'active',
      });
      tariffSettingsModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockActivated),
      );

      const result = await service.activate(tariffId);

      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');
      expect(tariffSettingsModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $ne: tariffId } }),
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('delete', () => {
    it('should delete inactive tariff', async () => {
      const mockInactive = createMockTariffSettings({ isActive: false });
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockInactive),
      );
      tariffSettingsModel.findByIdAndDelete.mockResolvedValue(mockInactive);

      await service.delete(tariffId);

      expect(tariffSettingsModel.findByIdAndDelete).toHaveBeenCalledWith(
        tariffId,
      );
    });

    it('should not delete active tariff', async () => {
      const mockActive = createMockTariffSettings({ isActive: true });
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockActive),
      );

      await expect(service.delete(tariffId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('clone', () => {
    it('should clone tariff settings with new name', async () => {
      const mockOriginal = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockOriginal),
      );

      const result = await service.clone(tariffId, 'Cloned Tariff', userId);

      expect(result.name).toBe('Cloned Tariff');
      expect(result.isActive).toBe(false);
      expect(result.status).toBe('draft');
    });
  });

  describe('Hourly Rates Operations', () => {
    it('should get hourly rates', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.getHourlyRates(tariffId);

      expect(result).toBeDefined();
      expect(result.rates).toBeDefined();
    });

    it('should update hourly rates', async () => {
      const newRates = {
        enabled: true,
        baseHourlyRate: 150,
        rates: [{ crewSize: 2, hourlyRate: 150, minimumHours: 3 }],
      };
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain({
          ...createMockTariffSettings(),
          hourlyRates: newRates,
        }),
      );

      const result = await service.updateHourlyRates(
        tariffId,
        newRates,
        userId,
      );

      expect(result.baseHourlyRate).toBe(150);
    });

    it('should add new hourly rate', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const newRate = { crewSize: 5, hourlyRate: 300, minimumHours: 4 };
      const result = await service.addHourlyRate(tariffId, newRate, userId);

      expect(result.rates).toContainEqual(
        expect.objectContaining({ crewSize: 5 }),
      );
    });

    it('should throw ConflictException for duplicate crew size', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const duplicateRate = { crewSize: 2, hourlyRate: 150, minimumHours: 2 };
      await expect(
        service.addHourlyRate(tariffId, duplicateRate, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should update existing hourly rate', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.updateHourlyRate(
        tariffId,
        2,
        { hourlyRate: 140 },
        userId,
      );

      expect(result).toBeDefined();
    });

    it('should delete hourly rate', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.deleteHourlyRate(tariffId, 2, userId);

      expect(result).toBeDefined();
    });
  });

  describe('Materials Operations', () => {
    it('should get all materials', async () => {
      const mockTariff = createMockTariffSettings(tariffWithMaterials);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.getMaterials(tariffId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter materials by category', async () => {
      const mockTariff = createMockTariffSettings(tariffWithMaterials);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.getMaterials(tariffId, {
        category: 'boxes',
      });

      expect(result.every((m) => m.category === 'boxes')).toBe(true);
    });

    it('should add new material', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.addMaterial(
        tariffId,
        materialDtos.smallBox,
        userId,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Small Box');
    });

    it('should update material', async () => {
      const mockTariff = createMockTariffSettings(tariffWithMaterials);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const materialId = mockTariff.materials[0].id;
      const result = await service.updateMaterial(
        tariffId,
        materialId,
        { price: 4.0 },
        userId,
      );

      expect(result).toBeDefined();
    });

    it('should delete material', async () => {
      const mockTariff = createMockTariffSettings(tariffWithMaterials);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const materialId = mockTariff.materials[0].id;
      await service.deleteMaterial(tariffId, materialId, userId);

      expect(tariffSettingsModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('Handicaps Operations', () => {
    it('should get all handicaps', async () => {
      const mockTariff = createMockTariffSettings(tariffWithHandicaps);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.getHandicaps(tariffId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should add new handicap', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.addHandicap(
        tariffId,
        handicapDtos.stairs,
        userId,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Stairs (per flight)');
    });
  });

  describe('Move Sizes Operations', () => {
    it('should get all move sizes', async () => {
      const mockTariff = createMockTariffSettings(tariffWithMoveSizes);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.getMoveSizes(tariffId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should add new move size', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.addMoveSize(
        tariffId,
        moveSizeDtos.studio,
        userId,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Studio');
    });
  });

  describe('Distance Rates Operations', () => {
    it('should get all distance rates', async () => {
      const mockTariff = createMockTariffSettings(tariffWithDistanceRates);
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.getDistanceRates(tariffId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate tariff settings successfully', async () => {
      const mockTariff = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.validate(tariffId);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid date range', async () => {
      const mockTariff = createMockTariffSettings(
        validationTestCases.invalidDateRange,
      );
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.validate(tariffId);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Effective from date must be before effective to date',
      );
    });

    it('should detect missing default pricing method', async () => {
      const mockTariff = createMockTariffSettings(
        validationTestCases.missingDefaultPricingMethod,
      );
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.validate(tariffId);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No default pricing method set');
    });

    it('should detect empty hourly rates', async () => {
      const mockTariff = createMockTariffSettings(
        validationTestCases.emptyHourlyRates,
      );
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockTariff),
      );

      const result = await service.validate(tariffId);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Hourly rates are enabled but no rates are defined',
      );
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache on create', async () => {
      tariffSettingsModel.findOne.mockResolvedValue(null);
      service['activeSettingsCache'] = createMockTariffSettings() as any;

      await service.create(baseTariffSettings, userId);

      expect(service['activeSettingsCache']).toBeNull();
    });

    it('should invalidate cache on update', async () => {
      const mockExisting = createMockTariffSettings();
      tariffSettingsModel.findById.mockReturnValue(
        createMockQueryChain(mockExisting),
      );
      tariffSettingsModel.findOne.mockResolvedValue(null);
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(mockExisting),
      );
      service['activeSettingsCache'] = createMockTariffSettings() as any;

      await service.update(tariffId, { description: 'Updated' }, userId);

      expect(service['activeSettingsCache']).toBeNull();
    });

    it('should invalidate cache on activate', async () => {
      tariffSettingsModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      tariffSettingsModel.findByIdAndUpdate.mockReturnValue(
        createMockQueryChain(createMockTariffSettings()),
      );
      service['activeSettingsCache'] = createMockTariffSettings() as any;

      await service.activate(tariffId);

      expect(service['activeSettingsCache']).toBeNull();
    });
  });
});
