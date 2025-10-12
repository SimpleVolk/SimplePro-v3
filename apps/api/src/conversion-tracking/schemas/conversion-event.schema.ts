import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversionEventDocument = ConversionEvent & Document;

// Enums for event types
export enum ConversionEventType {
  LEAD_CREATED = 'lead_created',
  OPPORTUNITY_CREATED = 'opportunity_created',
  QUOTE_SENT = 'quote_sent',
  QUOTE_VIEWED = 'quote_viewed',
  FOLLOW_UP_COMPLETED = 'follow_up_completed',
  QUOTE_ACCEPTED = 'quote_accepted',
  QUOTE_REJECTED = 'quote_rejected',
  JOB_CREATED = 'job_created',
  JOB_COMPLETED = 'job_completed',
  PAYMENT_RECEIVED = 'payment_received',
}

// Enums for source channels
export enum SourceChannel {
  WEBSITE = 'website',
  PHONE = 'phone',
  REFERRAL = 'referral',
  PARTNER = 'partner',
  REPEAT_CUSTOMER = 'repeat_customer',
  SOCIAL_MEDIA = 'social_media',
  EMAIL = 'email',
  WALK_IN = 'walk_in',
}

// Sub-schema for touchpoints
@Schema({ _id: false })
export class Touchpoint {
  @Prop({ required: true })
  channel!: string;

  @Prop({ required: true })
  date!: Date;

  @Prop({ type: Object })
  metadata!: Record<string, any>;
}

// Sub-schema for attribution
@Schema({ _id: false })
export class Attribution {
  @Prop()
  firstTouchChannel!: string;

  @Prop()
  lastTouchChannel!: string;

  @Prop({ type: [Touchpoint], default: [] })
  touchpoints!: Touchpoint[];
}

// Main schema
@Schema({ timestamps: true })
export class ConversionEvent {
  @Prop({ required: true, unique: true })
  eventId!: string;

  @Prop({ required: true })
  customerId!: string;

  @Prop()
  opportunityId!: string;

  @Prop()
  estimateId!: string;

  @Prop()
  jobId!: string;

  @Prop({
    required: true,
    enum: Object.values(ConversionEventType),
  })
  eventType!: ConversionEventType;

  @Prop({ required: true })
  eventDate!: Date;

  @Prop({ type: Object })
  eventData!: Record<string, any>;

  @Prop()
  performedBy!: string;

  @Prop({ enum: Object.values(SourceChannel) })
  sourceChannel!: SourceChannel;

  @Prop({ type: Attribution })
  attribution!: Attribution;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

export const ConversionEventSchema =
  SchemaFactory.createForClass(ConversionEvent);

// Compound indexes
ConversionEventSchema.index({ customerId: 1, eventDate: -1 });
ConversionEventSchema.index({ opportunityId: 1, eventType: 1 });
ConversionEventSchema.index({ eventType: 1, eventDate: -1 });
ConversionEventSchema.index({ sourceChannel: 1, eventDate: -1 });
