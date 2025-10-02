import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentEntity, DocumentType, EntityType } from './schemas/document.schema';
import { MinioService } from './services/minio.service';
import { Types } from 'mongoose';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocumentModel: any;
  let mockMinioService: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockDocumentId = new Types.ObjectId().toString();
  const mockEntityId = new Types.ObjectId().toString();

  const createMockFile = (overrides = {}) => ({
    buffer: Buffer.from('test file content'),
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    ...overrides,
  });

  const createMockDocument = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    filename: 'test-document.pdf',
    originalName: 'test-document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    storageKey: 'documents/test-key',
    bucket: 'simplepro-documents',
    documentType: DocumentType.CONTRACT,
    entityType: EntityType.JOB,
    entityId: new Types.ObjectId(mockEntityId),
    tags: ['important'],
    description: 'Test document',
    uploadedBy: new Types.ObjectId(mockUserId),
    metadata: {},
    isDeleted: false,
    isShared: false,
    shareAccessCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedThis(),
    ...overrides,
  });

  const createMockQuery = (returnValue: any = null) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue),
  });

  beforeEach(async () => {
    // Mock MinIO service
    mockMinioService = {
      uploadFile: jest.fn().mockResolvedValue('documents/test-key'),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getBucket: jest.fn().mockReturnValue('simplepro-documents'),
    };

    // Mock Document model
    mockDocumentModel = jest.fn().mockImplementation((data) => {
      const doc = createMockDocument(data);
      return doc;
    });
    mockDocumentModel.findOne = jest.fn();
    mockDocumentModel.find = jest.fn();
    mockDocumentModel.findById = jest.fn();
    mockDocumentModel.findOneAndUpdate = jest.fn();
    mockDocumentModel.findByIdAndDelete = jest.fn();
    mockDocumentModel.updateOne = jest.fn();
    mockDocumentModel.deleteOne = jest.fn();
    mockDocumentModel.countDocuments = jest.fn();
    mockDocumentModel.aggregate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getModelToken(DocumentEntity.name),
          useValue: mockDocumentModel,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    const validDto = {
      documentType: DocumentType.CONTRACT,
      entityType: EntityType.JOB,
      entityId: mockEntityId,
      tags: ['important'],
      description: 'Test document',
    };

    it('should upload document successfully', async () => {
      const file = createMockFile();
      const mockDoc = createMockDocument();

      const result = await service.uploadDocument(file, validDto, mockUserId);

      expect(mockMinioService.uploadFile).toHaveBeenCalledWith(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      expect(result).toBeDefined();
    });

    it('should reject file exceeding max size', async () => {
      const largeFile = createMockFile({ size: 100 * 1024 * 1024 + 1 }); // > 100MB

      await expect(
        service.uploadDocument(largeFile, validDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid MIME types', async () => {
      const invalidFile = createMockFile({
        mimetype: 'application/x-executable',
      });

      await expect(
        service.uploadDocument(invalidFile, validDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files with invalid filenames', async () => {
      const invalidFile = createMockFile({
        originalname: '../../../etc/passwd',
      });

      await expect(
        service.uploadDocument(invalidFile, validDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle MinIO upload failure', async () => {
      const file = createMockFile();
      mockMinioService.uploadFile.mockRejectedValue(
        new Error('MinIO connection failed'),
      );

      await expect(
        service.uploadDocument(file, validDto, mockUserId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should set default metadata when not provided', async () => {
      const file = createMockFile();
      const dtoWithoutMetadata = { ...validDto };
      delete (dtoWithoutMetadata as any).metadata;

      await service.uploadDocument(file, dtoWithoutMetadata, mockUserId);

      expect(mockDocumentModel).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted documents', async () => {
      const mockDocs = [createMockDocument(), createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      const result = await service.findAll({});

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ isDeleted: false }),
      );
      expect(result).toEqual(mockDocs);
    });

    it('should filter by entityType', async () => {
      const mockDocs = [createMockDocument({ entityType: EntityType.JOB })];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      await service.findAll({ entityType: EntityType.JOB });

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
          entityType: EntityType.JOB,
        }),
      );
    });

    it('should filter by entityId', async () => {
      const mockDocs = [createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      await service.findAll({ entityId: mockEntityId });

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should filter by documentType', async () => {
      const mockDocs = [createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      await service.findAll({ documentType: DocumentType.CONTRACT });

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: DocumentType.CONTRACT,
        }),
      );
    });

    it('should filter by date range', async () => {
      const mockDocs = [createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await service.findAll({ fromDate, toDate });

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          },
        }),
      );
    });

    it('should filter by tags', async () => {
      const mockDocs = [createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      await service.findAll({ tags: ['important', 'urgent'] });

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { $in: ['important', 'urgent'] },
        }),
      );
    });

    it('should perform text search', async () => {
      const mockDocs = [createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      await service.findAll({ search: 'contract agreement' });

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $text: { $search: 'contract agreement' },
        }),
      );
    });

    it('should apply pagination', async () => {
      const mockDocs = [createMockDocument()];
      const mockQuery = createMockQuery(mockDocs);
      mockDocumentModel.find.mockReturnValue(mockQuery);

      await service.findAll({ offset: 10, limit: 20 });

      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should handle database errors', async () => {
      mockDocumentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.findAll({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findById', () => {
    it('should return document by ID', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(mockDoc));

      const result = await service.findById(mockDocumentId);

      expect(mockDocumentModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          isDeleted: false,
        }),
      );
      expect(result).toEqual(mockDoc);
    });

    it('should throw NotFoundException for non-existent document', async () => {
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(null));

      await expect(service.findById(mockDocumentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted document', async () => {
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(null));

      await expect(service.findById(mockDocumentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEntity', () => {
    it('should return documents for specific entity', async () => {
      const mockDocs = [createMockDocument(), createMockDocument()];
      mockDocumentModel.find.mockReturnValue(createMockQuery(mockDocs));

      const result = await service.findByEntity(EntityType.JOB, mockEntityId);

      expect(mockDocumentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: EntityType.JOB,
          entityId: expect.any(Types.ObjectId),
          isDeleted: false,
        }),
      );
      expect(result).toEqual(mockDocs);
    });

    it('should handle empty results', async () => {
      mockDocumentModel.find.mockReturnValue(createMockQuery([]));

      const result = await service.findByEntity(
        EntityType.CUSTOMER,
        mockEntityId,
      );

      expect(result).toEqual([]);
    });
  });

  describe('downloadDocument', () => {
    it('should download document successfully', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(mockDoc));

      const result = await service.downloadDocument(mockDocumentId);

      expect(mockMinioService.downloadFile).toHaveBeenCalledWith(
        mockDoc.storageKey,
      );
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.document).toEqual(mockDoc);
    });

    it('should throw NotFoundException for non-existent document', async () => {
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(null));

      await expect(service.downloadDocument(mockDocumentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle MinIO download failure', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(mockDoc));
      mockMinioService.downloadFile.mockRejectedValue(
        new Error('File not found in storage'),
      );

      await expect(service.downloadDocument(mockDocumentId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete document successfully', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockResolvedValue(mockDoc);

      await service.deleteDocument(mockDocumentId, mockUserId);

      expect(mockDoc.isDeleted).toBe(true);
      expect(mockDoc.deletedAt).toBeInstanceOf(Date);
      expect(mockDoc.deletedBy).toEqual(expect.any(Types.ObjectId));
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent document', async () => {
      mockDocumentModel.findOne.mockResolvedValue(null);

      await expect(
        service.deleteDocument(mockDocumentId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle already deleted documents', async () => {
      mockDocumentModel.findOne.mockResolvedValue(null);

      await expect(
        service.deleteDocument(mockDocumentId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createShareLink', () => {
    it('should create share link successfully', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockResolvedValue(mockDoc);

      const dto = {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const result = await service.createShareLink(mockDocumentId, dto);

      expect(result.token).toBeDefined();
      expect(result.url).toContain('/api/documents/shared/');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockDoc.isShared).toBe(true);
      expect(mockDoc.shareToken).toBeDefined();
    });

    it('should create share link with password', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockResolvedValue(mockDoc);

      const dto = {
        password: 'secure123',
      };

      await service.createShareLink(mockDocumentId, dto);

      expect(mockDoc.sharePassword).toBeDefined();
      expect(mockDoc.sharePassword).not.toBe('secure123'); // Should be hashed
    });

    it('should use default expiration when not provided', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOne.mockResolvedValue(mockDoc);

      const result = await service.createShareLink(mockDocumentId, {});

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw NotFoundException for non-existent document', async () => {
      mockDocumentModel.findOne.mockResolvedValue(null);

      await expect(
        service.createShareLink(mockDocumentId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('accessSharedDocument', () => {
    it('should access shared document with valid token', async () => {
      const mockDoc = createMockDocument({
        isShared: true,
        shareToken: 'valid-token',
        shareExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        shareAccessCount: 0,
      });
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(mockDoc));
      mockDocumentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.accessSharedDocument('valid-token');

      expect(result).toBeDefined();
      expect(mockDocumentModel.updateOne).toHaveBeenCalledWith(
        { _id: mockDoc._id },
        { $inc: { shareAccessCount: 1 } },
      );
    });

    it('should throw UnauthorizedException for expired link', async () => {
      const mockDoc = createMockDocument({
        isShared: true,
        shareToken: 'expired-token',
        shareExpiresAt: new Date(Date.now() - 1000), // Expired
      });
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(mockDoc));

      await expect(
        service.accessSharedDocument('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require password when set', async () => {
      const mockDoc = createMockDocument({
        isShared: true,
        shareToken: 'protected-token',
        sharePassword: 'hashed-password',
        shareExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(mockDoc));

      await expect(
        service.accessSharedDocument('protected-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockDocumentModel.findOne.mockReturnValue(createMockQuery(null));

      await expect(
        service.accessSharedDocument('invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDocument', () => {
    it('should update document metadata successfully', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOneAndUpdate.mockReturnValue(
        createMockQuery(mockDoc),
      );

      const updateDto = {
        tags: ['updated', 'tags'],
        description: 'Updated description',
      };

      const result = await service.updateDocument(mockDocumentId, updateDto);

      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          isDeleted: false,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            tags: updateDto.tags,
            description: updateDto.description,
          }),
        }),
        { new: true },
      );
      expect(result).toEqual(mockDoc);
    });

    it('should throw NotFoundException for non-existent document', async () => {
      mockDocumentModel.findOneAndUpdate.mockReturnValue(createMockQuery(null));

      await expect(
        service.updateDocument(mockDocumentId, { tags: ['test'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOneAndUpdate.mockReturnValue(
        createMockQuery(mockDoc),
      );

      await service.updateDocument(mockDocumentId, { tags: ['only-tags'] });

      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: { tags: ['only-tags'] },
        }),
        expect.anything(),
      );
    });
  });

  describe('getStorageStatistics', () => {
    it('should return storage statistics for all users', async () => {
      const mockStats = [{ _id: null, totalFiles: 10, totalSize: 10240 }];
      const mockByType = [
        { _id: DocumentType.CONTRACT, count: 5, size: 5120 },
        { _id: DocumentType.INVOICE, count: 5, size: 5120 },
      ];
      const mockByEntity = [
        { _id: EntityType.JOB, count: 7, size: 7168 },
        { _id: EntityType.CUSTOMER, count: 3, size: 3072 },
      ];

      mockDocumentModel.aggregate
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockByType)
        .mockResolvedValueOnce(mockByEntity);

      const result = await service.getStorageStatistics();

      expect(result.totalFiles).toBe(10);
      expect(result.totalSize).toBe(10240);
      expect(result.byType).toBeDefined();
      expect(result.byEntity).toBeDefined();
    });

    it('should return statistics for specific user', async () => {
      const mockStats = [{ _id: null, totalFiles: 5, totalSize: 5120 }];
      mockDocumentModel.aggregate
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStorageStatistics(mockUserId);

      expect(mockDocumentModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              uploadedBy: expect.any(Types.ObjectId),
            }),
          }),
        ]),
      );
      expect(result.totalFiles).toBe(5);
    });

    it('should handle empty storage', async () => {
      mockDocumentModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStorageStatistics();

      expect(result.totalFiles).toBe(0);
      expect(result.totalSize).toBe(0);
    });

    it('should handle aggregation errors', async () => {
      mockDocumentModel.aggregate.mockRejectedValue(
        new Error('Aggregation failed'),
      );

      await expect(service.getStorageStatistics()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent uploads', async () => {
      const file1 = createMockFile({ originalname: 'file1.pdf' });
      const file2 = createMockFile({ originalname: 'file2.pdf' });
      const dto = {
        documentType: DocumentType.CONTRACT,
        entityType: EntityType.JOB,
        entityId: mockEntityId,
      };

      const [result1, result2] = await Promise.all([
        service.uploadDocument(file1, dto, mockUserId),
        service.uploadDocument(file2, dto, mockUserId),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(mockMinioService.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in filenames', async () => {
      const file = createMockFile({
        originalname: 'special-chars_@#$%^&()_document.pdf',
      });
      const dto = {
        documentType: DocumentType.CONTRACT,
        entityType: EntityType.JOB,
        entityId: mockEntityId,
      };

      const result = await service.uploadDocument(file, dto, mockUserId);

      expect(result).toBeDefined();
    });

    it('should handle large tag arrays', async () => {
      const mockDoc = createMockDocument();
      mockDocumentModel.findOneAndUpdate.mockReturnValue(
        createMockQuery(mockDoc),
      );

      const largeTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
      await service.updateDocument(mockDocumentId, { tags: largeTags });

      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
