import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference & Document;

export interface ChannelPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface NotificationTypePreferences {
  job_assigned?: ChannelPreferences;
  shift_reminder?: ChannelPreferences;
  customer_inquiry?: ChannelPreferences;
  quote_request?: ChannelPreferences;
  job_completed?: ChannelPreferences;
  payment_received?: ChannelPreferences;
  system_alert?: ChannelPreferences;
  message_received?: ChannelPreferences;
  time_off_approved?: ChannelPreferences;
  time_off_denied?: ChannelPreferences;
  schedule_change?: ChannelPreferences;
  document_uploaded?: ChannelPreferences;
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
}

@Schema({ collection: 'notification_preferences', timestamps: true })
export class NotificationPreference {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  preferences!: NotificationTypePreferences;

  @Prop({
    type: Object,
    default: { enabled: false, start: '22:00', end: '07:00' },
  })
  quietHours!: QuietHours;

  @Prop({ enum: ['immediate', 'hourly', 'daily'], default: 'immediate' })
  digestMode!: string;

  @Prop({ default: true })
  soundEnabled!: boolean;

  @Prop({ default: true })
  vibrationEnabled!: boolean;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);

// NOTE: userId unique index is created automatically by @Prop({ unique: true, index: true })

// Ensure virtuals are serialized
NotificationPreferenceSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
