import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TimeOffRequestDocument = TimeOffRequest & Document;

@Schema({ timestamps: true })
export class TimeOffRequest {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  crewMemberId!: Types.ObjectId;

  @Prop({ required: true, type: Date })
  startDate!: Date;

  @Prop({ required: true, type: Date })
  endDate!: Date;

  @Prop({
    required: true,
    enum: ['vacation', 'sick', 'personal', 'other'],
  })
  type!: string;

  @Prop()
  reason?: string;

  @Prop({
    required: true,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop()
  reviewNotes?: string;
}

export const TimeOffRequestSchema =
  SchemaFactory.createForClass(TimeOffRequest);

// Indexes
TimeOffRequestSchema.index({ crewMemberId: 1, status: 1 });
TimeOffRequestSchema.index({ startDate: 1, endDate: 1 });
