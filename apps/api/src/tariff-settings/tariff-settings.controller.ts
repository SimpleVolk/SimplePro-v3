import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TariffSettingsService } from './tariff-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../auth/interfaces/user.interface';
import type { CreateTariffSettingsDto } from './dto/create-tariff-settings.dto';
import type { UpdateTariffSettingsDto } from './dto/update-tariff-settings.dto';
import type { UpdateHourlyRatesDto } from './dto/update-hourly-rates.dto';
import type { UpdatePackingRatesDto } from './dto/update-packing-rates.dto';
import type { UpdateAutoPricingDto } from './dto/update-auto-pricing.dto';
import type { CreateMaterialDto } from './dto/create-material.dto';
import type { UpdateMaterialDto } from './dto/update-material.dto';
import type { CreateHandicapDto } from './dto/create-handicap.dto';
import type { UpdateHandicapDto } from './dto/update-handicap.dto';
import type { CreateMoveSizeDto } from './dto/create-move-size.dto';
import type { UpdateMoveSizeDto } from './dto/update-move-size.dto';
import type { CreateRoomSizeDto } from './dto/create-room-size.dto';
import type { UpdateRoomSizeDto } from './dto/update-room-size.dto';
import type { CreateDistanceRateDto } from './dto/create-distance-rate.dto';
import type { UpdateDistanceRateDto } from './dto/update-distance-rate.dto';
import type { HourlyRateDto } from './dto/create-tariff-settings.dto';

/**
 * TariffSettings Controller
 * Manages all pricing and tariff configuration for the moving company
 */
