import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  createSizeMonitoringMiddleware,
  createArraySizeMonitoringMiddleware,
} from '../../database/document-size-monitoring.middleware';

export type OpportunityDocument = Opportunity & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Opportunity {
  @Prop({ required: true })
  customerId: string;

  @Prop({ type: String, enum: ['existing', 'new'], default: 'existing' })
  customerType: string;

  @Prop({ type: Object })
  newCustomer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    type: string;
    companyName?: string;
  };

  @Prop({ type: String, enum: ['local', 'long_distance', 'storage', 'packing_only'], required: true })
  service: string;

  @Prop({ required: true })
  moveDate: Date;

  @Prop({ type: String, enum: ['studio', '1br', '2br', '3br', '4br', '5br', 'custom'] })
  moveSize: string;

  @Prop({ type: String, enum: ['exact', 'week', 'month'], default: 'exact' })
  flexibility: string;

  @Prop({ type: Object, required: true })
  pickup: {
    address: string;
    buildingType: string;
    floorLevel: number;
    elevatorAccess: boolean;
    stairsCount: number;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: string;
    narrowHallways: boolean;
    specialNotes: string;
  };

  @Prop({ type: Object, required: true })
  delivery: {
    address: string;
    buildingType: string;
    floorLevel: number;
    elevatorAccess: boolean;
    stairsCount: number;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: string;
    narrowHallways: boolean;
    specialNotes: string;
  };

  @Prop({ type: Array, default: [] })
  rooms: Array<{
    id: string;
    type: string;
    description: string;
    items: any[];
    packingRequired: boolean;
    totalWeight: number;
    totalVolume: number;
  }>;

  @Prop({ required: true })
  totalWeight: number;

  @Prop({ required: true })
  totalVolume: number;

  @Prop({ type: Object })
  specialItems: {
    piano: boolean;
    poolTable: boolean;
    safe: boolean;
    antiques: boolean;
    artwork: boolean;
    fragileItems: number;
    valuableItems: number;
  };

  @Prop({ type: Object })
  additionalServices: {
    packing: string;
    unpacking: boolean;
    assembly: boolean;
    storage: boolean;
    storageDuration?: number;
    cleaning: boolean;
  };

  @Prop({ type: String, enum: ['website', 'phone', 'referral', 'partner', 'walkin', 'other'], default: 'website' })
  leadSource: string;

  @Prop({ index: true })
  referralId?: string;

  @Prop({ index: true })
  partnerId?: string;

  @Prop()
  assignedSalesRep?: string;

  @Prop({ type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  @Prop()
  internalNotes: string;

  @Prop()
  followUpDate?: Date;

  @Prop({ required: true })
  distance: number;

  @Prop({ required: true })
  estimatedDuration: number;

  @Prop({ required: true })
  crewSize: number;

  @Prop({ default: false })
  isWeekend: boolean;

  @Prop({ default: false })
  isHoliday: boolean;

  @Prop({ type: String, enum: ['peak', 'standard', 'off_peak'], default: 'standard' })
  seasonalPeriod: string;

  @Prop()
  estimateId?: string;

  @Prop()
  estimatedPrice?: number;

  @Prop({ type: String, enum: ['open', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'cancelled'], default: 'open' })
  status: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;
}

export const OpportunitySchema = SchemaFactory.createForClass(Opportunity);

// Document size monitoring middleware (prevent 16MB limit issues)
OpportunitySchema.pre('save', createSizeMonitoringMiddleware({
  maxSizeMB: 5,
  warnThresholdPercent: 70,
  logWarnings: true,
  throwOnExceed: true,
}));

// Array size monitoring middleware
OpportunitySchema.pre('save', createArraySizeMonitoringMiddleware(
  ['rooms'],
  100 // Maximum 100 rooms per opportunity
));

// Foreign key validation middleware
OpportunitySchema.pre('save', async function (next) {
  try {
    // Validate customerId reference (required)
    if (this.customerId) {
      const Customer = mongoose.model('Customer');
      const customerExists = await Customer.exists({ _id: this.customerId });
      if (!customerExists) {
        throw new Error(`Referenced Customer not found: ${this.customerId}`);
      }
    }

    // Validate referralId reference (optional)
    if (this.referralId) {
      const Referral = mongoose.model('Referral');
      const referralExists = await Referral.exists({ _id: this.referralId });
      if (!referralExists) {
        throw new Error(`Referenced Referral not found: ${this.referralId}`);
      }
    }

    // Validate partnerId reference (optional)
    if (this.partnerId) {
      const Partner = mongoose.model('Partner');
      const partnerExists = await Partner.exists({ _id: this.partnerId });
      if (!partnerExists) {
        throw new Error(`Referenced Partner not found: ${this.partnerId}`);
      }
    }

    // Validate assignedSalesRep reference (optional)
    if (this.assignedSalesRep) {
      const User = mongoose.model('User');
      const userExists = await User.exists({ _id: this.assignedSalesRep });
      if (!userExists) {
        throw new Error(`Referenced User (assignedSalesRep) not found: ${this.assignedSalesRep}`);
      }
    }

    // Validate createdBy reference (required)
    if (this.createdBy) {
      const User = mongoose.model('User');
      const creatorExists = await User.exists({ _id: this.createdBy });
      if (!creatorExists) {
        throw new Error(`Referenced User (createdBy) not found: ${this.createdBy}`);
      }
    }

    // Validate updatedBy reference (optional)
    if (this.updatedBy) {
      const User = mongoose.model('User');
      const updaterExists = await User.exists({ _id: this.updatedBy });
      if (!updaterExists) {
        throw new Error(`Referenced User (updatedBy) not found: ${this.updatedBy}`);
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

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Indexes for efficient queries (OPTIMIZED)
OpportunitySchema.index({ customerId: 1, status: 1 }); // Common query pattern
OpportunitySchema.index({ moveDate: 1 }); // Used for scheduling
OpportunitySchema.index({ leadSource: 1, status: 1 }); // Lead source analysis
OpportunitySchema.index({ createdBy: 1 }); // Created by filter
OpportunitySchema.index({ assignedSalesRep: 1 }); // Sales rep assignments
OpportunitySchema.index({ createdAt: -1 }); // Recent opportunities
OpportunitySchema.index({ referralId: 1 }); // Referral tracking
OpportunitySchema.index({ partnerId: 1, status: 1 }); // Partner opportunities
