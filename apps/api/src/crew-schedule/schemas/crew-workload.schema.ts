import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CrewWorkloadDocument = CrewWorkload & Document;

@Schema({ timestamps: true })
export class CrewWorkload {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  crewMemberId!: Types.ObjectId;

  @Prop({ required: true, type: Date })
  weekStartDate!: Date; // Monday of the week

  @Prop({ default: 0 })
  totalJobs!: number;

  @Prop({ default: 0 })
  scheduledJobs!: number;

  @Prop({ default: 0 })
  inProgressJobs!: number;

  @Prop({ default: 0 })
  completedJobs!: number;

  @Prop({ default: 0 })
  hoursWorked!: number;

  @Prop({ default: 0 })
  utilizationRate!: number; // percentage

  @Prop({ default: false })
  isOverloaded!: boolean; // >5 jobs per week

  @Prop({ type: Date, default: Date.now })
  lastUpdated!: Date;
}

export const CrewWorkloadSchema = SchemaFactory.createForClass(CrewWorkload);

// Indexes
CrewWorkloadSchema.index(
  { crewMemberId: 1, weekStartDate: 1 },
  { unique: true },
);
CrewWorkloadSchema.index({ weekStartDate: 1 });
CrewWorkloadSchema.index({ isOverloaded: 1 });
