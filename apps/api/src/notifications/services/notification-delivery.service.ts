import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { NotificationConfigService } from '../config/notification-config.service';
import { NotificationTemplateService } from './notification-template.service';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 1000;

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
    private readonly configService: NotificationConfigService,
    private readonly templateService: NotificationTemplateService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Send in-app notification via WebSocket
   */
  async sendInAppNotification(notification: NotificationDocument): Promise<void> {
    try {
      // Send via WebSocket to connected clients
      this.websocketGateway.broadcastToUser(
        notification.recipientId.toString(),
        'notification.created',
        {
          id: notification._id?.toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          actionData: notification.actionData,
          relatedEntityType: notification.relatedEntityType,
          relatedEntityId: notification.relatedEntityId?.toString(),
          createdAt: (notification as any).createdAt,
        },
      );

      // Update delivery status
      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.inApp': {
            sent: true,
            sentAt: new Date(),
          },
        },
      });

      this.logger.log(`In-app notification sent to user ${notification.recipientId}`);
    } catch (error) {
      this.logger.error('Failed to send in-app notification:', error);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.inApp': {
            sent: false,
            error: error.message,
          },
        },
      });

      throw error;
    }
  }

  /**
   * Send email notification using Nodemailer
   */
  async sendEmailNotification(notification: NotificationDocument): Promise<void> {
    if (!this.configService.isEmailEnabled()) {
      this.logger.debug('Email notifications are disabled, skipping email delivery');
      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.email': {
            sent: false,
            sentAt: new Date(),
            error: 'Email service not configured',
          },
        },
      });
      return;
    }

    const deliveryFn = async () => {
      const user = await this.authService.findById(notification.recipientId.toString());
      if (!user || !user.email) {
        throw new Error('User email not found');
      }

      // Get rendered template
      const template = await this.templateService.renderNotification(
        notification.type,
        notification.metadata || {},
      );

      const emailSubject = template.emailSubject || notification.title;
      const emailBody = template.emailBody || `<p>${notification.message}</p>`;

      const transporter = this.configService.getEmailTransporter();
      if (!transporter) {
        throw new Error('Email transporter not available');
      }

      await transporter.sendMail({
        from: this.configService.getEmailFrom(),
        to: user.email,
        subject: emailSubject,
        html: emailBody,
      });

      this.logger.log(`Email notification sent to ${user.email}`);
    };

    try {
      await this.deliverWithRetry(deliveryFn, this.MAX_RETRIES);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.email': {
            sent: true,
            sentAt: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send email notification after ${this.MAX_RETRIES} retries:`, error.message);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.email': {
            sent: false,
            sentAt: new Date(),
            error: error.message,
          },
        },
      });
    }
  }

  /**
   * Send SMS notification using Twilio
   */
  async sendSmsNotification(notification: NotificationDocument): Promise<void> {
    if (!this.configService.isSmsEnabled()) {
      this.logger.debug('SMS notifications are disabled, skipping SMS delivery');
      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.sms': {
            sent: false,
            sentAt: new Date(),
            error: 'SMS service not configured',
          },
        },
      });
      return;
    }

    const deliveryFn = async () => {
      const user = await this.authService.findById(notification.recipientId.toString());
      if (!user || !user.phoneNumber) {
        throw new Error('User phone number not found');
      }

      // Get rendered template
      const template = await this.templateService.renderNotification(
        notification.type,
        notification.metadata || {},
      );

      const smsMessage = template.smsMessage || notification.message;

      const twilioClient = this.configService.getTwilioClient();
      if (!twilioClient) {
        throw new Error('Twilio client not available');
      }

      const twilioPhoneNumber = this.configService.getTwilioPhoneNumber();
      if (!twilioPhoneNumber) {
        throw new Error('Twilio phone number not configured');
      }

      await twilioClient.messages.create({
        body: smsMessage,
        from: twilioPhoneNumber,
        to: user.phoneNumber,
      });

      this.logger.log(`SMS notification sent to ${user.phoneNumber}`);
    };

    try {
      await this.deliverWithRetry(deliveryFn, this.MAX_RETRIES);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.sms': {
            sent: true,
            sentAt: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send SMS notification after ${this.MAX_RETRIES} retries:`, error.message);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.sms': {
            sent: false,
            sentAt: new Date(),
            error: error.message,
          },
        },
      });
    }
  }

  /**
   * Send push notification using Firebase FCM
   */
  async sendPushNotification(notification: NotificationDocument): Promise<void> {
    if (!this.configService.isPushEnabled()) {
      this.logger.debug('Push notifications are disabled, skipping push delivery');
      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.push': {
            sent: false,
            sentAt: new Date(),
            error: 'Push notification service not configured',
          },
        },
      });
      return;
    }

    const deliveryFn = async () => {
      const user = await this.authService.findById(notification.recipientId.toString());
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        throw new Error('No FCM tokens registered for user');
      }

      const firebaseAdmin = this.configService.getFirebaseAdmin();
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin not initialized');
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: {
          notificationId: notification._id?.toString() || '',
          type: notification.type,
          priority: notification.priority,
          actionData: JSON.stringify(notification.actionData || {}),
          relatedEntityType: notification.relatedEntityType || '',
          relatedEntityId: notification.relatedEntityId?.toString() || '',
        },
        tokens: user.fcmTokens,
      };

      const response = await firebaseAdmin.messaging().sendEachForMulticast(message);

      this.logger.log(`Push notification sent: ${response.successCount} successful, ${response.failureCount} failed`);

      // Remove invalid FCM tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // Check if error is due to invalid token
            const errorCode = (resp.error as any)?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(user.fcmTokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await this.authService.removeFcmTokens(user.id, invalidTokens);
          this.logger.log(`Removed ${invalidTokens.length} invalid FCM tokens for user ${user.id}`);
        }
      }

      // If all tokens failed, throw error
      if (response.successCount === 0) {
        throw new Error('All FCM tokens failed to send');
      }
    };

    try {
      await this.deliverWithRetry(deliveryFn, this.MAX_RETRIES);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.push': {
            sent: true,
            sentAt: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send push notification after ${this.MAX_RETRIES} retries:`, error.message);

      await this.notificationModel.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.push': {
            sent: false,
            sentAt: new Date(),
            error: error.message,
          },
        },
      });
    }
  }

  /**
   * Retry delivery with exponential backoff
   */
  private async deliverWithRetry(
    deliveryFn: () => Promise<void>,
    maxRetries: number = this.MAX_RETRIES,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await deliveryFn();
        return; // Success - exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Final attempt failed - throw error
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(`Delivery attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
