import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeadActivityDocument = LeadActivity & Document;

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  QUOTE_SENT = 'quote_sent',
  FOLLOW_UP = 'follow_up',
  NOTE = 'note',
  STATUS_CHANGE = 'status_change',
}

export enum ActivityOutcome {
  SUCCESSFUL = 'successful',
  NO_ANSWER = 'no_answer',
  VOICEMAIL = 'voicemail',
  CALLBACK_REQUESTED = 'callback_requested',
  NOT_INTERESTED = 'not_interested',
  CONVERTED = 'converted',
}

@Schema({ timestamps: true })
export class LeadActivity {
  @Prop({ required: true, unique: true })
  activityId!: string;

  @Prop({ required: true })
  opportunityId!: string;

  @Prop({ required: true })
  customerId!: string;

  @Prop({
    type: String,
    enum: Object.values(ActivityType),
    required: true,
  })
  activityType!: ActivityType;

  @Prop({ required: true })
  subject!: string;

  @Prop()
  description!: string;

  @Prop({
    type: String,
    enum: Object.values(ActivityOutcome),
  })
  outcome?: ActivityOutcome;

  @Prop()
  scheduledDate?: Date;

  @Prop()
  completedDate?: Date;

  @Prop()
  dueDate?: Date;

  @Prop({ required: true })
  assignedTo!: string;

  @Prop()
  completedBy?: string;

  @Prop({ type: Object, default: {} })
  metadata!: {
    phoneDuration?: number;
    emailOpened?: boolean;
    quoteValue?: number;
    meetingLocation?: string;
    automationRuleId?: string;
    [key: string]: any;
  };

  @Prop({ required: true })
  createdBy!: string;

  @Prop()
  updatedBy?: string;
}

export const LeadActivitySchema = SchemaFactory.createForClass(LeadActivity);

// Indexes for efficient queries
LeadActivitySchema.index({ activityId: 1 }, { unique: true });
LeadActivitySchema.index({ opportunityId: 1, activityType: 1 });
LeadActivitySchema.index({ customerId: 1, createdAt: -1 });
LeadActivitySchema.index({ assignedTo: 1, dueDate: 1, completedDate: 1 });
LeadActivitySchema.index({ scheduledDate: 1 });
LeadActivitySchema.index({ createdAt: -1 });

// Compound index for finding overdue activities
LeadActivitySchema.index(
  {
    dueDate: 1,
    completedDate: 1,
  },
  {
    partialFilterExpression: {
      completedDate: { $exists: false },
    },
  },
);
