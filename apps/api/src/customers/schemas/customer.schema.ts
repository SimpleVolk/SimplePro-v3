import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  createSizeMonitoringMiddleware,
  createArraySizeMonitoringMiddleware,
} from '../../database/document-size-monitoring.middleware';

export type CustomerDocument = Customer & Document;

@Schema({ collection: 'customers', timestamps: true })
export class Customer {
  @Prop({ required: true, index: true })
  firstName!: string;

  @Prop({ required: true, index: true })
  lastName!: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop()
  alternatePhone?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['residential', 'commercial'],
    index: true
  })
  type!: 'residential' | 'commercial';

  @Prop({
    required: true,
    type: String,
    enum: ['lead', 'prospect', 'active', 'inactive'],
    default: 'lead',
    index: true
  })
  status!: 'lead' | 'prospect' | 'active' | 'inactive';

  @Prop({
    required: true,
    type: String,
    enum: ['website', 'referral', 'advertising', 'social_media', 'partner', 'other'],
    index: true
  })
  source!: 'website' | 'referral' | 'advertising' | 'social_media' | 'partner' | 'other';

  @Prop()
  companyName?: string;

  @Prop()
  businessLicense?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['email', 'phone', 'text'],
    default: 'email'
  })
  preferredContactMethod!: 'email' | 'phone' | 'text';

  @Prop({ type: Object, required: true })
  address!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };

  @Prop({ type: Object })
  communicationPreferences?: {
    allowMarketing: boolean;
    allowSms: boolean;
    allowEmail: boolean;
  };

  @Prop({ type: Object })
  referredBy?: {
    customerId?: string;
    partnerId?: string;
    partnerName?: string;
    source: string;
  };

  @Prop({ index: true })
  assignedSalesRep?: string;

  @Prop()
  leadScore?: number;

  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop()
  notes?: string;

  @Prop({ type: [String], default: [] })
  estimates!: string[];

  @Prop({ type: [String], default: [] })
  jobs!: string[];

  @Prop({ type: Date, index: true })
  lastContactDate?: Date;

  @Prop({ required: true, index: true })
  createdBy!: string;

  @Prop()
  preferredMoveDate?: Date;

  @Prop()
  estimatedBudget?: number;

  @Prop({ type: Object })
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Document size monitoring middleware (prevent 16MB limit issues)
CustomerSchema.pre('save', createSizeMonitoringMiddleware({
  maxSizeMB: 5,
  warnThresholdPercent: 70,
  logWarnings: true,
  throwOnExceed: true,
}));

// Array size monitoring middleware
CustomerSchema.pre('save', createArraySizeMonitoringMiddleware(
  ['estimates', 'jobs', 'tags'],
  1000 // Maximum 1000 items per array
));

// Optimize indexes for performance (OPTIMIZED - removed redundant indexes)
CustomerSchema.index({ email: 1 }, { unique: true }); // Unique email lookup
CustomerSchema.index({ firstName: 1, lastName: 1 }); // Name-based search
CustomerSchema.index({ status: 1 }); // Status filtering
CustomerSchema.index({ type: 1 }); // Type filtering (residential/commercial)
CustomerSchema.index({ assignedSalesRep: 1 }); // Sales rep assignments
CustomerSchema.index({ leadScore: -1 }); // Lead scoring queries
CustomerSchema.index({ lastContactDate: -1 }); // Recent contact tracking
CustomerSchema.index({ 'address.zipCode': 1 }); // Geographic queries
CustomerSchema.index({ 'address.state': 1, 'address.city': 1 }); // Location-based filtering
CustomerSchema.index({ tags: 1 }); // Tag-based filtering
CustomerSchema.index({ createdBy: 1 }); // Filter by creator

// Compound indexes for common query patterns (OPTIMIZED)
CustomerSchema.index({ status: 1, lastContactDate: -1 }); // Active customers by contact
CustomerSchema.index({ assignedSalesRep: 1, lastContactDate: -1 }); // Sales rep follow-ups
CustomerSchema.index({ 'referredBy.partnerId': 1 }, { sparse: true }); // Partner referrals
CustomerSchema.index({ source: 1, createdAt: -1 }); // PERFORMANCE: Referral source analytics
CustomerSchema.index({ status: 1, createdAt: -1 }); // PERFORMANCE: Lead pipeline reports

// Text search index for comprehensive search
CustomerSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  phone: 'text',
  companyName: 'text',
  notes: 'text'
}, {
  weights: {
    firstName: 10,
    lastName: 10,
    email: 8,
    phone: 5,
    companyName: 3,
    notes: 1
  },
  name: 'customer_text_search'
});

// Sparse indexes for optional fields
CustomerSchema.index({ preferredMoveDate: 1 }, { sparse: true });
CustomerSchema.index({ estimatedBudget: -1 }, { sparse: true });

// Virtual for full name
CustomerSchema.virtual('fullName').get(function(this: CustomerDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });