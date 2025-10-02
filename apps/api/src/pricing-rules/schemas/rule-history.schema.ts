import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RuleHistoryDocument = RuleHistory & Document;

@Schema({ collection: 'rule-history', timestamps: false })
export class RuleHistory {
  @Prop({ required: true, index: true })
  ruleId!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['created', 'updated', 'deleted', 'activated', 'deactivated', 'imported', 'exported'],
    index: true
  })
  action!: string;

  @Prop({ type: Object, default: {} })
  changes!: Record<string, { old: any; new: any }>;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  userName!: string;

  @Prop({ default: Date.now, index: true })
  timestamp!: Date;

  @Prop()
  reason?: string;

  @Prop()
  clientIp?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const RuleHistorySchema = SchemaFactory.createForClass(RuleHistory);

// Create compound indexes for efficient querying
RuleHistorySchema.index({ ruleId: 1, timestamp: -1 });
RuleHistorySchema.index({ userId: 1, timestamp: -1 });
RuleHistorySchema.index({ action: 1, timestamp: -1 });

// TTL index to automatically clean up old history records (keep for 2 years)
RuleHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years in seconds