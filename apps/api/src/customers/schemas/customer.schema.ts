import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
    enum: ['website', 'referral', 'google', 'facebook', 'yelp', 'direct', 'other'],
    index: true
  })
  source!: 'website' | 'referral' | 'google' | 'facebook' | 'yelp' | 'direct' | 'other';

  @Prop()
  companyName?: string;

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

// Optimize indexes for performance
CustomerSchema.index({ email: 1 }, { unique: true });
CustomerSchema.index({ firstName: 1, lastName: 1 });
CustomerSchema.index({ status: 1, type: 1 });
CustomerSchema.index({ source: 1, createdAt: -1 });
CustomerSchema.index({ assignedSalesRep: 1, status: 1 });
CustomerSchema.index({ leadScore: -1 });
CustomerSchema.index({ lastContactDate: -1 });
CustomerSchema.index({ 'address.zipCode': 1 });
CustomerSchema.index({ 'address.state': 1, 'address.city': 1 });
CustomerSchema.index({ tags: 1 });

// Compound indexes for common query patterns
CustomerSchema.index({ status: 1, lastContactDate: -1 });
CustomerSchema.index({ assignedSalesRep: 1, lastContactDate: -1 });
CustomerSchema.index({ source: 1, status: 1, createdAt: -1 });

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