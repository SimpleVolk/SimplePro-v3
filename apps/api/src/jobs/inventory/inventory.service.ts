import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  InventoryChecklist,
  InventoryChecklistDocument,
} from './schemas/inventory-checklist.schema';
import {
  InventoryItem,
  InventoryItemDocument,
  ItemStatus,
  ItemCondition,
} from './schemas/inventory-item.schema';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  BulkUpdateStatusDto,
} from './dto';
import { MinioService } from '../../documents/services/minio.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryChecklist.name)
    private readonly checklistModel: Model<InventoryChecklistDocument>,
    @InjectModel(InventoryItem.name)
    private readonly itemModel: Model<InventoryItemDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Validate that a job exists
   */
  private async validateJobExists(jobId: string): Promise<void> {
    try {
      const Job = this.connection.model('Job');
      const jobExists = await Job.exists({ _id: new Types.ObjectId(jobId) });
      if (!jobExists) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error validating job: ${error}`);
      throw new InternalServerErrorException('Failed to validate job');
    }
  }

  /**
   * Validate user has access to job
   * Only crew assigned to job + dispatchers + admins can access
   */
  private async validateJobAccess(
    jobId: string,
    userId: string,
    userRoleName: string,
  ): Promise<void> {
    // Admins and dispatchers have full access
    if (['super_admin', 'admin', 'dispatcher'].includes(userRoleName)) {
      return;
    }

    // For crew members, check if they're assigned to the job
    if (userRoleName === 'crew_member') {
      try {
        const Job = this.connection.model('Job');
        const job = await Job.findById(jobId).lean();

        if (!job) {
          throw new NotFoundException(`Job with ID ${jobId} not found`);
        }

        const isAssigned = (job as any).assignedCrew?.some(
          (assignment: any) => assignment.crewMemberId?.toString() === userId
        );

        if (!isAssigned) {
          throw new ForbiddenException(
            'You do not have access to this job inventory'
          );
        }
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
          throw error;
        }
        this.logger.error(`Error validating job access: ${error}`);
        throw new InternalServerErrorException('Failed to validate job access');
      }
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  /**
   * Get or create inventory checklist for a job
   */
  private async getOrCreateChecklist(
    jobId: string,
    userId: string,
  ): Promise<InventoryChecklistDocument> {
    try {
      let checklist = await this.checklistModel.findOne({
        jobId: new Types.ObjectId(jobId),
      });

      if (!checklist) {
        checklist = new this.checklistModel({
          jobId: new Types.ObjectId(jobId),
          totalItems: 0,
          notStartedCount: 0,
          loadedCount: 0,
          deliveredCount: 0,
          damagedCount: 0,
        });
        await checklist.save();
        this.logger.log(
          `Inventory checklist created for job ${jobId} by user ${userId}`
        );
      }

      return checklist;
    } catch (error) {
      this.logger.error(`Error getting or creating checklist: ${error}`);
      throw new InternalServerErrorException('Failed to get or create checklist');
    }
  }

  /**
   * Update checklist statistics
   */
  private async updateChecklistStatistics(
    checklistId: Types.ObjectId,
  ): Promise<void> {
    try {
      const items = await this.itemModel.find({ checklistId }).lean();

      const statistics = {
        totalItems: items.length,
        notStartedCount: items.filter((i) => i.status === ItemStatus.NOT_STARTED).length,
        loadedCount: items.filter((i) => i.status === ItemStatus.LOADED).length,
        deliveredCount: items.filter((i) => i.status === ItemStatus.DELIVERED).length,
        damagedCount: items.filter((i) => i.condition === ItemCondition.DAMAGED).length,
      };

      await this.checklistModel.updateOne(
        { _id: checklistId },
        { $set: statistics }
      );
    } catch (error) {
      this.logger.error(`Error updating checklist statistics: ${error}`);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get inventory checklist for a job
   */
  async getInventoryChecklist(
    jobId: string,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      // Validate job exists and user has access
      await this.validateJobExists(jobId);
      await this.validateJobAccess(jobId, userId, userRole);

      // Get or create checklist
      const checklist = await this.getOrCreateChecklist(jobId, userId);

      // Get all items for this checklist
      const items = await this.itemModel
        .find({ checklistId: checklist._id })
        .sort({ createdAt: 1 })
        .lean();

      return {
        id: (checklist._id as any).toString(),
        jobId: (checklist.jobId as any).toString(),
        items: items.map((item: any) => ({
          id: item._id.toString(),
          name: item.name,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          status: item.status,
          condition: item.condition,
          notes: item.notes,
          photos: item.photos,
          loadedAt: item.loadedAt?.toISOString(),
          deliveredAt: item.deliveredAt?.toISOString(),
          createdAt: item.createdAt?.toISOString(),
          updatedAt: item.updatedAt?.toISOString(),
        })),
        statistics: {
          total: checklist.totalItems,
          notStarted: checklist.notStartedCount,
          loaded: checklist.loadedCount,
          delivered: checklist.deliveredCount,
          damaged: checklist.damagedCount,
        },
        createdAt: (checklist as any).createdAt?.toISOString(),
        updatedAt: (checklist as any).updatedAt?.toISOString(),
        completedAt: checklist.completedAt?.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error getting inventory checklist: ${error}`);
      throw new InternalServerErrorException('Failed to get inventory checklist');
    }
  }

  /**
   * Create a new inventory item
   */
  async createInventoryItem(
    jobId: string,
    dto: CreateInventoryItemDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      // Validate job exists and user has access
      await this.validateJobExists(jobId);
      await this.validateJobAccess(jobId, userId, userRole);

      // Get or create checklist
      const checklist = await this.getOrCreateChecklist(jobId, userId);

      // Create inventory item
      const item = new this.itemModel({
        checklistId: checklist._id,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        quantity: dto.quantity,
        status: ItemStatus.NOT_STARTED,
        condition: dto.condition || ItemCondition.GOOD,
        notes: dto.notes,
        photos: [],
        createdBy: new Types.ObjectId(userId),
        lastModifiedBy: new Types.ObjectId(userId),
      });

      await item.save();

      // Update checklist statistics
      await this.updateChecklistStatistics(checklist._id as any);

      this.logger.log(
        `Inventory item created: ${item._id} for job ${jobId} by user ${userId}`
      );

      const itemObj = item.toObject() as any;

      return {
        id: itemObj._id.toString(),
        name: itemObj.name,
        description: itemObj.description,
        category: itemObj.category,
        quantity: itemObj.quantity,
        status: itemObj.status,
        condition: itemObj.condition,
        notes: itemObj.notes,
        photos: itemObj.photos,
        createdAt: itemObj.createdAt?.toISOString(),
        updatedAt: itemObj.updatedAt?.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error creating inventory item: ${error}`);
      throw new InternalServerErrorException('Failed to create inventory item');
    }
  }

  /**
   * Update an inventory item
   */
  async updateInventoryItem(
    jobId: string,
    itemId: string,
    dto: UpdateInventoryItemDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      // Validate job exists and user has access
      await this.validateJobExists(jobId);
      await this.validateJobAccess(jobId, userId, userRole);

      // Find the item
      const item = await this.itemModel.findById(itemId);
      if (!item) {
        throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
      }

      // Verify item belongs to this job's checklist
      const checklist = await this.checklistModel.findOne({
        _id: item.checklistId,
        jobId: new Types.ObjectId(jobId),
      });

      if (!checklist) {
        throw new NotFoundException('Inventory item does not belong to this job');
      }

      // Update item fields
      if (dto.name !== undefined) item.name = dto.name;
      if (dto.description !== undefined) item.description = dto.description;
      if (dto.category !== undefined) item.category = dto.category;
      if (dto.quantity !== undefined) item.quantity = dto.quantity;
      if (dto.condition !== undefined) item.condition = dto.condition;
      if (dto.notes !== undefined) item.notes = dto.notes;

      // Handle status changes with timestamps
      if (dto.status !== undefined && dto.status !== item.status) {
        const oldStatus = item.status;
        item.status = dto.status;

        if (dto.status === ItemStatus.LOADED && oldStatus !== ItemStatus.LOADED) {
          item.loadedAt = new Date();
        }
        if (dto.status === ItemStatus.DELIVERED && oldStatus !== ItemStatus.DELIVERED) {
          item.deliveredAt = new Date();
        }
      }

      item.lastModifiedBy = new Types.ObjectId(userId);
      await item.save();

      // Update checklist statistics
      await this.updateChecklistStatistics(checklist._id as any);

      this.logger.log(
        `Inventory item updated: ${itemId} for job ${jobId} by user ${userId}`
      );

      const itemObj = item.toObject() as any;

      return {
        id: itemObj._id.toString(),
        name: itemObj.name,
        description: itemObj.description,
        category: itemObj.category,
        quantity: itemObj.quantity,
        status: itemObj.status,
        condition: itemObj.condition,
        notes: itemObj.notes,
        photos: itemObj.photos,
        loadedAt: itemObj.loadedAt?.toISOString(),
        deliveredAt: itemObj.deliveredAt?.toISOString(),
        createdAt: itemObj.createdAt?.toISOString(),
        updatedAt: itemObj.updatedAt?.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error updating inventory item: ${error}`);
      throw new InternalServerErrorException('Failed to update inventory item');
    }
  }

  /**
   * Upload photo for an inventory item
   */
  async uploadItemPhoto(
    jobId: string,
    itemId: string,
    file: any,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      // Validate job exists and user has access
      await this.validateJobExists(jobId);
      await this.validateJobAccess(jobId, userId, userRole);

      // Find the item
      const item = await this.itemModel.findById(itemId);
      if (!item) {
        throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
      }

      // Verify item belongs to this job's checklist
      const checklist = await this.checklistModel.findOne({
        _id: item.checklistId,
        jobId: new Types.ObjectId(jobId),
      });

      if (!checklist) {
        throw new NotFoundException('Inventory item does not belong to this job');
      }

      // Validate file
      if (!file || !file.buffer) {
        throw new BadRequestException('No file provided');
      }

      // Upload to MinIO with organized path
      const timestamp = Date.now();
      const originalName = file.originalname || 'photo.jpg';
      const storageKey = `inventories/${checklist._id}/items/${itemId}/${timestamp}-${originalName}`;

      await this.minioService.uploadFile(
        file.buffer,
        storageKey,
        file.mimetype || 'image/jpeg'
      );

      // Generate presigned URL (valid for 7 days)
      const photoUrl = await this.minioService.generatePresignedUrl(storageKey, 604800);

      // Add photo URL to item
      item.photos.push(storageKey);
      item.lastModifiedBy = new Types.ObjectId(userId);
      await item.save();

      this.logger.log(
        `Photo uploaded for inventory item ${itemId}: ${storageKey}`
      );

      return {
        photoUrl,
        storageKey,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error uploading item photo: ${error}`);
      throw new InternalServerErrorException('Failed to upload photo');
    }
  }

  /**
   * Bulk update item statuses (with transaction support)
   */
  async bulkUpdateStatus(
    jobId: string,
    dto: BulkUpdateStatusDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      // Validate job exists and user has access
      await this.validateJobExists(jobId);
      await this.validateJobAccess(jobId, userId, userRole);

      // Get checklist for this job
      const checklist = await this.checklistModel.findOne({
        jobId: new Types.ObjectId(jobId),
      });

      if (!checklist) {
        throw new NotFoundException('Inventory checklist not found for this job');
      }

      // Validate all items belong to this checklist
      const items = await this.itemModel.find({
        _id: { $in: dto.itemIds.map((id) => new Types.ObjectId(id)) },
        checklistId: checklist._id,
      });

      if (items.length !== dto.itemIds.length) {
        throw new BadRequestException(
          'Some items do not exist or do not belong to this job'
        );
      }

      // Update all items
      const updateData: any = {
        status: dto.newStatus,
        lastModifiedBy: new Types.ObjectId(userId),
      };

      // Add timestamp based on status
      if (dto.newStatus === ItemStatus.LOADED) {
        updateData.loadedAt = new Date();
      } else if (dto.newStatus === ItemStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      }

      const result = await this.itemModel.updateMany(
        {
          _id: { $in: dto.itemIds.map((id) => new Types.ObjectId(id)) },
          checklistId: checklist._id,
        },
        { $set: updateData },
        { session }
      );

      // Update checklist statistics
      await this.updateChecklistStatistics(checklist._id as Types.ObjectId);

      await session.commitTransaction();

      this.logger.log(
        `Bulk status update: ${result.modifiedCount} items updated to ${dto.newStatus} for job ${jobId}`
      );

      return {
        updatedCount: result.modifiedCount,
      };
    } catch (error) {
      await session.abortTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error in bulk update: ${error}`);
      throw new InternalServerErrorException('Failed to bulk update items');
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(
    jobId: string,
    itemId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    try {
      // Validate job exists and user has access
      await this.validateJobExists(jobId);
      await this.validateJobAccess(jobId, userId, userRole);

      // Find the item
      const item = await this.itemModel.findById(itemId);
      if (!item) {
        throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
      }

      // Verify item belongs to this job's checklist
      const checklist = await this.checklistModel.findOne({
        _id: item.checklistId,
        jobId: new Types.ObjectId(jobId),
      });

      if (!checklist) {
        throw new NotFoundException('Inventory item does not belong to this job');
      }

      // Delete photos from MinIO
      for (const storageKey of item.photos) {
        try {
          await this.minioService.deleteFile(storageKey);
        } catch (error) {
          this.logger.warn(`Failed to delete photo ${storageKey}: ${error}`);
          // Continue with deletion even if photo deletion fails
        }
      }

      // Delete the item
      await this.itemModel.deleteOne({ _id: itemId });

      // Update checklist statistics
      await this.updateChecklistStatistics(checklist._id as Types.ObjectId);

      this.logger.log(
        `Inventory item deleted: ${itemId} for job ${jobId} by user ${userId}`
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error deleting inventory item: ${error}`);
      throw new InternalServerErrorException('Failed to delete inventory item');
    }
  }
}
