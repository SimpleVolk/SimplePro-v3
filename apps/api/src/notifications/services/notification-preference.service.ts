import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
  ChannelPreferences,
} from '../schemas/notification-preference.schema';
import { UpdatePreferencesDto } from '../dto';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    @InjectModel(NotificationPreference.name)
    private preferenceModel: Model<NotificationPreferenceDocument>,
  ) {}

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceDocument> {
    let preferences = await this.preferenceModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!preferences) {
      return await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreferenceDocument> {
    let preferences: NotificationPreferenceDocument | null = await this.preferenceModel.findOne({ userId: new Types.ObjectId(userId) }).exec();

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    if (dto.preferences) {
      preferences.preferences = { ...preferences.preferences, ...dto.preferences };
    }

    if (dto.quietHours) {
      preferences.quietHours = {
        enabled: dto.quietHours.enabled,
        start: dto.quietHours.start || '22:00',
        end: dto.quietHours.end || '07:00',
      };
    }

    if (dto.digestMode) {
      preferences.digestMode = dto.digestMode;
    }

    if (dto.soundEnabled !== undefined) {
      preferences.soundEnabled = dto.soundEnabled;
    }

    if (dto.vibrationEnabled !== undefined) {
      preferences.vibrationEnabled = dto.vibrationEnabled;
    }

    await preferences.save();

    return preferences;
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreferenceDocument> {
    const defaultChannels: ChannelPreferences = {
      inApp: true,
      email: true,
      sms: false,
      push: true,
    };

    const preferences = new this.preferenceModel({
      userId: new Types.ObjectId(userId),
      preferences: {
        job_assigned: defaultChannels,
        shift_reminder: { inApp: true, email: false, sms: true, push: true },
        customer_inquiry: defaultChannels,
        quote_request: defaultChannels,
        job_completed: { inApp: true, email: true, sms: false, push: false },
        payment_received: { inApp: true, email: true, sms: false, push: false },
        system_alert: { inApp: true, email: true, sms: false, push: true },
        message_received: { inApp: true, email: false, sms: false, push: true },
        time_off_approved: defaultChannels,
        time_off_denied: defaultChannels,
        schedule_change: { inApp: true, email: true, sms: true, push: true },
        document_uploaded: { inApp: true, email: false, sms: false, push: false },
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
      digestMode: 'immediate',
      soundEnabled: true,
      vibrationEnabled: true,
    });

    await preferences.save();
    this.logger.log(`Created default preferences for user ${userId}`);
    return preferences;
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  async shouldSendNotification(userId: string, type: string, channel: 'inApp' | 'email' | 'sms' | 'push'): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    const typePreferences = preferences.preferences[type as keyof typeof preferences.preferences];

    if (!typePreferences) {
      return true; // Default to true if no specific preference
    }

    return typePreferences[channel] || false;
  }

  /**
   * Check if current time is within quiet hours
   */
  async isQuietHours(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    if (!preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { start, end } = preferences.quietHours;

    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }
}
