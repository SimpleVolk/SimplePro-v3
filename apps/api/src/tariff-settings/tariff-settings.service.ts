import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TariffSettings,
  TariffSettingsDocument,
} from './schemas/tariff-settings.schema';
import {
  IHourlyRates,
  IPackingRates,
  IAutoPricing,
  IMaterial,
  IMoveSize,
  IRoomSize,
  IHandicap,
  IDistanceRate,
  IHourlyRate,
} from './interfaces/tariff-settings.interface';
import { CreateTariffSettingsDto } from './dto/create-tariff-settings.dto';
import { UpdateTariffSettingsDto } from './dto/update-tariff-settings.dto';
import { UpdateHourlyRatesDto } from './dto/update-hourly-rates.dto';
import { UpdatePackingRatesDto } from './dto/update-packing-rates.dto';
import { UpdateAutoPricingDto } from './dto/update-auto-pricing.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateHandicapDto } from './dto/create-handicap.dto';
import { UpdateHandicapDto } from './dto/update-handicap.dto';
import { CreateMoveSizeDto } from './dto/create-move-size.dto';
import { UpdateMoveSizeDto } from './dto/update-move-size.dto';
import { CreateRoomSizeDto } from './dto/create-room-size.dto';
import { UpdateRoomSizeDto } from './dto/update-room-size.dto';
import { CreateDistanceRateDto } from './dto/create-distance-rate.dto';
import { UpdateDistanceRateDto } from './dto/update-distance-rate.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TariffSettingsService {
  private readonly logger = new Logger(TariffSettingsService.name);
  private activeSettingsCache: TariffSettingsDocument | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel(TariffSettings.name)
    private tariffSettingsModel: Model<TariffSettingsDocument>,
  ) {}

  // ============================
  // Main CRUD Operations
  // ============================

  async findAll(query?: any): Promise<TariffSettingsDocument[]> {
    try {
      const filter: any = { isArchived: false };

      if (query) {
        if (query.isActive !== undefined) {
          filter.isActive = query.isActive === 'true' || query.isActive === true;
        }
        if (query.status) {
          filter.status = query.status;
        }
        if (query.search) {
          filter.$text = { $search: query.search };
        }
      }

      return await this.tariffSettingsModel.find(filter).sort({ createdAt: -1 }).exec();
    } catch (error) {
      this.logger.error('Error finding tariff settings', error);
      throw error;
    }
  }

  async findActive(): Promise<TariffSettingsDocument | null> {
    try {
      // Check cache first
      if (
        this.activeSettingsCache &&
        this.cacheTimestamp &&
        Date.now() - this.cacheTimestamp < this.CACHE_TTL
      ) {
        return this.activeSettingsCache;
      }

      const activeSetting = await this.tariffSettingsModel
        .findOne({
          isActive: true,
          isArchived: false,
        })
        .sort({ effectiveFrom: -1 })
        .exec();

      // Update cache
      this.activeSettingsCache = activeSetting;
      this.cacheTimestamp = Date.now();

      return activeSetting;
    } catch (error) {
      this.logger.error('Error finding active tariff settings', error);
      throw error;
    }
  }

  async findById(id: string): Promise<TariffSettingsDocument> {
    try {
      const settings = await this.tariffSettingsModel.findById(id).exec();
      if (!settings) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }
      return settings;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding tariff settings by ID ${id}`, error);
      throw error;
    }
  }

  async create(
    dto: CreateTariffSettingsDto,
    userId: string,
  ): Promise<TariffSettingsDocument> {
    try {
      // Check for duplicate name + version
      const existing = await this.tariffSettingsModel
        .findOne({
          name: dto.name,
          version: dto.version || '1.0.0',
        })
        .exec();

      if (existing) {
        throw new ConflictException(
          `Tariff settings with name "${dto.name}" and version "${dto.version || '1.0.0'}" already exists`,
        );
      }

      const tariffSettings = new this.tariffSettingsModel({
        ...dto,
        createdBy: userId,
        lastModifiedBy: userId,
      });

      const saved = await tariffSettings.save();
      this.logger.log(`Created new tariff settings: ${saved.name} (${saved.id})`);

      // Invalidate cache
      this.invalidateCache();

      return saved;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error creating tariff settings', error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateTariffSettingsDto,
    userId: string,
  ): Promise<TariffSettingsDocument> {
    try {
      const settings = await this.findById(id);

      // Check for name + version conflict if name or version is being changed
      if (dto.name || dto.version) {
        const existing = await this.tariffSettingsModel
          .findOne({
            _id: { $ne: id },
            name: dto.name || settings.name,
            version: dto.version || settings.version,
          })
          .exec();

        if (existing) {
          throw new ConflictException(
            `Tariff settings with name "${dto.name || settings.name}" and version "${dto.version || settings.version}" already exists`,
          );
        }
      }

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            ...dto,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated tariff settings: ${updated.name} (${id})`);

      // Invalidate cache
      this.invalidateCache();

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error updating tariff settings ${id}`, error);
      throw error;
    }
  }

  async activate(id: string): Promise<TariffSettingsDocument> {
    try {
      // Deactivate all other tariff settings
      await this.tariffSettingsModel
        .updateMany({ _id: { $ne: id } }, { isActive: false })
        .exec();

      // Activate the specified one
      const activated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            isActive: true,
            status: 'active',
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!activated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Activated tariff settings: ${activated.name} (${id})`);

      // Invalidate cache
      this.invalidateCache();

      return activated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error activating tariff settings ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const settings = await this.findById(id);

      if (settings.isActive) {
        throw new BadRequestException('Cannot delete active tariff settings');
      }

      await this.tariffSettingsModel.findByIdAndDelete(id).exec();

      this.logger.log(`Deleted tariff settings: ${settings.name} (${id})`);

      // Invalidate cache
      this.invalidateCache();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error deleting tariff settings ${id}`, error);
      throw error;
    }
  }

  async clone(
    id: string,
    newName: string,
    userId: string,
  ): Promise<TariffSettingsDocument> {
    try {
      const original = await this.findById(id);

      const cloned = new this.tariffSettingsModel({
        ...original.toObject(),
        _id: undefined,
        name: newName,
        isActive: false,
        status: 'draft',
        createdBy: userId,
        lastModifiedBy: userId,
        createdAt: undefined,
        updatedAt: undefined,
        auditLog: [],
      });

      const saved = await cloned.save();
      this.logger.log(`Cloned tariff settings: ${saved.name} (${saved.id}) from ${id}`);

      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error cloning tariff settings ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Hourly Rates Operations
  // ============================

  async getHourlyRates(id: string): Promise<IHourlyRates> {
    const settings = await this.findById(id);
    return settings.hourlyRates;
  }

  async updateHourlyRates(
    id: string,
    dto: UpdateHourlyRatesDto,
    userId: string,
  ): Promise<IHourlyRates> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            hourlyRates: dto,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated hourly rates for tariff settings ${id}`);
      this.invalidateCache();

      return updated.hourlyRates;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating hourly rates for ${id}`, error);
      throw error;
    }
  }

  async addHourlyRate(
    id: string,
    rate: IHourlyRate,
    userId: string,
  ): Promise<IHourlyRates> {
    try {
      const settings = await this.findById(id);

      // Check if rate for this crew size already exists
      const existingIndex = settings.hourlyRates.rates.findIndex(
        (r) => r.crewSize === rate.crewSize,
      );

      if (existingIndex !== -1) {
        throw new ConflictException(
          `Hourly rate for crew size ${rate.crewSize} already exists`,
        );
      }

      settings.hourlyRates.rates.push(rate);

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            'hourlyRates.rates': settings.hourlyRates.rates,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Added hourly rate for crew size ${rate.crewSize} to tariff ${id}`);
      this.invalidateCache();

      return updated.hourlyRates;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error adding hourly rate to ${id}`, error);
      throw error;
    }
  }

  async updateHourlyRate(
    id: string,
    crewSize: number,
    rate: Partial<IHourlyRate>,
    userId: string,
  ): Promise<IHourlyRates> {
    try {
      const settings = await this.findById(id);

      const rateIndex = settings.hourlyRates.rates.findIndex(
        (r) => r.crewSize === crewSize,
      );

      if (rateIndex === -1) {
        throw new NotFoundException(
          `Hourly rate for crew size ${crewSize} not found`,
        );
      }

      settings.hourlyRates.rates[rateIndex] = {
        ...settings.hourlyRates.rates[rateIndex],
        ...rate,
        crewSize, // Ensure crew size doesn't change
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            'hourlyRates.rates': settings.hourlyRates.rates,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated hourly rate for crew size ${crewSize} in tariff ${id}`);
      this.invalidateCache();

      return updated.hourlyRates;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating hourly rate in ${id}`, error);
      throw error;
    }
  }

  async deleteHourlyRate(
    id: string,
    crewSize: number,
    userId: string,
  ): Promise<IHourlyRates> {
    try {
      const settings = await this.findById(id);

      settings.hourlyRates.rates = settings.hourlyRates.rates.filter(
        (r) => r.crewSize !== crewSize,
      );

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            'hourlyRates.rates': settings.hourlyRates.rates,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Deleted hourly rate for crew size ${crewSize} from tariff ${id}`);
      this.invalidateCache();

      return updated.hourlyRates;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting hourly rate from ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Packing Rates Operations
  // ============================

  async getPackingRates(id: string): Promise<IPackingRates> {
    const settings = await this.findById(id);
    return settings.packingRates as IPackingRates;
  }

  async updatePackingRates(
    id: string,
    dto: UpdatePackingRatesDto,
    userId: string,
  ): Promise<IPackingRates> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            packingRates: dto,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated packing rates for tariff settings ${id}`);
      this.invalidateCache();

      return updated.packingRates as IPackingRates;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating packing rates for ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Auto-Pricing Operations
  // ============================

  async getAutoPricing(id: string): Promise<IAutoPricing> {
    const settings = await this.findById(id);
    return settings.autoPricing;
  }

  async updateAutoPricing(
    id: string,
    dto: UpdateAutoPricingDto,
    userId: string,
  ): Promise<IAutoPricing> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            autoPricing: dto,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated auto-pricing for tariff settings ${id}`);
      this.invalidateCache();

      return updated.autoPricing;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating auto-pricing for ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Materials Operations
  // ============================

  async getMaterials(id: string, query?: any): Promise<IMaterial[]> {
    const settings = await this.findById(id);
    let materials = settings.materials;

    if (query) {
      if (query.category) {
        materials = materials.filter((m) => m.category === query.category);
      }
      if (query.isActive !== undefined) {
        materials = materials.filter((m) => m.isActive === (query.isActive === 'true'));
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        materials = materials.filter(
          (m) =>
            m.name.toLowerCase().includes(searchLower) ||
            m.description?.toLowerCase().includes(searchLower),
        );
      }
    }

    return materials;
  }

  async getMaterial(id: string, materialId: string): Promise<IMaterial> {
    const settings = await this.findById(id);
    const material = settings.materials.find((m) => m.id === materialId);

    if (!material) {
      throw new NotFoundException(`Material with ID ${materialId} not found`);
    }

    return material;
  }

  async addMaterial(
    id: string,
    dto: CreateMaterialDto,
    userId: string,
  ): Promise<IMaterial> {
    try {
      // Validate tariff settings exists
      await this.findById(id);

      const newMaterial: IMaterial = {
        ...dto,
        id: randomUUID(),
        isActive: dto.isActive ?? true,
        inStock: dto.inStock ?? true,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $push: { materials: newMaterial },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Added material "${newMaterial.name}" to tariff ${id}`);
      this.invalidateCache();

      return newMaterial;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error adding material to ${id}`, error);
      throw error;
    }
  }

  async updateMaterial(
    id: string,
    materialId: string,
    dto: UpdateMaterialDto,
    userId: string,
  ): Promise<IMaterial> {
    try {
      const settings = await this.findById(id);

      const materialIndex = settings.materials.findIndex((m) => m.id === materialId);

      if (materialIndex === -1) {
        throw new NotFoundException(`Material with ID ${materialId} not found`);
      }

      settings.materials[materialIndex] = {
        ...settings.materials[materialIndex],
        ...dto,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            materials: settings.materials,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated material ${materialId} in tariff ${id}`);
      this.invalidateCache();

      return updated.materials.find((m) => m.id === materialId)!;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating material in ${id}`, error);
      throw error;
    }
  }

  async deleteMaterial(id: string, materialId: string, userId: string): Promise<void> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $pull: { materials: { id: materialId } },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Deleted material ${materialId} from tariff ${id}`);
      this.invalidateCache();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting material from ${id}`, error);
      throw error;
    }
  }

  async bulkImportMaterials(
    id: string,
    materials: CreateMaterialDto[],
    userId: string,
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    const result = { added: 0, failed: 0, errors: [] as string[] };

    for (const materialDto of materials) {
      try {
        await this.addMaterial(id, materialDto, userId);
        result.added++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Failed to add material "${materialDto.name}": ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk import to tariff ${id}: ${result.added} added, ${result.failed} failed`,
    );

    return result;
  }

  // ============================
  // Move Sizes Operations
  // ============================

  async getMoveSizes(id: string, query?: any): Promise<IMoveSize[]> {
    const settings = await this.findById(id);
    let moveSizes = settings.moveSizes;

    if (query?.isActive !== undefined) {
      moveSizes = moveSizes.filter((ms) => ms.isActive === (query.isActive === 'true'));
    }

    return moveSizes;
  }

  async getMoveSize(id: string, moveSizeId: string): Promise<IMoveSize> {
    const settings = await this.findById(id);
    const moveSize = settings.moveSizes.find((ms) => ms.id === moveSizeId);

    if (!moveSize) {
      throw new NotFoundException(`Move size with ID ${moveSizeId} not found`);
    }

    return moveSize;
  }

  async addMoveSize(
    id: string,
    dto: CreateMoveSizeDto,
    userId: string,
  ): Promise<IMoveSize> {
    try {
      const newMoveSize: IMoveSize = {
        ...dto,
        id: randomUUID(),
        isActive: dto.isActive ?? true,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $push: { moveSizes: newMoveSize },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Added move size "${newMoveSize.name}" to tariff ${id}`);
      this.invalidateCache();

      return newMoveSize;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error adding move size to ${id}`, error);
      throw error;
    }
  }

  async updateMoveSize(
    id: string,
    moveSizeId: string,
    dto: UpdateMoveSizeDto,
    userId: string,
  ): Promise<IMoveSize> {
    try {
      const settings = await this.findById(id);

      const moveSizeIndex = settings.moveSizes.findIndex((ms) => ms.id === moveSizeId);

      if (moveSizeIndex === -1) {
        throw new NotFoundException(`Move size with ID ${moveSizeId} not found`);
      }

      settings.moveSizes[moveSizeIndex] = {
        ...settings.moveSizes[moveSizeIndex],
        ...dto,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            moveSizes: settings.moveSizes,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated move size ${moveSizeId} in tariff ${id}`);
      this.invalidateCache();

      return updated.moveSizes.find((ms) => ms.id === moveSizeId)!;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating move size in ${id}`, error);
      throw error;
    }
  }

  async deleteMoveSize(id: string, moveSizeId: string, userId: string): Promise<void> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $pull: { moveSizes: { id: moveSizeId } },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Deleted move size ${moveSizeId} from tariff ${id}`);
      this.invalidateCache();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting move size from ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Room Sizes Operations
  // ============================

  async getRoomSizes(id: string, query?: any): Promise<IRoomSize[]> {
    const settings = await this.findById(id);
    let roomSizes = settings.roomSizes;

    if (query?.isActive !== undefined) {
      roomSizes = roomSizes.filter((rs) => rs.isActive === (query.isActive === 'true'));
    }

    return roomSizes;
  }

  async getRoomSize(id: string, roomSizeId: string): Promise<IRoomSize> {
    const settings = await this.findById(id);
    const roomSize = settings.roomSizes.find((rs) => rs.id === roomSizeId);

    if (!roomSize) {
      throw new NotFoundException(`Room size with ID ${roomSizeId} not found`);
    }

    return roomSize;
  }

  async addRoomSize(
    id: string,
    dto: CreateRoomSizeDto,
    userId: string,
  ): Promise<IRoomSize> {
    try {
      const newRoomSize: IRoomSize = {
        ...dto,
        id: randomUUID(),
        isActive: dto.isActive ?? true,
        commonItems: dto.commonItems ?? [],
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $push: { roomSizes: newRoomSize },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Added room size "${newRoomSize.name}" to tariff ${id}`);
      this.invalidateCache();

      return newRoomSize;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error adding room size to ${id}`, error);
      throw error;
    }
  }

  async updateRoomSize(
    id: string,
    roomSizeId: string,
    dto: UpdateRoomSizeDto,
    userId: string,
  ): Promise<IRoomSize> {
    try {
      const settings = await this.findById(id);

      const roomSizeIndex = settings.roomSizes.findIndex((rs) => rs.id === roomSizeId);

      if (roomSizeIndex === -1) {
        throw new NotFoundException(`Room size with ID ${roomSizeId} not found`);
      }

      settings.roomSizes[roomSizeIndex] = {
        ...settings.roomSizes[roomSizeIndex],
        ...dto,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            roomSizes: settings.roomSizes,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated room size ${roomSizeId} in tariff ${id}`);
      this.invalidateCache();

      return updated.roomSizes.find((rs) => rs.id === roomSizeId)!;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating room size in ${id}`, error);
      throw error;
    }
  }

  async deleteRoomSize(id: string, roomSizeId: string, userId: string): Promise<void> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $pull: { roomSizes: { id: roomSizeId } },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Deleted room size ${roomSizeId} from tariff ${id}`);
      this.invalidateCache();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting room size from ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Handicaps Operations
  // ============================

  async getHandicaps(id: string, query?: any): Promise<IHandicap[]> {
    const settings = await this.findById(id);
    let handicaps = settings.handicaps;

    if (query) {
      if (query.category) {
        handicaps = handicaps.filter((h) => h.category === query.category);
      }
      if (query.isActive !== undefined) {
        handicaps = handicaps.filter((h) => h.isActive === (query.isActive === 'true'));
      }
    }

    return handicaps;
  }

  async getHandicap(id: string, handicapId: string): Promise<IHandicap> {
    const settings = await this.findById(id);
    const handicap = settings.handicaps.find((h) => h.id === handicapId);

    if (!handicap) {
      throw new NotFoundException(`Handicap with ID ${handicapId} not found`);
    }

    return handicap;
  }

  async addHandicap(
    id: string,
    dto: CreateHandicapDto,
    userId: string,
  ): Promise<IHandicap> {
    try {
      const newHandicap: IHandicap = {
        ...dto,
        id: randomUUID(),
        isActive: dto.isActive ?? true,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $push: { handicaps: newHandicap },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Added handicap "${newHandicap.name}" to tariff ${id}`);
      this.invalidateCache();

      return newHandicap;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error adding handicap to ${id}`, error);
      throw error;
    }
  }

  async updateHandicap(
    id: string,
    handicapId: string,
    dto: UpdateHandicapDto,
    userId: string,
  ): Promise<IHandicap> {
    try {
      const settings = await this.findById(id);

      const handicapIndex = settings.handicaps.findIndex((h) => h.id === handicapId);

      if (handicapIndex === -1) {
        throw new NotFoundException(`Handicap with ID ${handicapId} not found`);
      }

      settings.handicaps[handicapIndex] = {
        ...settings.handicaps[handicapIndex],
        ...dto,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            handicaps: settings.handicaps,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated handicap ${handicapId} in tariff ${id}`);
      this.invalidateCache();

      return updated.handicaps.find((h) => h.id === handicapId)!;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating handicap in ${id}`, error);
      throw error;
    }
  }

  async deleteHandicap(id: string, handicapId: string, userId: string): Promise<void> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $pull: { handicaps: { id: handicapId } },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Deleted handicap ${handicapId} from tariff ${id}`);
      this.invalidateCache();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting handicap from ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Distance Rates Operations
  // ============================

  async getDistanceRates(id: string, query?: any): Promise<IDistanceRate[]> {
    const settings = await this.findById(id);
    let distanceRates = settings.distanceRates;

    if (query?.isActive !== undefined) {
      distanceRates = distanceRates.filter((dr) => dr.isActive === (query.isActive === 'true'));
    }

    return distanceRates;
  }

  async getDistanceRate(id: string, distanceRateId: string): Promise<IDistanceRate> {
    const settings = await this.findById(id);
    const distanceRate = settings.distanceRates.find((dr) => dr.id === distanceRateId);

    if (!distanceRate) {
      throw new NotFoundException(`Distance rate with ID ${distanceRateId} not found`);
    }

    return distanceRate;
  }

  async addDistanceRate(
    id: string,
    dto: CreateDistanceRateDto,
    userId: string,
  ): Promise<IDistanceRate> {
    try {
      const newDistanceRate: IDistanceRate = {
        ...dto,
        id: randomUUID(),
        isActive: dto.isActive ?? true,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $push: { distanceRates: newDistanceRate },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Added distance rate "${newDistanceRate.name}" to tariff ${id}`);
      this.invalidateCache();

      return newDistanceRate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error adding distance rate to ${id}`, error);
      throw error;
    }
  }

  async updateDistanceRate(
    id: string,
    distanceRateId: string,
    dto: UpdateDistanceRateDto,
    userId: string,
  ): Promise<IDistanceRate> {
    try {
      const settings = await this.findById(id);

      const distanceRateIndex = settings.distanceRates.findIndex((dr) => dr.id === distanceRateId);

      if (distanceRateIndex === -1) {
        throw new NotFoundException(`Distance rate with ID ${distanceRateId} not found`);
      }

      settings.distanceRates[distanceRateIndex] = {
        ...settings.distanceRates[distanceRateIndex],
        ...dto,
      };

      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            distanceRates: settings.distanceRates,
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Updated distance rate ${distanceRateId} in tariff ${id}`);
      this.invalidateCache();

      return updated.distanceRates.find((dr) => dr.id === distanceRateId)!;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating distance rate in ${id}`, error);
      throw error;
    }
  }

  async deleteDistanceRate(id: string, distanceRateId: string, userId: string): Promise<void> {
    try {
      const updated = await this.tariffSettingsModel
        .findByIdAndUpdate(
          id,
          {
            $pull: { distanceRates: { id: distanceRateId } },
            lastModifiedBy: userId,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tariff settings with ID ${id} not found`);
      }

      this.logger.log(`Deleted distance rate ${distanceRateId} from tariff ${id}`);
      this.invalidateCache();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting distance rate from ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Utility Methods
  // ============================

  async validate(id: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const settings = await this.findById(id);

      if (!settings) {
        errors.push('Tariff settings not found');
        return {
          valid: false,
          errors,
        };
      }

      // Validate hourly rates
      if (settings.hourlyRates?.enabled && settings.hourlyRates.rates.length === 0) {
        errors.push('Hourly rates are enabled but no rates are defined');
      }

      // Validate effective dates
      if (settings.effectiveTo && settings.effectiveFrom > settings.effectiveTo) {
        errors.push('Effective from date must be before effective to date');
      }

      // Validate pricing methods
      if (settings.pricingMethods?.length === 0) {
        errors.push('No pricing methods defined');
      }

      const defaultMethods = settings.pricingMethods?.filter((pm) => pm.isDefault) || [];
      if (defaultMethods.length === 0) {
        errors.push('No default pricing method set');
      }
      if (defaultMethods.length > 1) {
        errors.push('Multiple default pricing methods set');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
      return {
        valid: false,
        errors,
      };
    }
  }

  // ============================
  // Private Helper Methods
  // ============================

  private invalidateCache(): void {
    this.activeSettingsCache = null;
    this.cacheTimestamp = null;
  }
}