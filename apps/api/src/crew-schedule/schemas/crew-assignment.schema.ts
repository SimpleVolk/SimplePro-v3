import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CrewAssignmentDocument = CrewAssignment & Document;

@Schema({ timestamps: true })
export class CrewAssignment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, type: [{ type: Types.ObjectId, ref: 'User' }] })
  crewMembers: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  crewLeadId?: Types.ObjectId;

  @Prop({ required: true, type: Date })
  assignedDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  @Prop({ enum: ['manual', 'auto'], default: 'manual' })
  assignmentMethod: string;

  @Prop({ type: Object })
  autoAssignmentScores?: Record<string, number>; // crewMemberId -> score

  @Prop({ default: false })
  isConfirmed: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  confirmedBy?: Types.ObjectId[];

  @Prop()
  notes?: string;
}

export const CrewAssignmentSchema =
  SchemaFactory.createForClass(CrewAssignment);

// Indexes
CrewAssignmentSchema.index({ jobId: 1 });
CrewAssignmentSchema.index({ crewMembers: 1, assignedDate: 1 });
