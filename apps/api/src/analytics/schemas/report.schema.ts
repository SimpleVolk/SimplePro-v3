import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ collection: 'reports', timestamps: true })
export class Report {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({
    required: true,
    type: String,
    enum: [
      'revenue',
      'performance',
      'operations',
      'crew',
      'customer',
      'custom',
    ],
    index: true,
  })
  type!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    index: true,
  })
  period!: string;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: Object, required: true })
  data!: Record<string, any>; // Report data and metrics

  @Prop({ type: Object })
  filters?: Record<string, any>; // Applied filters

  @Prop({ type: Object })
  parameters?: Record<string, any>; // Report parameters

  // Report status
  @Prop({
    required: true,
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending',
    index: true,
  })
  status!: string;

  @Prop()
  error?: string; // Error message if failed

  @Prop()
  progress?: number; // Generation progress (0-100)

  // Access control
  @Prop({ required: true, index: true })
  createdBy!: string;

  @Prop({ type: [String], index: true })
  sharedWith?: string[]; // User IDs with access

  @Prop({
    required: true,
    type: String,
    enum: ['private', 'team', 'company'],
    default: 'private',
    index: true,
  })
  visibility!: string;

  // File information
  @Prop()
  fileUrl?: string; // URL to generated file (PDF, Excel, etc.)

  @Prop()
  fileSize?: number; // File size in bytes

  @Prop()
  fileFormat?: string; // 'pdf', 'excel', 'csv', 'json'

  // Scheduling
  @Prop({ default: false })
  isScheduled?: boolean;

  @Prop({
    type: {
      frequency: String,
      dayOfWeek: Number,
      dayOfMonth: Number,
      time: String,
      timezone: String,
      recipients: [String],
    },
  })
  scheduleConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:mm format
    timezone?: string;
    recipients?: string[]; // Email addresses
  };

  @Prop()
  lastGenerated?: Date;

  @Prop()
  nextScheduled?: Date;

  // Performance metrics
  @Prop()
  generationTime?: number; // Time taken to generate in seconds

  @Prop()
  queriedRecords?: number; // Number of records processed

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  tags?: string[];

  @Prop({ default: true })
  isActive?: boolean;

  @Prop()
  archivedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Create indexes for efficient querying
ReportSchema.index({ createdBy: 1, status: 1 });
ReportSchema.index({ type: 1, period: 1 });
ReportSchema.index({ startDate: -1, endDate: -1 });
ReportSchema.index({ isScheduled: 1, nextScheduled: 1 });
ReportSchema.index({ visibility: 1, sharedWith: 1 });
ReportSchema.index({ isActive: 1, archivedAt: 1 });
ReportSchema.index({ tags: 1 });

// Text search index
ReportSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
});
