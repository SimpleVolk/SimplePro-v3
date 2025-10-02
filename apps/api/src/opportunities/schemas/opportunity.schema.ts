import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OpportunityDocument = Opportunity & Document;

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

// Indexes for efficient queries
OpportunitySchema.index({ customerId: 1, status: 1 });
OpportunitySchema.index({ moveDate: 1 });
OpportunitySchema.index({ leadSource: 1, status: 1 });
OpportunitySchema.index({ createdBy: 1 });
OpportunitySchema.index({ assignedSalesRep: 1 });
OpportunitySchema.index({ createdAt: -1 });
OpportunitySchema.index({ referralId: 1 });
OpportunitySchema.index({ partnerId: 1, status: 1 });
