import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPreferenceService } from '../../notifications/services/notification-preference.service';
import { NotificationTemplateService } from '../../notifications/services/notification-template.service';

describe('NotificationsResolver', () => {
  let resolver: NotificationsResolver;
  let notificationsService: NotificationsService;

  const mockNotificationsService = {
    findById: jest.fn(),
    findAll: jest.fn(),
    getUnreadCount: jest.fn(),
    createNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    archiveNotification: jest.fn(),
  };

  const mockPreferenceService = {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  const mockTemplateService = {
    getTemplate: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsResolver,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: NotificationPreferenceService,
          useValue: mockPreferenceService,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    resolver = module.get<NotificationsResolver>(NotificationsResolver);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return notifications for a user', async () => {
      const req = { user: { sub: 'user-123' } };
      const filters = { isRead: false };
      const mockNotifications = [
        { id: 'notif-1', recipientId: 'user-123', type: 'job_update' },
        { id: 'notif-2', recipientId: 'user-123', type: 'message' },
      ];

      mockNotificationsService.findAll.mockResolvedValue(mockNotifications);

      const result = await resolver.getNotifications(filters, req);

      expect(result).toEqual(mockNotifications);
      expect(notificationsService.findAll).toHaveBeenCalledWith(
        'user-123',
        filters,
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notif-123';
      const req = { user: { sub: 'user-456' } };

      mockNotificationsService.markAsRead.mockResolvedValue(undefined);

      const result = await resolver.markAsRead(notificationId, req);

      expect(result).toBe(true);
      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        notificationId,
        'user-456',
      );
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      const input = {
        channels: {
          email: true,
          sms: false,
          push: true,
        },
      };
      const req = { user: { sub: 'user-789' } };

      const mockUpdatedPreferences = {
        userId: 'user-789',
        ...input,
      };

      mockPreferenceService.updatePreferences.mockResolvedValue(
        mockUpdatedPreferences,
      );

      const result = await resolver.updatePreferences(input, req);

      expect(result).toEqual(mockUpdatedPreferences);
    });
  });
});
