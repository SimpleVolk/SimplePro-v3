import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FollowUpRuleDocument = FollowUpRule & Document;

export enum EventType {
  OPPORTUNITY_CREATED = 'opportunity_created',
  QUOTE_SENT = 'quote_sent',
  ACTIVITY_COMPLETED = 'activity_completed',
  STATUS_CHANGED = 'status_changed',
  ESTIMATE_CREATED = 'estimate_created',
  NO_ACTIVITY = 'no_activity',
}

export enum ActionType {
  CREATE_ACTIVITY = 'create_activity',
  SEND_EMAIL = 'send_email',
  UPDATE_STATUS = 'update_status',
  ASSIGN_SALES_REP = 'assign_sales_rep',
  CREATE_JOB = 'create_job',
  SEND_NOTIFICATION = 'send_notification',
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface RuleTrigger {
  eventType: EventType;
  conditions: RuleCondition[];
}

export interface RuleAction {
  actionType: ActionType;
  delay: number; // hours
  template?: string;
  assignTo?: string; // userId or 'round_robin' or 'lead_owner'
  activityType?: string;
  subject?: string;
  description?: string;
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class FollowUpRule {
  @Prop({ required: true, unique: true })
  ruleId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Object, required: true })
  trigger: RuleTrigger;

  @Prop({ type: [Object], required: true })
  actions: RuleAction[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  priority: number;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;
}

export const FollowUpRuleSchema = SchemaFactory.createForClass(FollowUpRule);

// Indexes for efficient queries
FollowUpRuleSchema.index({ ruleId: 1 }, { unique: true });
FollowUpRuleSchema.index({ isActive: 1, priority: 1 });
FollowUpRuleSchema.index({ 'trigger.eventType': 1 });
