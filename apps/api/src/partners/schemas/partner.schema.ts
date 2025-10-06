import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartnerDocument = Partner & Document;

@Schema({ collection: 'partners', timestamps: true })
export class Partner {
  @Prop({ required: true, index: true })
  companyName!: string;

  @Prop({ required: true })
  contactName!: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({
    required: true,
    type: String,
    enum: [
      'real_estate_agent',
      'property_manager',
      'relocation_company',
      'storage_facility',
      'corporate_client',
      'referral_network',
      'other',
    ],
    index: true,
  })
  partnerType!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'pending',
    index: true,
  })
  status!: string;

  @Prop({
    required: true,
    type: Object,
  })
  commissionStructure!: {
    type: 'percentage' | 'flat_rate' | 'tiered' | 'custom';
    rate?: number;
    flatAmount?: number;
    tiers?: Array<{
      minValue: number;
      maxValue: number;
      rate: number;
    }>;
    paymentTerms: string; // 'net30', 'net60', etc.
  };

  @Prop({
    required: true,
    type: Object,
  })
  address!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @Prop()
  website?: string;

  @Prop({
    type: Object,
    default: { enabled: false },
  })
  portalAccess!: {
    enabled: boolean;
    username?: string;
    hashedPassword?: string;
    lastLogin?: Date;
  };

  @Prop({
    type: Object,
    default: {
      totalLeadsReferred: 0,
      totalLeadsConverted: 0,
      totalRevenue: 0,
      totalCommissionsPaid: 0,
      conversionRate: 0,
    },
  })
  statistics!: {
    totalLeadsReferred: number;
    totalLeadsConverted: number;
    totalRevenue: number;
    totalCommissionsPaid: number;
    conversionRate: number;
  };

  @Prop({
    type: Object,
    default: {
      autoNotifyOnLeadUpdate: true,
      preferredContactMethod: 'email',
      customFields: {},
    },
  })
  settings!: {
    autoNotifyOnLeadUpdate: boolean;
    preferredContactMethod: 'email' | 'phone' | 'portal';
    customFields: Record<string, any>;
  };

  @Prop({ type: Date })
  contractStartDate?: Date;

  @Prop({ type: Date })
  contractEndDate?: Date;

  @Prop()
  notes?: string;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ required: true, index: true })
  createdBy!: string;
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);

// Optimize indexes for performance
PartnerSchema.index({ email: 1 }, { unique: true });
PartnerSchema.index({ companyName: 1 });
PartnerSchema.index({ partnerType: 1, status: 1 });
PartnerSchema.index({ status: 1, createdAt: -1 });
PartnerSchema.index({ 'statistics.totalLeadsReferred': -1 });
PartnerSchema.index({ 'statistics.totalRevenue': -1 });
PartnerSchema.index({ 'statistics.conversionRate': -1 });
PartnerSchema.index({ tags: 1 });

// Compound indexes for common query patterns
PartnerSchema.index({
  status: 1,
  partnerType: 1,
  'statistics.totalLeadsReferred': -1,
});
PartnerSchema.index({ createdBy: 1, status: 1 });

// Text search index for comprehensive search
PartnerSchema.index(
  {
    companyName: 'text',
    contactName: 'text',
    email: 'text',
    phone: 'text',
    notes: 'text',
  },
  {
    weights: {
      companyName: 10,
      contactName: 8,
      email: 5,
      phone: 3,
      notes: 1,
    },
    name: 'partner_text_search',
  },
);

// Sparse indexes for optional fields
PartnerSchema.index({ contractStartDate: 1 }, { sparse: true });
PartnerSchema.index({ contractEndDate: 1 }, { sparse: true });
PartnerSchema.index({ 'portalAccess.lastLogin': -1 }, { sparse: true });

// Virtual for active contract
PartnerSchema.virtual('hasActiveContract').get(function (
  this: PartnerDocument,
) {
  if (!this.contractStartDate || !this.contractEndDate) return false;
  const now = new Date();
  return now >= this.contractStartDate && now <= this.contractEndDate;
});

// Ensure virtual fields are serialized
PartnerSchema.set('toJSON', { virtuals: true });
PartnerSchema.set('toObject', { virtuals: true });
