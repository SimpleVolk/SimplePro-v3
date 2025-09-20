import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  CrewAssignment,
  InventoryItem,
  JobService,
  EquipmentRequirement,
  JobMilestone,
  JobPhoto,
  CustomerNotification,
  InternalNote,
  AdditionalCharge,
} from '../interfaces/job.interface';

export type JobDocument = Job & Document;

@Schema({ collection: 'jobs', timestamps: true })
export class Job {
  @Prop({ required: true, unique: true, index: true })
  jobNumber!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ['local', 'long_distance', 'storage', 'packing_only'],
    index: true
  })
  type!: 'local' | 'long_distance' | 'storage' | 'packing_only';

  @Prop({
    required: true,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'scheduled',
    index: true
  })
  status!: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

  @Prop({
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  })
  priority!: 'low' | 'normal' | 'high' | 'urgent';

  // Related Records
  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop({ index: true })
  estimateId?: string;

  @Prop({ index: true })
  invoiceId?: string;

  // Scheduling Information
  @Prop({ required: true, type: Date, index: true })
  scheduledDate!: Date;

  @Prop({ required: true })
  scheduledStartTime!: string;

  @Prop({ required: true })
  scheduledEndTime!: string;

  @Prop({ required: true })
  estimatedDuration!: number;

  @Prop({ type: Date })
  actualStartTime?: Date;

  @Prop({ type: Date })
  actualEndTime?: Date;

  // Location Information
  @Prop({ type: Object, required: true })
  pickupAddress!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  @Prop({ type: Object, required: true })
  deliveryAddress!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  // Crew Assignment
  @Prop({ type: [Object], default: [] })
  assignedCrew!: CrewAssignment[];

  @Prop({ index: true })
  leadCrew?: string;

  @Prop()
  crewNotes?: string;

  // Job Details
  @Prop({ type: [Object], default: [] })
  inventory!: InventoryItem[];

  @Prop({ type: [Object], default: [] })
  services!: JobService[];

  @Prop()
  specialInstructions?: string;

  @Prop({ type: [Object], default: [] })
  equipment!: EquipmentRequirement[];

  // Pricing
  @Prop({ required: true })
  estimatedCost!: number;

  @Prop()
  actualCost?: number;

  @Prop()
  laborCost?: number;

  @Prop()
  materialsCost?: number;

  @Prop()
  transportationCost?: number;

  @Prop({ type: [Object], default: [] })
  additionalCharges!: AdditionalCharge[];

  // Progress Tracking
  @Prop({ type: [Object], default: [] })
  milestones!: JobMilestone[];

  @Prop({ type: [Object], default: [] })
  photos!: JobPhoto[];

  @Prop({ type: [Object], default: [] })
  documents!: JobDocument[];

  // Communication
  @Prop({ type: [Object], default: [] })
  customerNotifications!: CustomerNotification[];

  @Prop({ type: [Object], default: [] })
  internalNotes!: InternalNote[];

  // Audit Fields
  @Prop({ required: true })
  createdBy!: string;

  @Prop({ required: true })
  lastModifiedBy!: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Add indexes for optimal performance
JobSchema.index({ jobNumber: 1 }, { unique: true });
JobSchema.index({ customerId: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ type: 1 });
JobSchema.index({ priority: 1 });
JobSchema.index({ scheduledDate: 1 });
JobSchema.index({ 'assignedCrew.crewMemberId': 1 });
JobSchema.index({ leadCrew: 1 });
JobSchema.index({ estimateId: 1 });
JobSchema.index({ invoiceId: 1 });
JobSchema.index({ createdAt: 1 });
JobSchema.index({ updatedAt: 1 });
JobSchema.index({ createdBy: 1 });

// Compound indexes for common queries
JobSchema.index({ customerId: 1, status: 1 });
JobSchema.index({ scheduledDate: 1, status: 1 });
JobSchema.index({ type: 1, status: 1 });
JobSchema.index({ 'assignedCrew.crewMemberId': 1, status: 1 });

// Text index for search functionality
JobSchema.index({
  title: 'text',
  description: 'text',
  jobNumber: 'text',
  'specialInstructions': 'text'
}, {
  weights: {
    jobNumber: 10,
    title: 5,
    description: 2,
    specialInstructions: 1
  }
});