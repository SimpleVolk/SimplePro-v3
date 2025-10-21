import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  BulkUpdateStatusDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../auth/interfaces/user.interface';

@Controller('jobs/:jobId/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * GET /jobs/:jobId/inventory - Get inventory checklist for a job
   */
  @Get()
  @RequirePermissions({ resource: 'jobs', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getInventoryChecklist(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ) {
    const checklist = await this.inventoryService.getInventoryChecklist(
      jobId,
      user.id,
      user.role.name,
    );

    return {
      success: true,
      ...checklist,
    };
  }

  /**
   * POST /jobs/:jobId/inventory/items - Create a new inventory item
   */
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createInventoryItem(
    @Param('jobId') jobId: string,
    @Body(ValidationPipe) dto: CreateInventoryItemDto,
    @CurrentUser() user: User,
  ) {
    const item = await this.inventoryService.createInventoryItem(
      jobId,
      dto,
      user.id,
      user.role.name,
    );

    return {
      success: true,
      item,
      message: 'Item added successfully',
    };
  }

  /**
   * PATCH /jobs/:jobId/inventory/items/:itemId - Update an inventory item
   */
  @Patch('items/:itemId')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  async updateInventoryItem(
    @Param('jobId') jobId: string,
    @Param('itemId') itemId: string,
    @Body(ValidationPipe) dto: UpdateInventoryItemDto,
    @CurrentUser() user: User,
  ) {
    const item = await this.inventoryService.updateInventoryItem(
      jobId,
      itemId,
      dto,
      user.id,
      user.role.name,
    );

    return {
      success: true,
      item,
      message: 'Item updated successfully',
    };
  }

  /**
   * POST /jobs/:jobId/inventory/items/:itemId/photos - Upload item photo
   */
  @Post('items/:itemId/photos')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('photo'))
  async uploadItemPhoto(
    @Param('jobId') jobId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: User,
  ) {
    const result = await this.inventoryService.uploadItemPhoto(
      jobId,
      itemId,
      file,
      user.id,
      user.role.name,
    );

    return {
      success: true,
      photoUrl: result.photoUrl,
      message: 'Photo uploaded successfully',
    };
  }

  /**
   * PATCH /jobs/:jobId/inventory/bulk-update - Bulk update item statuses
   */
  @Patch('bulk-update')
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async bulkUpdateStatus(
    @Param('jobId') jobId: string,
    @Body(ValidationPipe) dto: BulkUpdateStatusDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.inventoryService.bulkUpdateStatus(
      jobId,
      dto,
      user.id,
      user.role.name,
    );

    return {
      success: true,
      updatedCount: result.updatedCount,
      message: `${result.updatedCount} items updated successfully`,
    };
  }

  /**
   * DELETE /jobs/:jobId/inventory/items/:itemId - Delete an inventory item
   */
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'jobs', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async deleteInventoryItem(
    @Param('jobId') jobId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    await this.inventoryService.deleteInventoryItem(
      jobId,
      itemId,
      user.id,
      user.role.name,
    );

    return {
      success: true,
      message: 'Item deleted successfully',
    };
  }
}
