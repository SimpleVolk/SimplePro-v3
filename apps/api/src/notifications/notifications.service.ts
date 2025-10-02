import { Injectable, NotFoundException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto, NotificationFiltersDto } from './dto';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private templateService: NotificationTemplateService,
    private preferenceService: NotificationPreferenceService,
    @Inject(forwardRef(() => NotificationDeliveryService))
    private deliveryService: NotificationDeliveryService,
  ) {}

  /**
   * Create and send a notification
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    try {
      // Render notification from template
      const rendered = await this.templateService.renderNotification(dto.type, dto.data || {});

      // Get user preferences to determine delivery channels
      const preferences = await this.preferenceService.getPreferences(dto.recipientId);

      // Determine which channels to use
      const userChannelPrefs = preferences.preferences[dto.type as keyof typeof preferences.preferences];
      const deliveryChannels = userChannelPrefs || rendered.defaultChannels;

      // Check quiet hours
      const isQuietHours = await this.preferenceService.isQuietHours(dto.recipientId);
      if (isQuietHours && dto.priority !== 'urgent') {
        // During quiet hours, only send in-app notifications unless urgent
        deliveryChannels.email = false;
        deliveryChannels.sms = false;
        deliveryChannels.push = false;
      }

      // Create notification document
      const notification = new this.notificationModel({
        recipientId: new Types.ObjectId(dto.recipientId),
        title: rendered.title,
        message: rendered.message,
        type: dto.type,
        priority: dto.priority || rendered.defaultPriority,
        relatedEntityType: dto.relatedEntityType,
        relatedEntityId: dto.relatedEntityId ? new Types.ObjectId(dto.relatedEntityId) : undefined,
        actionData: dto.actionData,
        deliveryChannels,
        deliveryStatus: {},
        metadata: dto.data,
      });

      await notification.save();

      // Send notification through appropriate channels asynchronously
      this.sendNotification(notification).catch((error) => {
        this.logger.error(`Failed to send notification ${notification.id}:`, error);
      });

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Send notification via all enabled channels
   */
  async sendNotification(notification: NotificationDocument): Promise<void> {
    const { deliveryChannels } = notification;

    const deliveryPromises: Promise<void>[] = [];

    if (deliveryChannels.inApp) {
      deliveryPromises.push(this.deliveryService.sendInAppNotification(notification));
    }

    if (deliveryChannels.email) {
      deliveryPromises.push(this.deliveryService.sendEmailNotification(notification));
    }

    if (deliveryChannels.sms) {
      deliveryPromises.push(this.deliveryService.sendSmsNotification(notification));
    }

    if (deliveryChannels.push) {
      deliveryPromises.push(this.deliveryService.sendPushNotification(notification));
    }

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Find all notifications for a user with filters
   */
  async findAll(userId: string, filters: NotificationFiltersDto): Promise<Notification[]> {
    const query: any = { recipientId: new Types.ObjectId(userId) };

    if (filters.unreadOnly) {
      query.isRead = false;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(filters.skip || 0)
      .limit(filters.limit || 50)
      .exec();

    return notifications;
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<Notification> {
    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(id),
      recipientId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(id),
      recipientId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  /**
   * Archive a notification
   */
  async archiveNotification(id: string, userId: string): Promise<void> {
    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(id),
      recipientId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    notification.isArchived = true;
    notification.archivedAt = new Date();
    await notification.save();
  }
}
