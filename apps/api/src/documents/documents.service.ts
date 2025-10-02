import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentEntity,
  DocumentDocument,
  DocumentType,
  EntityType,
} from './schemas/document.schema';
import { MinioService } from './services/minio.service';
import {
  UploadDocumentDto,
  CreateShareLinkDto,
  DocumentFiltersDto,
  UpdateDocumentDto,
} from './dto';
import {
  IDocument,
  IStorageStatistics,
  IShareLink,
  IDownloadResult,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './interfaces/document.interface';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentDocument>,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Additional security checks
    if (!file.originalname || file.originalname.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }
  }

  /**
   * Upload a document
   */
  async uploadDocument(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    userId: string,
  ): Promise<IDocument> {
    try {
      // Validate file
      this.validateFile(file);

      // Upload to MinIO
      const storageKey = await this.minioService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      // Create document record
      const document = new this.documentModel({
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        bucket: this.minioService.getBucket(),
        documentType: dto.documentType,
        entityType: dto.entityType,
        entityId: new Types.ObjectId(dto.entityId),
        tags: dto.tags || [],
        description: dto.description,
        uploadedBy: new Types.ObjectId(userId),
        metadata: dto.metadata || {},
        isDeleted: false,
      });

      await document.save();

      this.logger.log(
        `Document uploaded: ${document._id} by user ${userId}`,
      );

      return document.toObject();
    } catch (error) {
      this.logger.error(`Error uploading document: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to upload document');
    }
  }

  /**
   * Find all documents with filters
   */
  async findAll(filters: DocumentFiltersDto): Promise<IDocument[]> {
    try {
      const query: any = { isDeleted: false };

      // Apply filters
      if (filters.entityType) {
        query.entityType = filters.entityType;
      }

      if (filters.entityId) {
        query.entityId = new Types.ObjectId(filters.entityId);
      }

      if (filters.documentType) {
        query.documentType = filters.documentType;
      }

      if (filters.uploadedBy) {
        query.uploadedBy = new Types.ObjectId(filters.uploadedBy);
      }

      if (filters.fromDate || filters.toDate) {
        query.createdAt = {};
        if (filters.fromDate) {
          query.createdAt.$gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          query.createdAt.$lte = new Date(filters.toDate);
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Text search
      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      const documents = await this.documentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset || 0)
        .limit(filters.limit || 50)
        .populate('uploadedBy', 'username email firstName lastName')
        .lean()
        .exec();

      return documents as IDocument[];
    } catch (error) {
      this.logger.error(`Error finding documents: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve documents');
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<IDocument> {
    try {
      const document = await this.documentModel
        .findOne({ _id: new Types.ObjectId(id), isDeleted: false })
        .populate('uploadedBy', 'username email firstName lastName')
        .lean()
        .exec();

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      return document as IDocument;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding document by ID: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve document');
    }
  }

  /**
   * Find documents by entity
   */
  async findByEntity(entityType: EntityType, entityId: string): Promise<IDocument[]> {
    try {
      const documents = await this.documentModel
        .find({
          entityType,
          entityId: new Types.ObjectId(entityId),
          isDeleted: false,
        })
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'username email firstName lastName')
        .lean()
        .exec();

      return documents as IDocument[];
    } catch (error) {
      this.logger.error(`Error finding documents by entity: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve documents');
    }
  }

  /**
   * Download a document
   */
  async downloadDocument(id: string): Promise<IDownloadResult> {
    try {
      const document = await this.findById(id);

      const buffer = await this.minioService.downloadFile(document.storageKey);

      return {
        buffer,
        document,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error downloading document: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to download document');
    }
  }

  /**
   * Delete a document (soft delete)
   */
  async deleteDocument(id: string, userId: string): Promise<void> {
    try {
      const document = await this.documentModel.findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      document.isDeleted = true;
      document.deletedAt = new Date();
      document.deletedBy = new Types.ObjectId(userId);

      await document.save();

      this.logger.log(`Document deleted: ${id} by user ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting document: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete document');
    }
  }

  /**
   * Create a share link for a document
   */
  async createShareLink(
    id: string,
    dto: CreateShareLinkDto,
  ): Promise<IShareLink> {
    try {
      const document = await this.documentModel.findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Generate share token
      const token = uuidv4();

      // Set expiration (default: 7 days from now)
      const expiresAt = dto.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (dto.password) {
        hashedPassword = await bcrypt.hash(dto.password, 12);
      }

      // Update document
      document.isShared = true;
      document.shareToken = token;
      document.shareExpiresAt = expiresAt;
      document.sharePassword = hashedPassword;
      document.shareAccessCount = 0;

      await document.save();

      this.logger.log(`Share link created for document: ${id}`);

      return {
        token,
        url: `/api/documents/shared/${token}`,
        expiresAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error creating share link: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create share link');
    }
  }

  /**
   * Access a shared document
   */
  async accessSharedDocument(
    token: string,
    password?: string,
  ): Promise<IDocument> {
    try {
      const document = await this.documentModel
        .findOne({
          shareToken: token,
          isShared: true,
          isDeleted: false,
        })
        .lean()
        .exec();

      if (!document) {
        throw new NotFoundException('Shared link not found or expired');
      }

      // Check expiration
      if (document.shareExpiresAt && new Date() > document.shareExpiresAt) {
        throw new UnauthorizedException('Share link has expired');
      }

      // Check password if required
      if (document.sharePassword) {
        if (!password) {
          throw new UnauthorizedException('Password required to access this document');
        }

        const isPasswordValid = await bcrypt.compare(password, document.sharePassword);
        if (!isPasswordValid) {
          throw new UnauthorizedException('Invalid password');
        }
      }

      // Increment access count
      await this.documentModel.updateOne(
        { _id: document._id },
        { $inc: { shareAccessCount: 1 } },
      );

      return document as IDocument;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Error accessing shared document: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to access shared document');
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<IDocument> {
    try {
      const document = await this.documentModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(id), isDeleted: false },
          {
            $set: {
              ...(dto.tags && { tags: dto.tags }),
              ...(dto.description && { description: dto.description }),
              ...(dto.metadata && { metadata: dto.metadata }),
            },
          },
          { new: true },
        )
        .populate('uploadedBy', 'username email firstName lastName')
        .lean()
        .exec();

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      this.logger.log(`Document updated: ${id}`);

      return document as IDocument;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating document: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update document');
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(userId?: string): Promise<IStorageStatistics> {
    try {
      const matchStage: any = { isDeleted: false };
      if (userId) {
        matchStage.uploadedBy = new Types.ObjectId(userId);
      }

      const stats = await this.documentModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$size' },
          },
        },
      ]);

      const byType = await this.documentModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$documentType',
            count: { $sum: 1 },
            size: { $sum: '$size' },
          },
        },
      ]);

      const byEntity = await this.documentModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$entityType',
            count: { $sum: 1 },
            size: { $sum: '$size' },
          },
        },
      ]);

      const result: IStorageStatistics = {
        totalFiles: stats[0]?.totalFiles || 0,
        totalSize: stats[0]?.totalSize || 0,
        byType: Object.values(DocumentType).reduce((acc, type) => {
          const stat = byType.find((s) => s._id === type);
          acc[type] = {
            count: stat?.count || 0,
            size: stat?.size || 0,
          };
          return acc;
        }, {} as any),
        byEntity: Object.values(EntityType).reduce((acc, type) => {
          const stat = byEntity.find((s) => s._id === type);
          acc[type] = {
            count: stat?.count || 0,
            size: stat?.size || 0,
          };
          return acc;
        }, {} as any),
      };

      return result;
    } catch (error) {
      this.logger.error(`Error getting storage statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get storage statistics');
    }
  }
}
