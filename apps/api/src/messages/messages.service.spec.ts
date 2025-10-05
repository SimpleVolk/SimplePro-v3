import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessagesService } from './messages.service';
import { MessageThread } from './schemas/message-thread.schema';
import { Message } from './schemas/message.schema';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockMessageThreadModel: any;
  let mockMessageModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockUser2Id = new Types.ObjectId().toString();
  const mockThreadId = new Types.ObjectId().toString();
  const mockMessageId = new Types.ObjectId().toString();
  const mockJobId = new Types.ObjectId().toString();

  const createMockThread = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    participants: [new Types.ObjectId(mockUserId), new Types.ObjectId(mockUser2Id)],
    threadType: 'direct',
    threadName: null,
    jobId: null,
    lastMessageId: null,
    lastMessageAt: new Date(),
    isArchived: false,
    archivedBy: [],
    createdAt: new Date(),
    save: jest.fn().mockResolvedThis(),
    ...overrides,
  });

  const createMockMessage = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    threadId: new Types.ObjectId(mockThreadId),
    senderId: new Types.ObjectId(mockUserId),
    messageType: 'text',
    content: 'Test message',
    readBy: [],
    deliveredTo: [],
    attachments: [],
    isDeleted: false,
    createdAt: new Date(),
    save: jest.fn().mockResolvedThis(),
    ...overrides,
  });

  const createMockQuery = (returnValue: any = null) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue),
  });

  beforeEach(async () => {
    // Mock MessageThread model
    mockMessageThreadModel = jest.fn().mockImplementation((data) => {
      const thread = createMockThread(data);
      return thread;
    });
    mockMessageThreadModel.findOne = jest.fn();
    mockMessageThreadModel.find = jest.fn();
    mockMessageThreadModel.findById = jest.fn();
    mockMessageThreadModel.findByIdAndUpdate = jest.fn();

    // Mock Message model
    mockMessageModel = jest.fn().mockImplementation((data) => {
      const message = createMockMessage(data);
      return message;
    });
    mockMessageModel.find = jest.fn();
    mockMessageModel.findById = jest.fn();
    mockMessageModel.countDocuments = jest.fn();
    mockMessageModel.updateMany = jest.fn();
    mockMessageModel.aggregate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(MessageThread.name),
          useValue: mockMessageThreadModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    jest.clearAllMocks();
  });

  describe('createThread', () => {
    it('should create a new direct thread', async () => {
      const dto: CreateThreadDto = {
        participants: [mockUserId, mockUser2Id],
        threadType: 'direct',
      };

      mockMessageThreadModel.findOne.mockResolvedValue(null);

      const result = await service.createThread(dto);

      expect(result).toBeDefined();
      expect(result.threadType).toBe('direct');
      expect(result.save).toHaveBeenCalled();
    });

    it('should return existing direct thread if already exists', async () => {
      const dto: CreateThreadDto = {
        participants: [mockUserId, mockUser2Id],
        threadType: 'direct',
      };

      const existingThread = createMockThread({ threadType: 'direct' });
      mockMessageThreadModel.findOne.mockResolvedValue(existingThread);

      const result = await service.createThread(dto);

      expect(result).toEqual(existingThread);
      expect(mockMessageThreadModel).not.toHaveBeenCalled(); // Should not create new thread
    });

    it('should create a group thread', async () => {
      const dto: CreateThreadDto = {
        participants: [mockUserId, mockUser2Id, new Types.ObjectId().toString()],
        threadType: 'group',
        threadName: 'Team Chat',
      };

      const result = await service.createThread(dto);

      expect(result.threadType).toBe('group');
      expect(result.threadName).toBe('Team Chat');
    });

    it('should create a job thread', async () => {
      const dto: CreateThreadDto = {
        participants: [mockUserId, mockUser2Id],
        threadType: 'job',
        jobId: mockJobId,
        threadName: 'Job Discussion',
      };

      const result = await service.createThread(dto);

      expect(result.threadType).toBe('job');
      expect(result.jobId).toBeDefined();
    });

    it('should handle thread creation errors', async () => {
      const dto: CreateThreadDto = {
        participants: [mockUserId, mockUser2Id],
        threadType: 'direct',
      };

      mockMessageThreadModel.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.createThread(dto)).rejects.toThrow();
    });
  });

  describe('findOrCreateDirectThread', () => {
    it('should return existing direct thread', async () => {
      const existingThread = createMockThread();
      mockMessageThreadModel.findOne.mockResolvedValue(existingThread);

      const result = await service.findOrCreateDirectThread(mockUserId, mockUser2Id);

      expect(result).toEqual(existingThread);
      expect(mockMessageThreadModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          threadType: 'direct',
        }),
      );
    });

    it('should create new direct thread if none exists', async () => {
      mockMessageThreadModel.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateDirectThread(mockUserId, mockUser2Id);

      expect(result.threadType).toBe('direct');
      expect(result.participants).toHaveLength(2);
    });

    it('should handle errors when finding or creating thread', async () => {
      mockMessageThreadModel.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOrCreateDirectThread(mockUserId, mockUser2Id)).rejects.toThrow();
    });
  });

  describe('findOrCreateJobThread', () => {
    it('should return existing job thread', async () => {
      const existingThread = createMockThread({
        threadType: 'job',
        jobId: new Types.ObjectId(mockJobId),
      });
      mockMessageThreadModel.findOne.mockResolvedValue(existingThread);

      const result = await service.findOrCreateJobThread(mockJobId);

      expect(result).toEqual(existingThread);
    });

    it('should create new job thread if none exists', async () => {
      mockMessageThreadModel.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateJobThread(mockJobId);

      expect(result.threadType).toBe('job');
      expect(result.jobId).toBeDefined();
      expect(result.threadName).toContain('Job');
    });
  });

  describe('getThreads', () => {
    it('should return all threads for user', async () => {
      const mockThreads = [createMockThread(), createMockThread()];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));

      const result = await service.getThreads(mockUserId);

      expect(mockMessageThreadModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          participants: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(mockThreads);
    });

    it('should filter by thread type', async () => {
      const mockThreads = [createMockThread({ threadType: 'job' })];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));

      await service.getThreads(mockUserId, { threadType: 'job' });

      expect(mockMessageThreadModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          threadType: 'job',
        }),
      );
    });

    it('should filter by job ID', async () => {
      const mockThreads = [createMockThread({ threadType: 'job', jobId: mockJobId })];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));

      await service.getThreads(mockUserId, { jobId: mockJobId });

      expect(mockMessageThreadModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should exclude archived threads by default', async () => {
      const mockThreads = [createMockThread({ isArchived: false })];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));

      await service.getThreads(mockUserId);

      expect(mockMessageThreadModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        }),
      );
    });

    it('should include archived threads when requested', async () => {
      const mockThreads = [
        createMockThread({ isArchived: false }),
        createMockThread({ isArchived: true }),
      ];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));

      await service.getThreads(mockUserId, { includeArchived: true });

      expect(mockMessageThreadModel.find).toHaveBeenCalledWith(
        expect.not.objectContaining({
          isArchived: false,
        }),
      );
    });

    it('should filter unread threads when requested', async () => {
      const mockThreads = [createMockThread()];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));
      mockMessageModel.countDocuments.mockResolvedValue(5);

      const result = await service.getThreads(mockUserId, { unreadOnly: true });

      expect(result).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const thread = createMockThread();
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      const dto: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'text',
        content: 'Hello, world!',
      };

      const result = await service.sendMessage(dto, mockUserId);

      expect(result.content).toBe('Hello, world!');
      expect(result.senderId).toBeDefined();
      expect(result.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if thread not found', async () => {
      mockMessageThreadModel.findById.mockResolvedValue(null);

      const dto: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'text',
        content: 'Hello',
      };

      await expect(service.sendMessage(dto, mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not participant', async () => {
      const thread = createMockThread({
        participants: [new Types.ObjectId(), new Types.ObjectId()], // Different participants
      });
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      const dto: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'text',
        content: 'Hello',
      };

      await expect(service.sendMessage(dto, mockUserId)).rejects.toThrow(ForbiddenException);
    });

    it('should send message with attachments', async () => {
      const thread = createMockThread();
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      const dto: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'file',
        content: 'Check this file',
        attachments: [
          {
            fileId: 'file123',
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            size: 1024,
          },
        ],
      };

      const result = await service.sendMessage(dto, mockUserId);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].filename).toBe('document.pdf');
    });

    it('should update thread last message timestamp', async () => {
      const thread = createMockThread();
      mockMessageThreadModel.findById.mockResolvedValue(thread);
      mockMessageThreadModel.findByIdAndUpdate.mockResolvedValue(thread);

      const dto: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'text',
        content: 'New message',
      };

      await service.sendMessage(dto, mockUserId);

      expect(mockMessageThreadModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages for thread', async () => {
      const mockMessages = [createMockMessage(), createMockMessage()];
      mockMessageModel.find.mockReturnValue(createMockQuery(mockMessages));
      mockMessageModel.countDocuments.mockResolvedValue(2);

      const result = await service.getMessages(mockThreadId, mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result.messages).toEqual(mockMessages);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should apply pagination correctly', async () => {
      const mockMessages = [createMockMessage()];
      const mockQuery = createMockQuery(mockMessages);
      mockMessageModel.find.mockReturnValue(mockQuery);
      mockMessageModel.countDocuments.mockResolvedValue(50);

      await service.getMessages(mockThreadId, mockUserId, {
        page: 2,
        limit: 10,
      });

      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should throw NotFoundException for invalid thread', async () => {
      const mockMessages = [createMockMessage()];
      mockMessageModel.find.mockReturnValue(createMockQuery(mockMessages));

      await expect(
        service.getMessages('invalid-thread-id', mockUserId, { page: 1, limit: 20 }),
      ).rejects.toThrow();
    });

    it('should filter out deleted messages', async () => {
      const mockMessages = [
        createMockMessage({ isDeleted: false }),
        createMockMessage({ isDeleted: false }),
      ];
      mockMessageModel.find.mockReturnValue(createMockQuery(mockMessages));
      mockMessageModel.countDocuments.mockResolvedValue(2);

      await service.getMessages(mockThreadId, mockUserId, { page: 1, limit: 20 });

      expect(mockMessageModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const message = createMockMessage({ readBy: [] });
      mockMessageModel.findById.mockResolvedValue(message);

      await service.markAsRead(mockMessageId, mockUserId);

      expect(message.readBy).toContain(expect.any(Types.ObjectId));
      expect(message.save).toHaveBeenCalled();
    });

    it('should not duplicate read status', async () => {
      const message = createMockMessage({
        readBy: [new Types.ObjectId(mockUserId)],
      });
      mockMessageModel.findById.mockResolvedValue(message);

      await service.markAsRead(mockMessageId, mockUserId);

      expect(message.readBy).toHaveLength(1); // Should not duplicate
    });

    it('should throw NotFoundException for invalid message', async () => {
      mockMessageModel.findById.mockResolvedValue(null);

      await expect(service.markAsRead(mockMessageId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markThreadAsRead', () => {
    it('should mark all unread messages in thread as read', async () => {
      mockMessageModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

      await service.markThreadAsRead(mockThreadId, mockUserId);

      expect(mockMessageModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: expect.any(Types.ObjectId),
          readBy: { $ne: expect.any(Types.ObjectId) },
        }),
        expect.objectContaining({
          $addToSet: { readBy: expect.any(Types.ObjectId) },
        }),
      );
    });

    it('should handle empty thread', async () => {
      mockMessageModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await expect(service.markThreadAsRead(mockThreadId, mockUserId)).resolves.not.toThrow();
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message', async () => {
      const message = createMockMessage({ isDeleted: false });
      mockMessageModel.findById.mockResolvedValue(message);

      await service.deleteMessage(mockMessageId, mockUserId);

      expect(message.isDeleted).toBe(true);
      expect(message.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid message', async () => {
      mockMessageModel.findById.mockResolvedValue(null);

      await expect(service.deleteMessage(mockMessageId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not sender', async () => {
      const message = createMockMessage({
        senderId: new Types.ObjectId(), // Different sender
      });
      mockMessageModel.findById.mockResolvedValue(message);

      await expect(service.deleteMessage(mockMessageId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread message count for user', async () => {
      const mockThreads = [
        { _id: new Types.ObjectId(mockThreadId) },
        { _id: new Types.ObjectId() },
      ];
      mockMessageThreadModel.find.mockReturnValue(createMockQuery(mockThreads));
      mockMessageModel.countDocuments.mockResolvedValue(10);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return zero when no unread messages', async () => {
      mockMessageThreadModel.find.mockReturnValue(createMockQuery([]));
      mockMessageModel.countDocuments.mockResolvedValue(0);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('archiveThread', () => {
    it('should archive thread for user', async () => {
      const thread = createMockThread({ archivedBy: [] });
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      await service.archiveThread(mockThreadId, mockUserId);

      expect(thread.archivedBy).toContain(expect.any(Types.ObjectId));
      expect(thread.save).toHaveBeenCalled();
    });

    it('should not duplicate archive status', async () => {
      const thread = createMockThread({
        archivedBy: [new Types.ObjectId(mockUserId)],
      });
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      await service.archiveThread(mockThreadId, mockUserId);

      expect(thread.archivedBy).toHaveLength(1);
    });

    it('should throw NotFoundException for invalid thread', async () => {
      mockMessageThreadModel.findById.mockResolvedValue(null);

      await expect(service.archiveThread(mockThreadId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unarchiveThread', () => {
    it('should unarchive thread for user', async () => {
      const thread = createMockThread({
        archivedBy: [new Types.ObjectId(mockUserId)],
      });
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      await service.unarchiveThread(mockThreadId, mockUserId);

      expect(thread.archivedBy).toHaveLength(0);
      expect(thread.save).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent message sends', async () => {
      const thread = createMockThread();
      mockMessageThreadModel.findById.mockResolvedValue(thread);
      mockMessageThreadModel.findByIdAndUpdate.mockResolvedValue(thread);

      const dto1: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'text',
        content: 'Message 1',
      };

      const dto2: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'text',
        content: 'Message 2',
      };

      const [result1, result2] = await Promise.all([
        service.sendMessage(dto1, mockUserId),
        service.sendMessage(dto2, mockUserId),
      ]);

      expect(result1.content).toBe('Message 1');
      expect(result2.content).toBe('Message 2');
    });

    it('should handle empty content for non-text messages', async () => {
      const thread = createMockThread();
      mockMessageThreadModel.findById.mockResolvedValue(thread);

      const dto: SendMessageDto = {
        threadId: mockThreadId,
        messageType: 'file',
        content: '',
        attachments: [
          {
            fileId: 'file123',
            filename: 'image.png',
            mimeType: 'image/png',
            size: 2048,
          },
        ],
      };

      const result = await service.sendMessage(dto, mockUserId);

      expect(result.messageType).toBe('file');
      expect(result.attachments).toHaveLength(1);
    });

    it('should handle large pagination requests', async () => {
      const mockMessages = Array.from({ length: 100 }, () => createMockMessage());
      mockMessageModel.find.mockReturnValue(createMockQuery(mockMessages));
      mockMessageModel.countDocuments.mockResolvedValue(1000);

      const result = await service.getMessages(mockThreadId, mockUserId, {
        page: 1,
        limit: 100,
      });

      expect(result.messages).toHaveLength(100);
      expect(result.totalPages).toBe(10);
    });
  });
});
