import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export interface ActionData {
  type: 'navigate' | 'action';
  route?: string;
  action?: string;
  params?: Record<string, any>;
}

export interface DeliveryChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface DeliveryStatus {
  inApp?: { sent: boolean; sentAt?: Date };
  email?: { sent: boolean; sentAt?: Date; error?: string };
  sms?: { sent: boolean; sentAt?: Date; error?: string };
  push?: { sent: boolean; sentAt?: Date; error?: string };
}

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  recipientId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({
    required: true,
    enum: [
      'job_assigned',
      'shift_reminder',
      'customer_inquiry',
      'quote_request',
      'job_completed',
      'payment_received',
      'system_alert',
      'message_received',
      'time_off_approved',
      'time_off_denied',
      'schedule_change',
      'document_uploaded',
    ],
    index: true,
  })
  type!: string;

  @Prop({
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true,
  })
  priority!: string;

  @Prop({ enum: ['customer', 'job', 'estimate', 'message', 'user', 'system'] })
  relatedEntityType?: string;

  @Prop({ type: Types.ObjectId })
  relatedEntityId?: Types.ObjectId;

  @Prop({ type: Object })
  actionData?: ActionData;

  // Delivery tracking
  @Prop({
    type: Object,
    default: { inApp: false, email: false, sms: false, push: false },
  })
  deliveryChannels!: DeliveryChannels;

  @Prop({ type: Object, default: {} })
  deliveryStatus!: DeliveryStatus;

  @Prop({ default: false, index: true })
  isRead!: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: false })
  isArchived!: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Foreign key validation middleware
NotificationSchema.pre('save', async function (next) {
  try {
    // Validate recipientId reference (required)
    if (this.recipientId) {
      const User = mongoose.model('User');
      const recipientExists = await User.exists({ _id: this.recipientId });
      if (!recipientExists) {
        throw new Error(`Referenced User (recipientId) not found: ${this.recipientId}`);
      }
    }

    // Validate relatedEntityId if present
    if (this.relatedEntityId && this.relatedEntityType) {
      let modelName: string;
      switch (this.relatedEntityType) {
        case 'customer':
          modelName = 'Customer';
          break;
        case 'job':
          modelName = 'Job';
          break;
        case 'estimate':
          modelName = 'Estimate';
          break;
        case 'message':
          modelName = 'Message';
          break;
        case 'user':
          modelName = 'User';
          break;
        default:
          return next(); // Skip validation for system or unknown types
      }

      const Model = mongoose.model(modelName);
      const entityExists = await Model.exists({ _id: this.relatedEntityId });
      if (!entityExists) {
        throw new Error(`Referenced ${modelName} not found: ${this.relatedEntityId}`);
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compound indexes for efficient queries (OPTIMIZED)
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 }); // Unread notifications
NotificationSchema.index({ recipientId: 1, type: 1 }); // Notifications by type
NotificationSchema.index({ recipientId: 1, priority: 1 }); // Priority notifications
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

// Ensure virtuals are serialized
NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
