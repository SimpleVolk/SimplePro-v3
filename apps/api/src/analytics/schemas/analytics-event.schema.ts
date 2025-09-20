import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ collection: 'analytics_events', timestamps: true })
export class AnalyticsEvent {
  @Prop({ required: true, index: true })
  eventType!: string; // 'job_created', 'job_completed', 'estimate_generated', 'customer_acquired', etc.

  @Prop({ required: true, index: true })
  category!: string; // 'jobs', 'customers', 'revenue', 'crew', 'operations'

  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ type: Object, required: true })
  data!: Record<string, any>; // Event-specific data

  @Prop({ required: true, index: true })
  userId!: string; // User who triggered the event

  @Prop({ index: true })
  customerId?: string;

  @Prop({ index: true })
  jobId?: string;

  @Prop({ index: true })
  estimateId?: string;

  @Prop({ index: true })
  crewId?: string;

  // Financial tracking
  @Prop()
  revenue?: number;

  @Prop()
  cost?: number;

  @Prop()
  profit?: number;

  // Geographic data
  @Prop({
    type: {
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  })
  location?: {
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Performance metrics
  @Prop()
  duration?: number; // in minutes

  @Prop()
  efficiency?: number; // percentage

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  processed?: boolean; // For batch processing

  @Prop()
  processedAt?: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// Create indexes for efficient querying
AnalyticsEventSchema.index({ timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ category: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ customerId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ jobId: 1 });
AnalyticsEventSchema.index({ 'location.state': 1, 'location.city': 1 });
AnalyticsEventSchema.index({ processed: 1 });

// Compound indexes for common queries
AnalyticsEventSchema.index({ category: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ revenue: -1, timestamp: -1 });