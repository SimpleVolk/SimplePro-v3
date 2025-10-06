import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
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
import {
  createSizeMonitoringMiddleware,
  createArraySizeMonitoringMiddleware,
} from '../../database/document-size-monitoring.middleware';

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
    type: String,
    enum: ['local', 'long_distance', 'storage', 'packing_only'],
    index: true,
  })
  type!: 'local' | 'long_distance' | 'storage' | 'packing_only';

  @Prop({
    required: true,
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'scheduled',
    index: true,
  })
  status!: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

  @Prop({
    required: true,
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true,
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

// Document size monitoring middleware (prevent 16MB limit issues)
JobSchema.pre(
  'save',
  createSizeMonitoringMiddleware({
    maxSizeMB: 10,
    warnThresholdPercent: 70,
    logWarnings: true,
    throwOnExceed: true,
  }),
);

// Array size monitoring middleware (warn about unbounded arrays)
JobSchema.pre(
  'save',
  createArraySizeMonitoringMiddleware(
    [
      'assignedCrew',
      'inventory',
      'services',
      'equipment',
      'milestones',
      'photos',
      'documents',
      'customerNotifications',
      'internalNotes',
      'additionalCharges',
    ],
    500, // Maximum 500 items per array
  ),
);

// Foreign key validation middleware
JobSchema.pre('save', async function (next) {
  try {
    // Validate customerId reference (required)
    if (this.customerId) {
      const Customer = mongoose.model('Customer');
      const customerExists = await Customer.exists({ _id: this.customerId });
      if (!customerExists) {
        throw new Error(`Referenced Customer not found: ${this.customerId}`);
      }
    }

    // Validate estimateId reference (optional)
    if (this.estimateId) {
      const Estimate = mongoose.model('Estimate');
      const estimateExists = await Estimate.exists({ _id: this.estimateId });
      if (!estimateExists) {
        throw new Error(`Referenced Estimate not found: ${this.estimateId}`);
      }
    }

    // Validate invoiceId reference (optional)
    if (this.invoiceId) {
      const Invoice = mongoose.model('Invoice');
      const invoiceExists = await Invoice.exists({ _id: this.invoiceId });
      if (!invoiceExists) {
        throw new Error(`Referenced Invoice not found: ${this.invoiceId}`);
      }
    }

    // Validate leadCrew reference (optional)
    if (this.leadCrew) {
      const User = mongoose.model('User');
      const leadCrewExists = await User.exists({ _id: this.leadCrew });
      if (!leadCrewExists) {
        throw new Error(
          `Referenced User (leadCrew) not found: ${this.leadCrew}`,
        );
      }
    }

    // Validate assignedCrew references
    if (this.assignedCrew && this.assignedCrew.length > 0) {
      const User = mongoose.model('User');
      for (const assignment of this.assignedCrew) {
        if (assignment.crewMemberId) {
          const crewExists = await User.exists({
            _id: assignment.crewMemberId,
          });
          if (!crewExists) {
            throw new Error(
              `Referenced User (crewMemberId) not found: ${assignment.crewMemberId}`,
            );
          }
        }
      }
    }

    // Validate createdBy reference (required)
    if (this.createdBy) {
      const User = mongoose.model('User');
      const creatorExists = await User.exists({ _id: this.createdBy });
      if (!creatorExists) {
        throw new Error(
          `Referenced User (createdBy) not found: ${this.createdBy}`,
        );
      }
    }

    // Validate lastModifiedBy reference (required)
    if (this.lastModifiedBy) {
      const User = mongoose.model('User');
      const modifierExists = await User.exists({ _id: this.lastModifiedBy });
      if (!modifierExists) {
        throw new Error(
          `Referenced User (lastModifiedBy) not found: ${this.lastModifiedBy}`,
        );
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add indexes for optimal performance (OPTIMIZED - removed redundant indexes)
JobSchema.index({ jobNumber: 1 }, { unique: true });
JobSchema.index({ customerId: 1 }); // Frequently used for job lookups by customer
JobSchema.index({ status: 1 }); // Used for status-based queries (dashboard, reports)
JobSchema.index({ type: 1 }); // Used for filtering by job type
JobSchema.index({ priority: 1 }); // Used for priority-based sorting
JobSchema.index({ scheduledDate: 1 }); // Used for calendar and scheduling queries
JobSchema.index({ 'assignedCrew.crewMemberId': 1 }); // Used for crew member job lookups
JobSchema.index({ leadCrew: 1 }); // Used for filtering by lead crew
JobSchema.index({ estimateId: 1 }); // Used for estimate to job linking
JobSchema.index({ invoiceId: 1 }); // Used for invoice to job linking
JobSchema.index({ createdBy: 1 }); // Used for filtering by creator

// Compound indexes for common queries (OPTIMIZED - removed redundant ones)
JobSchema.index({ type: 1, status: 1 }); // Used for filtering by type and status
JobSchema.index({ 'assignedCrew.crewMemberId': 1, status: 1 }); // Used for crew member active jobs
JobSchema.index({ status: 1, scheduledDate: -1 }); // PERFORMANCE: Dashboard queries (active jobs by date)
JobSchema.index({ customerId: 1, status: 1 }); // PERFORMANCE: Customer job history
JobSchema.index({ createdBy: 1, createdAt: -1 }); // PERFORMANCE: Sales performance analytics

// Text index for search functionality
JobSchema.index(
  {
    title: 'text',
    description: 'text',
    jobNumber: 'text',
    specialInstructions: 'text',
  },
  {
    weights: {
      jobNumber: 10,
      title: 5,
      description: 2,
      specialInstructions: 1,
    },
    name: 'job_text_search',
  },
);
