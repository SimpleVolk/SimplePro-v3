import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CrewAvailabilityDocument = CrewAvailability & Document;

@Schema({ timestamps: true })
export class CrewAvailability {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  crewMemberId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  date: Date; // YYYY-MM-DD

  @Prop({ required: true })
  startTime: string; // HH:mm format

  @Prop({ required: true })
  endTime: string; // HH:mm format

  @Prop({
    required: true,
    enum: ['available', 'busy', 'time_off'],
    default: 'available',
  })
  status: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({
    type: String,
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
  })
  recurringDay?: string;
}

export const CrewAvailabilitySchema =
  SchemaFactory.createForClass(CrewAvailability);

// Indexes
CrewAvailabilitySchema.index({ crewMemberId: 1, date: 1 });
CrewAvailabilitySchema.index({ date: 1, status: 1 });