@Controller('tariff-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TariffSettingsController {
  private readonly logger = new Logger(TariffSettingsController.name);

  constructor(private readonly tariffSettingsService: TariffSettingsService) {}

  // ============================
  // Main CRUD Operations
  // ============================

  @Get()
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(@Query() query: any) {
    try {
      const tariffSettings = await this.tariffSettingsService.findAll(query);

      return {
        success: true,
        data: tariffSettings,
        count: tariffSettings.length,
      };
    } catch (error) {
      this.logger.error('Error in findAll', error);
      throw error;
    }
  }

  @Get('active')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getActive() {
    try {
      const activeTariff = await this.tariffSettingsService.findActive();

      return {
        success: true,
        data: activeTariff,
      };
    } catch (error) {
      this.logger.error('Error in getActive', error);
      throw error;
    }
  }

  @Get(':id')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string) {
    try {
      const tariffSettings = await this.tariffSettingsService.findById(id);

      return {
        success: true,
        data: tariffSettings,
      };
    } catch (error) {
      this.logger.error(`Error in findOne for ID ${id}`, error);
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'create' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async create(@Body() dto: CreateTariffSettingsDto, @CurrentUser() user: User) {
    try {
      const tariffSettings = await this.tariffSettingsService.create(dto, user.id);

      return {
        success: true,
        data: tariffSettings,
        message: 'Tariff settings created successfully',
      };
    } catch (error) {
      this.logger.error('Error in create', error);
      throw error;
    }
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTariffSettingsDto,
    @CurrentUser() user: User,
  ) {
    try {
      const tariffSettings = await this.tariffSettingsService.update(id, dto, user.id);

      return {
        success: true,
        data: tariffSettings,
        message: 'Tariff settings updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in update for ID ${id}`, error);
      throw error;
    }
  }

  @Put(':id/activate')
  @RequirePermissions({ resource: 'tariff_settings', action: 'activate' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async activate(@Param('id') id: string) {
    try {
      const tariffSettings = await this.tariffSettingsService.activate(id);

      return {
        success: true,
        data: tariffSettings,
        message: 'Tariff settings activated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in activate for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'delete' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async delete(@Param('id') id: string) {
    try {
      await this.tariffSettingsService.delete(id);
    } catch (error) {
      this.logger.error(`Error in delete for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'create' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async clone(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: User,
  ) {
    try {
      if (!body.name) {
        throw new BadRequestException('Name is required for cloning');
      }

      const cloned = await this.tariffSettingsService.clone(id, body.name, user.id);

      return {
        success: true,
        data: cloned,
        message: 'Tariff settings cloned successfully',
      };
    } catch (error) {
      this.logger.error(`Error in clone for ID ${id}`, error);
      throw error;
    }
  }

  @Get(':id/validate')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async validate(@Param('id') id: string) {
    try {
      const validation = await this.tariffSettingsService.validate(id);

      return {
        success: true,
        data: validation,
      };
    } catch (error) {
      this.logger.error(`Error in validate for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Hourly Rates Endpoints
  // ============================

  @Get(':id/hourly-rates')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getHourlyRates(@Param('id') id: string) {
    try {
      const hourlyRates = await this.tariffSettingsService.getHourlyRates(id);

      return {
        success: true,
        data: hourlyRates,
      };
    } catch (error) {
      this.logger.error(`Error in getHourlyRates for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/hourly-rates')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateHourlyRates(
    @Param('id') id: string,
    @Body() dto: UpdateHourlyRatesDto,
    @CurrentUser() user: User,
  ) {
    try {
      const hourlyRates = await this.tariffSettingsService.updateHourlyRates(
        id,
        dto,
        user.id,
      );

      return {
        success: true,
        data: hourlyRates,
        message: 'Hourly rates updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateHourlyRates for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/hourly-rates/rates')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addHourlyRate(
    @Param('id') id: string,
    @Body() rate: HourlyRateDto,
    @CurrentUser() user: User,
  ) {
    try {
      const hourlyRates = await this.tariffSettingsService.addHourlyRate(
        id,
        rate,
        user.id,
      );

      return {
        success: true,
        data: hourlyRates,
        message: 'Hourly rate added successfully',
      };
    } catch (error) {
      this.logger.error(`Error in addHourlyRate for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/hourly-rates/rates/:crewSize')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateHourlyRate(
    @Param('id') id: string,
    @Param('crewSize') crewSize: string,
    @Body() rate: Partial<HourlyRateDto>,
    @CurrentUser() user: User,
  ) {
    try {
      const crewSizeNum = parseInt(crewSize, 10);
      if (isNaN(crewSizeNum)) {
        throw new BadRequestException('Invalid crew size');
      }

      const hourlyRates = await this.tariffSettingsService.updateHourlyRate(
        id,
        crewSizeNum,
        rate,
        user.id,
      );

      return {
        success: true,
        data: hourlyRates,
        message: 'Hourly rate updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateHourlyRate for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/hourly-rates/rates/:crewSize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteHourlyRate(
    @Param('id') id: string,
    @Param('crewSize') crewSize: string,
    @CurrentUser() user: User,
  ) {
    try {
      const crewSizeNum = parseInt(crewSize, 10);
      if (isNaN(crewSizeNum)) {
        throw new BadRequestException('Invalid crew size');
      }

      await this.tariffSettingsService.deleteHourlyRate(id, crewSizeNum, user.id);
    } catch (error) {
      this.logger.error(`Error in deleteHourlyRate for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Packing Rates Endpoints
  // ============================

  @Get(':id/packing-rates')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getPackingRates(@Param('id') id: string) {
    try {
      const packingRates = await this.tariffSettingsService.getPackingRates(id);

      return {
        success: true,
        data: packingRates,
      };
    } catch (error) {
      this.logger.error(`Error in getPackingRates for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/packing-rates')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updatePackingRates(
    @Param('id') id: string,
    @Body() dto: UpdatePackingRatesDto,
    @CurrentUser() user: User,
  ) {
    try {
      const packingRates = await this.tariffSettingsService.updatePackingRates(
        id,
        dto,
        user.id,
      );

      return {
        success: true,
        data: packingRates,
        message: 'Packing rates updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updatePackingRates for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Auto-Pricing Endpoints
  // ============================

  @Get(':id/auto-pricing')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getAutoPricing(@Param('id') id: string) {
    try {
      const autoPricing = await this.tariffSettingsService.getAutoPricing(id);

      return {
        success: true,
        data: autoPricing,
      };
    } catch (error) {
      this.logger.error(`Error in getAutoPricing for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/auto-pricing')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateAutoPricing(
    @Param('id') id: string,
    @Body() dto: UpdateAutoPricingDto,
    @CurrentUser() user: User,
  ) {
    try {
      const autoPricing = await this.tariffSettingsService.updateAutoPricing(
        id,
        dto,
        user.id,
      );

      return {
        success: true,
        data: autoPricing,
        message: 'Auto-pricing settings updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateAutoPricing for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Materials Endpoints
  // ============================

  @Get(':id/materials')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getMaterials(@Param('id') id: string, @Query() query: any) {
    try {
      const materials = await this.tariffSettingsService.getMaterials(id, query);

      return {
        success: true,
        data: materials,
        count: materials.length,
      };
    } catch (error) {
      this.logger.error(`Error in getMaterials for ID ${id}`, error);
      throw error;
    }
  }

  @Get(':id/materials/:materialId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getMaterial(@Param('id') id: string, @Param('materialId') materialId: string) {
    try {
      const material = await this.tariffSettingsService.getMaterial(id, materialId);

      return {
        success: true,
        data: material,
      };
    } catch (error) {
      this.logger.error(`Error in getMaterial for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/materials')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addMaterial(
    @Param('id') id: string,
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: User,
  ) {
    try {
      const material = await this.tariffSettingsService.addMaterial(id, dto, user.id);

      return {
        success: true,
        data: material,
        message: 'Material added successfully',
      };
    } catch (error) {
      this.logger.error(`Error in addMaterial for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/materials/:materialId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() user: User,
  ) {
    try {
      const material = await this.tariffSettingsService.updateMaterial(
        id,
        materialId,
        dto,
        user.id,
      );

      return {
        success: true,
        data: material,
        message: 'Material updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateMaterial for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/materials/:materialId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.tariffSettingsService.deleteMaterial(id, materialId, user.id);
    } catch (error) {
      this.logger.error(`Error in deleteMaterial for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/materials/bulk-import')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkImportMaterials(
    @Param('id') id: string,
    @Body() body: { materials: CreateMaterialDto[] },
    @CurrentUser() user: User,
  ) {
    try {
      if (!body.materials || !Array.isArray(body.materials)) {
        throw new BadRequestException('Materials array is required');
      }

      const result = await this.tariffSettingsService.bulkImportMaterials(
        id,
        body.materials,
        user.id,
      );

      return {
        success: true,
        data: result,
        message: `Bulk import completed: ${result.added} added, ${result.failed} failed`,
      };
    } catch (error) {
      this.logger.error(`Error in bulkImportMaterials for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Move Sizes Endpoints
  // ============================

  @Get(':id/move-sizes')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getMoveSizes(@Param('id') id: string, @Query() query: any) {
    try {
      const moveSizes = await this.tariffSettingsService.getMoveSizes(id, query);

      return {
        success: true,
        data: moveSizes,
        count: moveSizes.length,
      };
    } catch (error) {
      this.logger.error(`Error in getMoveSizes for ID ${id}`, error);
      throw error;
    }
  }

  @Get(':id/move-sizes/:moveSizeId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getMoveSize(@Param('id') id: string, @Param('moveSizeId') moveSizeId: string) {
    try {
      const moveSize = await this.tariffSettingsService.getMoveSize(id, moveSizeId);

      return {
        success: true,
        data: moveSize,
      };
    } catch (error) {
      this.logger.error(`Error in getMoveSize for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/move-sizes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addMoveSize(
    @Param('id') id: string,
    @Body() dto: CreateMoveSizeDto,
    @CurrentUser() user: User,
  ) {
    try {
      const moveSize = await this.tariffSettingsService.addMoveSize(id, dto, user.id);

      return {
        success: true,
        data: moveSize,
        message: 'Move size added successfully',
      };
    } catch (error) {
      this.logger.error(`Error in addMoveSize for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/move-sizes/:moveSizeId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateMoveSize(
    @Param('id') id: string,
    @Param('moveSizeId') moveSizeId: string,
    @Body() dto: UpdateMoveSizeDto,
    @CurrentUser() user: User,
  ) {
    try {
      const moveSize = await this.tariffSettingsService.updateMoveSize(
        id,
        moveSizeId,
        dto,
        user.id,
      );

      return {
        success: true,
        data: moveSize,
        message: 'Move size updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateMoveSize for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/move-sizes/:moveSizeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteMoveSize(
    @Param('id') id: string,
    @Param('moveSizeId') moveSizeId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.tariffSettingsService.deleteMoveSize(id, moveSizeId, user.id);
    } catch (error) {
      this.logger.error(`Error in deleteMoveSize for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Room Sizes Endpoints
  // ============================

  @Get(':id/room-sizes')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getRoomSizes(@Param('id') id: string, @Query() query: any) {
    try {
      const roomSizes = await this.tariffSettingsService.getRoomSizes(id, query);

      return {
        success: true,
        data: roomSizes,
        count: roomSizes.length,
      };
    } catch (error) {
      this.logger.error(`Error in getRoomSizes for ID ${id}`, error);
      throw error;
    }
  }

  @Get(':id/room-sizes/:roomSizeId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getRoomSize(@Param('id') id: string, @Param('roomSizeId') roomSizeId: string) {
    try {
      const roomSize = await this.tariffSettingsService.getRoomSize(id, roomSizeId);

      return {
        success: true,
        data: roomSize,
      };
    } catch (error) {
      this.logger.error(`Error in getRoomSize for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/room-sizes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addRoomSize(
    @Param('id') id: string,
    @Body() dto: CreateRoomSizeDto,
    @CurrentUser() user: User,
  ) {
    try {
      const roomSize = await this.tariffSettingsService.addRoomSize(id, dto, user.id);

      return {
        success: true,
        data: roomSize,
        message: 'Room size added successfully',
      };
    } catch (error) {
      this.logger.error(`Error in addRoomSize for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/room-sizes/:roomSizeId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateRoomSize(
    @Param('id') id: string,
    @Param('roomSizeId') roomSizeId: string,
    @Body() dto: UpdateRoomSizeDto,
    @CurrentUser() user: User,
  ) {
    try {
      const roomSize = await this.tariffSettingsService.updateRoomSize(
        id,
        roomSizeId,
        dto,
        user.id,
      );

      return {
        success: true,
        data: roomSize,
        message: 'Room size updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateRoomSize for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/room-sizes/:roomSizeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteRoomSize(
    @Param('id') id: string,
    @Param('roomSizeId') roomSizeId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.tariffSettingsService.deleteRoomSize(id, roomSizeId, user.id);
    } catch (error) {
      this.logger.error(`Error in deleteRoomSize for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Handicaps Endpoints
  // ============================

  @Get(':id/handicaps')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getHandicaps(@Param('id') id: string, @Query() query: any) {
    try {
      const handicaps = await this.tariffSettingsService.getHandicaps(id, query);

      return {
        success: true,
        data: handicaps,
        count: handicaps.length,
      };
    } catch (error) {
      this.logger.error(`Error in getHandicaps for ID ${id}`, error);
      throw error;
    }
  }

  @Get(':id/handicaps/:handicapId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getHandicap(@Param('id') id: string, @Param('handicapId') handicapId: string) {
    try {
      const handicap = await this.tariffSettingsService.getHandicap(id, handicapId);

      return {
        success: true,
        data: handicap,
      };
    } catch (error) {
      this.logger.error(`Error in getHandicap for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/handicaps')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addHandicap(
    @Param('id') id: string,
    @Body() dto: CreateHandicapDto,
    @CurrentUser() user: User,
  ) {
    try {
      const handicap = await this.tariffSettingsService.addHandicap(id, dto, user.id);

      return {
        success: true,
        data: handicap,
        message: 'Handicap added successfully',
      };
    } catch (error) {
      this.logger.error(`Error in addHandicap for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/handicaps/:handicapId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateHandicap(
    @Param('id') id: string,
    @Param('handicapId') handicapId: string,
    @Body() dto: UpdateHandicapDto,
    @CurrentUser() user: User,
  ) {
    try {
      const handicap = await this.tariffSettingsService.updateHandicap(
        id,
        handicapId,
        dto,
        user.id,
      );

      return {
        success: true,
        data: handicap,
        message: 'Handicap updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateHandicap for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/handicaps/:handicapId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteHandicap(
    @Param('id') id: string,
    @Param('handicapId') handicapId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.tariffSettingsService.deleteHandicap(id, handicapId, user.id);
    } catch (error) {
      this.logger.error(`Error in deleteHandicap for ID ${id}`, error);
      throw error;
    }
  }

  // ============================
  // Distance Rates Endpoints
  // ============================

  @Get(':id/distance-rates')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getDistanceRates(@Param('id') id: string, @Query() query: any) {
    try {
      const distanceRates = await this.tariffSettingsService.getDistanceRates(id, query);

      return {
        success: true,
        data: distanceRates,
        count: distanceRates.length,
      };
    } catch (error) {
      this.logger.error(`Error in getDistanceRates for ID ${id}`, error);
      throw error;
    }
  }

  @Get(':id/distance-rates/:distanceRateId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getDistanceRate(
    @Param('id') id: string,
    @Param('distanceRateId') distanceRateId: string,
  ) {
    try {
      const distanceRate = await this.tariffSettingsService.getDistanceRate(
        id,
        distanceRateId,
      );

      return {
        success: true,
        data: distanceRate,
      };
    } catch (error) {
      this.logger.error(`Error in getDistanceRate for ID ${id}`, error);
      throw error;
    }
  }

  @Post(':id/distance-rates')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addDistanceRate(
    @Param('id') id: string,
    @Body() dto: CreateDistanceRateDto,
    @CurrentUser() user: User,
  ) {
    try {
      const distanceRate = await this.tariffSettingsService.addDistanceRate(
        id,
        dto,
        user.id,
      );

      return {
        success: true,
        data: distanceRate,
        message: 'Distance rate added successfully',
      };
    } catch (error) {
      this.logger.error(`Error in addDistanceRate for ID ${id}`, error);
      throw error;
    }
  }

  @Patch(':id/distance-rates/:distanceRateId')
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateDistanceRate(
    @Param('id') id: string,
    @Param('distanceRateId') distanceRateId: string,
    @Body() dto: UpdateDistanceRateDto,
    @CurrentUser() user: User,
  ) {
    try {
      const distanceRate = await this.tariffSettingsService.updateDistanceRate(
        id,
        distanceRateId,
        dto,
        user.id,
      );

      return {
        success: true,
        data: distanceRate,
        message: 'Distance rate updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error in updateDistanceRate for ID ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/distance-rates/:distanceRateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'tariff_settings', action: 'update' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteDistanceRate(
    @Param('id') id: string,
    @Param('distanceRateId') distanceRateId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.tariffSettingsService.deleteDistanceRate(id, distanceRateId, user.id);
    } catch (error) {
      this.logger.error(`Error in deleteDistanceRate for ID ${id}`, error);
      throw error;
    }
  }
}