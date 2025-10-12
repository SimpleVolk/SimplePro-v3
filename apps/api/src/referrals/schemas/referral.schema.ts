import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReferralDocument = Referral &
  Document & {
    daysSinceReferral: number;
    customerFullName: string;
  };

@Schema({ collection: 'referrals', timestamps: true })
export class Referral {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Partner' })
  partnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Opportunity' })
  opportunityId?: Types.ObjectId; // Sparse unique index created explicitly below

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Job' })
  jobId?: Types.ObjectId; // Sparse unique index created explicitly below

  @Prop({ required: true })
  referralDate!: Date;

  @Prop({
    required: true,
    type: String,
    enum: [
      'received',
      'contacted',
      'qualified',
      'quoted',
      'won',
      'lost',
      'cancelled',
    ],
    default: 'received',
  })
  status!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'warm',
  })
  leadQuality!: string;

  @Prop({
    required: true,
    type: Object,
  })
  customerInfo!: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
  };

  @Prop({
    required: true,
    type: Object,
  })
  moveDetails!: {
    moveDate?: Date;
    moveType: 'local' | 'long_distance' | 'storage';
    estimatedValue?: number;
    pickupAddress?: string;
    deliveryAddress?: string;
  };

  @Prop({
    type: Object,
    default: {
      commissionRate: 0,
      commissionAmount: 0,
      finalJobValue: 0,
      isPaid: false,
    },
  })
  commissionDetails!: {
    commissionRate: number;
    commissionAmount: number;
    finalJobValue: number;
    isPaid: boolean;
    paidDate?: Date;
    paymentMethod?: string;
    paymentReference?: string;
  };

  @Prop({
    type: Object,
    default: {},
  })
  conversionData!: {
    daysToContact?: number;
    daysToQuote?: number;
    daysToConversion?: number;
    lostReason?: string;
  };

  @Prop()
  notes?: string;

  @Prop()
  internalNotes?: string;

  @Prop()
  assignedSalesRep?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);

// Optimize indexes for performance
ReferralSchema.index({ partnerId: 1, status: 1 });
ReferralSchema.index({ partnerId: 1, referralDate: -1 });
ReferralSchema.index({ opportunityId: 1 }, { unique: true, sparse: true });
ReferralSchema.index({ jobId: 1 }, { unique: true, sparse: true });
ReferralSchema.index({ customerId: 1 });
ReferralSchema.index({ referralDate: -1 });
ReferralSchema.index({ status: 1, referralDate: -1 });
ReferralSchema.index({ 'commissionDetails.isPaid': 1, status: 1 });
ReferralSchema.index({ assignedSalesRep: 1, status: 1 });
ReferralSchema.index({ leadQuality: 1, status: 1 });
ReferralSchema.index({ tags: 1 });

// Compound indexes for common query patterns
ReferralSchema.index({ partnerId: 1, status: 1, referralDate: -1 });
ReferralSchema.index({ status: 1, 'commissionDetails.isPaid': 1 });
ReferralSchema.index({ partnerId: 1, 'commissionDetails.isPaid': 1 });

// Text search index for customer information
ReferralSchema.index(
  {
    'customerInfo.firstName': 'text',
    'customerInfo.lastName': 'text',
    'customerInfo.email': 'text',
    'customerInfo.phone': 'text',
    notes: 'text',
  },
  {
    weights: {
      'customerInfo.firstName': 10,
      'customerInfo.lastName': 10,
      'customerInfo.email': 8,
      'customerInfo.phone': 5,
      notes: 1,
    },
    name: 'referral_text_search',
  },
);

// Sparse indexes for optional fields
ReferralSchema.index({ 'moveDetails.moveDate': 1 }, { sparse: true });
ReferralSchema.index({ 'commissionDetails.paidDate': -1 }, { sparse: true });

// Virtual for days since referral
ReferralSchema.virtual('daysSinceReferral').get(function (
  this: ReferralDocument,
) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.referralDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for full customer name
ReferralSchema.virtual('customerFullName').get(function (
  this: ReferralDocument,
) {
  return `${this.customerInfo.firstName} ${this.customerInfo.lastName}`;
});

// Ensure virtual fields are serialized
ReferralSchema.set('toJSON', { virtuals: true });
ReferralSchema.set('toObject', { virtuals: true });
