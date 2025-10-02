import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { CreateNotificationDto } from './dto';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationModel: any;
  let mockTemplateService: any;
  let mockPreferenceService: any;
  let mockDeliveryService: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockNotificationId = new Types.ObjectId().toString();
  const mockEntityId = new Types.ObjectId().toString();

  const createMockNotification = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    id: new Types.ObjectId().toString(),
    recipientId: new Types.ObjectId(mockUserId),
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'job_assigned',
    priority: 'normal',
    isRead: false,
    isArchived: false,
    deliveryChannels: {
      inApp: true,
      email: true,
      sms: false,
      push: true,
    },
    deliveryStatus: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedThis(),
    ...overrides,
  });

  const createMockQuery = (returnValue: any = null) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue),
  });

  beforeEach(async () => {
    // Mock NotificationTemplateService
    mockTemplateService = {
      renderNotification: jest.fn().mockResolvedValue({
        title: 'Rendered Title',
        message: 'Rendered message',
        defaultChannels: {
          inApp: true,
          email: true,
          sms: false,
          push: true,
        },
        defaultPriority: 'normal',
      }),
    };

    // Mock NotificationPreferenceService
    mockPreferenceService = {
      getPreferences: jest.fn().mockResolvedValue({
        userId: new Types.ObjectId(mockUserId),
        preferences: {
          job_assigned: {
            inApp: true,
            email: true,
            sms: false,
            push: true,
          },
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00',
        },
      }),
      isQuietHours: jest.fn().mockResolvedValue(false),
    };

    // Mock NotificationDeliveryService
    mockDeliveryService = {
      sendInAppNotification: jest.fn().mockResolvedValue(undefined),
      sendEmailNotification: jest.fn().mockResolvedValue(undefined),
      sendSmsNotification: jest.fn().mockResolvedValue(undefined),
      sendPushNotification: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Notification model
    mockNotificationModel = jest.fn().mockImplementation((data) => {
      const notification = createMockNotification(data);
      return notification;
    });
    mockNotificationModel.find = jest.fn();
    mockNotificationModel.findById = jest.fn();
    mockNotificationModel.findOne = jest.fn();
    mockNotificationModel.updateMany = jest.fn();
    mockNotificationModel.deleteOne = jest.fn();
    mockNotificationModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: NotificationPreferenceService,
          useValue: mockPreferenceService,
        },
        {
          provide: NotificationDeliveryService,
          useValue: mockDeliveryService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const createDto: CreateNotificationDto = {
      recipientId: mockUserId,
      type: 'job_assigned',
      data: {
        jobId: 'job123',
        jobTitle: 'Moving Job',
      },
    };

    it('should create notification successfully', async () => {
      const result = await service.createNotification(createDto);

      expect(mockTemplateService.renderNotification).toHaveBeenCalledWith(
        'job_assigned',
        createDto.data,
      );
      expect(mockPreferenceService.getPreferences).toHaveBeenCalledWith(mockUserId);
      expect(result).toBeDefined();
      expect(result.title).toBe('Rendered Title');
      expect(result.message).toBe('Rendered message');
    });

    it('should use user channel preferences', async () => {
      mockPreferenceService.getPreferences.mockResolvedValue({
        preferences: {
          job_assigned: {
            inApp: true,
            email: false,
            sms: true,
            push: false,
          },
        },
      });

      const result = await service.createNotification(createDto);

      expect(result.deliveryChannels.inApp).toBe(true);
      expect(result.deliveryChannels.email).toBe(false);
      expect(result.deliveryChannels.sms).toBe(true);
      expect(result.deliveryChannels.push).toBe(false);
    });

    it('should respect quiet hours for non-urgent notifications', async () => {
      mockPreferenceService.isQuietHours.mockResolvedValue(true);

      const result = await service.createNotification(createDto);

      // During quiet hours, only in-app notifications
      expect(result.deliveryChannels.inApp).toBe(true);
      expect(result.deliveryChannels.email).toBe(false);
      expect(result.deliveryChannels.sms).toBe(false);
      expect(result.deliveryChannels.push).toBe(false);
    });

    it('should ignore quiet hours for urgent notifications', async () => {
      mockPreferenceService.isQuietHours.mockResolvedValue(true);

      const urgentDto: CreateNotificationDto = {
        ...createDto,
        priority: 'urgent',
      };

      const result = await service.createNotification(urgentDto);

      // Urgent notifications bypass quiet hours
      expect(result.deliveryChannels.email).toBe(true);
    });

    it('should set related entity information', async () => {
      const dtoWithEntity: CreateNotificationDto = {
        ...createDto,
        relatedEntityType: 'job',
        relatedEntityId: mockEntityId,
      };

      const result = await service.createNotification(dtoWithEntity);

      expect(result.relatedEntityType).toBe('job');
      expect(result.relatedEntityId).toBeDefined();
    });

    it('should set action data', async () => {
      const dtoWithAction: CreateNotificationDto = {
        ...createDto,
        actionData: {
          type: 'navigate',
          route: '/jobs/123',
        },
      };

      const result = await service.createNotification(dtoWithAction);

      expect(result.actionData).toEqual({
        type: 'navigate',
        route: '/jobs/123',
      });
    });

    it('should send notification asynchronously', async () => {
      await service.createNotification(createDto);

      // Wait for async send to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockDeliveryService.sendInAppNotification).toHaveBeenCalled();
      expect(mockDeliveryService.sendEmailNotification).toHaveBeenCalled();
    });

    it('should handle template rendering errors', async () => {
      mockTemplateService.renderNotification.mockRejectedValue(
        new Error('Template not found'),
      );

      await expect(service.createNotification(createDto)).rejects.toThrow();
    });
  });

  describe('sendNotification', () => {
    it('should send to all enabled channels', async () => {
      const notification = createMockNotification({
        deliveryChannels: {
          inApp: true,
          email: true,
          sms: true,
          push: true,
        },
      });

      await service.sendNotification(notification);

      expect(mockDeliveryService.sendInAppNotification).toHaveBeenCalledWith(notification);
      expect(mockDeliveryService.sendEmailNotification).toHaveBeenCalledWith(notification);
      expect(mockDeliveryService.sendSmsNotification).toHaveBeenCalledWith(notification);
      expect(mockDeliveryService.sendPushNotification).toHaveBeenCalledWith(notification);
    });

    it('should send only to in-app channel when others disabled', async () => {
      const notification = createMockNotification({
        deliveryChannels: {
          inApp: true,
          email: false,
          sms: false,
          push: false,
        },
      });

      await service.sendNotification(notification);

      expect(mockDeliveryService.sendInAppNotification).toHaveBeenCalled();
      expect(mockDeliveryService.sendEmailNotification).not.toHaveBeenCalled();
      expect(mockDeliveryService.sendSmsNotification).not.toHaveBeenCalled();
      expect(mockDeliveryService.sendPushNotification).not.toHaveBeenCalled();
    });

    it('should handle delivery failures gracefully', async () => {
      const notification = createMockNotification({
        deliveryChannels: {
          inApp: true,
          email: true,
          sms: false,
          push: false,
        },
      });

      mockDeliveryService.sendEmailNotification.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      // Should not throw error
      await expect(service.sendNotification(notification)).resolves.not.toThrow();

      // In-app should still be sent
      expect(mockDeliveryService.sendInAppNotification).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all notifications for user', async () => {
      const mockNotifications = [createMockNotification(), createMockNotification()];
      mockNotificationModel.find.mockReturnValue(createMockQuery(mockNotifications));

      const result = await service.findAll(mockUserId, {});

      expect(mockNotificationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toEqual(mockNotifications);
    });

    it('should filter unread notifications', async () => {
      const mockNotifications = [createMockNotification({ isRead: false })];
      mockNotificationModel.find.mockReturnValue(createMockQuery(mockNotifications));

      await service.findAll(mockUserId, { unreadOnly: true });

      expect(mockNotificationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: false,
        }),
      );
    });

    it('should filter by type', async () => {
      const mockNotifications = [createMockNotification({ type: 'job_assigned' })];
      mockNotificationModel.find.mockReturnValue(createMockQuery(mockNotifications));

      await service.findAll(mockUserId, { type: 'job_assigned' });

      expect(mockNotificationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job_assigned',
        }),
      );
    });

    it('should filter by priority', async () => {
      const mockNotifications = [createMockNotification({ priority: 'urgent' })];
      mockNotificationModel.find.mockReturnValue(createMockQuery(mockNotifications));

      await service.findAll(mockUserId, { priority: 'urgent' });

      expect(mockNotificationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent',
        }),
      );
    });

    it('should apply pagination', async () => {
      const mockNotifications = [createMockNotification()];
      const mockQuery = createMockQuery(mockNotifications);
      mockNotificationModel.find.mockReturnValue(mockQuery);

      await service.findAll(mockUserId, { skip: 10, limit: 20 });

      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should use default limit when not provided', async () => {
      const mockNotifications = [createMockNotification()];
      const mockQuery = createMockQuery(mockNotifications);
      mockNotificationModel.find.mockReturnValue(mockQuery);

      await service.findAll(mockUserId, {});

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('findById', () => {
    it('should return notification by ID', async () => {
      const mockNotification = createMockNotification();
      mockNotificationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockNotification),
      });

      const result = await service.findById(mockNotificationId);

      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when not found', async () => {
      mockNotificationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById(mockNotificationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = createMockNotification();
      mockNotificationModel.findOne.mockResolvedValue(mockNotification);

      await service.markAsRead(mockNotificationId, mockUserId);

      expect(mockNotification.isRead).toBe(true);
      expect(mockNotification.readAt).toBeInstanceOf(Date);
      expect(mockNotification.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockNotificationModel.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(mockNotificationId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only mark notifications belonging to user', async () => {
      const otherUserId = new Types.ObjectId().toString();
      mockNotificationModel.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(mockNotificationId, otherUserId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockNotificationModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          recipientId: expect.any(Types.ObjectId),
        }),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

      await service.markAllAsRead(mockUserId);

      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: expect.any(Types.ObjectId),
          isRead: false,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            isRead: true,
            readAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should only update unread notifications', async () => {
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await service.markAllAsRead(mockUserId);

      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: false,
        }),
        expect.anything(),
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      mockNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.deleteNotification(mockNotificationId, mockUserId);

      expect(mockNotificationModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          recipientId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(service.deleteNotification(mockNotificationId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only delete notifications belonging to user', async () => {
      const otherUserId = new Types.ObjectId().toString();
      mockNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(service.deleteNotification(mockNotificationId, otherUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(7);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(7);
      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: expect.any(Types.ObjectId),
          isRead: false,
        }),
      );
    });

    it('should return zero when no unread notifications', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(0);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('archiveNotification', () => {
    it('should archive notification', async () => {
      const mockNotification = createMockNotification();
      mockNotificationModel.findOne.mockResolvedValue(mockNotification);

      await service.archiveNotification(mockNotificationId, mockUserId);

      expect(mockNotification.isArchived).toBe(true);
      expect(mockNotification.archivedAt).toBeInstanceOf(Date);
      expect(mockNotification.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockNotificationModel.findOne.mockResolvedValue(null);

      await expect(service.archiveNotification(mockNotificationId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only archive notifications belonging to user', async () => {
      const otherUserId = new Types.ObjectId().toString();
      mockNotificationModel.findOne.mockResolvedValue(null);

      await expect(service.archiveNotification(mockNotificationId, otherUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent notification creation', async () => {
      const dto1: CreateNotificationDto = {
        recipientId: mockUserId,
        type: 'job_assigned',
        data: { jobId: 'job1' },
      };

      const dto2: CreateNotificationDto = {
        recipientId: mockUserId,
        type: 'job_completed',
        data: { jobId: 'job2' },
      };

      const [result1, result2] = await Promise.all([
        service.createNotification(dto1),
        service.createNotification(dto2),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle missing user preferences gracefully', async () => {
      mockPreferenceService.getPreferences.mockResolvedValue(null);

      const dto: CreateNotificationDto = {
        recipientId: mockUserId,
        type: 'job_assigned',
        data: {},
      };

      // Should still create notification with default channels
      const result = await service.createNotification(dto);
      expect(result).toBeDefined();
    });

    it('should handle notifications without related entity', async () => {
      const dto: CreateNotificationDto = {
        recipientId: mockUserId,
        type: 'system_alert',
        data: { message: 'System maintenance scheduled' },
      };

      const result = await service.createNotification(dto);

      expect(result.relatedEntityType).toBeUndefined();
      expect(result.relatedEntityId).toBeUndefined();
    });

    it('should handle bulk operations efficiently', async () => {
      const notifications = Array.from({ length: 100 }, () => createMockNotification());
      mockNotificationModel.find.mockReturnValue(createMockQuery(notifications));

      const result = await service.findAll(mockUserId, { limit: 100 });

      expect(result).toHaveLength(100);
    });
  });
});
