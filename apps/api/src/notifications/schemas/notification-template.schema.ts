import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationTemplateDocument = NotificationTemplate & Document;

export interface DefaultChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

@Schema({ collection: 'notification_templates', timestamps: true })
export class NotificationTemplate {
  @Prop({ required: true, unique: true, index: true })
  type!: string; // Matches notification.type

  @Prop({ required: true })
  titleTemplate!: string; // Handlebars template

  @Prop({ required: true })
  messageTemplate!: string; // Handlebars template

  @Prop()
  emailSubjectTemplate?: string;

  @Prop()
  emailBodyTemplate?: string; // HTML template

  @Prop()
  smsTemplate?: string;

  @Prop({ type: Object, required: true })
  defaultChannels!: DefaultChannels;

  @Prop({ enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' })
  defaultPriority!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const NotificationTemplateSchema =
  SchemaFactory.createForClass(NotificationTemplate);

// Ensure type is unique
NotificationTemplateSchema.index({ type: 1 }, { unique: true });

// Ensure virtuals are serialized
NotificationTemplateSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
