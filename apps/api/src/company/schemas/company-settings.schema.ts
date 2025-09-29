import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanySettingsDocument = CompanySettings & Document;

@Schema({ _id: false })
export class Address {
  @Prop({ required: true })
  street!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
  zipCode!: string;

  @Prop({ required: true, default: 'USA' })
  country!: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ _id: false })
export class BusinessHoursDay {
  @Prop({ required: true, default: false })
  isOpen!: boolean;

  @Prop({ required: false })
  openTime?: string; // Format: "HH:mm" (e.g., "08:00")

  @Prop({ required: false })
  closeTime?: string; // Format: "HH:mm" (e.g., "18:00")
}

export const BusinessHoursDaySchema = SchemaFactory.createForClass(BusinessHoursDay);

@Schema({ _id: false })
export class BusinessHours {
  @Prop({ type: BusinessHoursDaySchema, required: true })
  monday!: BusinessHoursDay;

  @Prop({ type: BusinessHoursDaySchema, required: true })
  tuesday!: BusinessHoursDay;

  @Prop({ type: BusinessHoursDaySchema, required: true })
  wednesday!: BusinessHoursDay;

  @Prop({ type: BusinessHoursDaySchema, required: true })
  thursday!: BusinessHoursDay;

  @Prop({ type: BusinessHoursDaySchema, required: true })
  friday!: BusinessHoursDay;

  @Prop({ type: BusinessHoursDaySchema, required: true })
  saturday!: BusinessHoursDay;

  @Prop({ type: BusinessHoursDaySchema, required: true })
  sunday!: BusinessHoursDay;
}

export const BusinessHoursSchema = SchemaFactory.createForClass(BusinessHours);

@Schema({ _id: false })
export class Preferences {
  @Prop({ required: false, default: 4, min: 1, max: 10 })
  defaultCrewSize?: number;

  @Prop({ required: false, default: 50, min: 1, max: 500 })
  defaultServiceRadius?: number; // in miles

  @Prop({ required: false, default: true })
  requireEstimateApproval?: boolean;

  @Prop({ required: false, default: false })
  allowOnlineBooking?: boolean;

  @Prop({ required: false, default: 'America/New_York' })
  timezone?: string;

  @Prop({ required: false, default: 'USD' })
  currency?: string;

  @Prop({ required: false, default: 'MM/DD/YYYY' })
  dateFormat?: string;

  @Prop({ required: false, default: '12h', enum: ['12h', '24h'] })
  timeFormat?: '12h' | '24h';
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);

@Schema({ timestamps: true })
export class CompanySettings {
  // Company Profile
  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: false })
  legalName?: string;

  @Prop({ required: false })
  taxId?: string;

  // Contact Information
  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: false })
  website?: string;

  // Address
  @Prop({ type: AddressSchema, required: true })
  address!: Address;

  // Business Hours
  @Prop({ type: BusinessHoursSchema, required: true })
  businessHours!: BusinessHours;

  // Preferences
  @Prop({ type: PreferencesSchema, required: true })
  preferences!: Preferences;

  // Metadata
  @Prop({ required: true })
  updatedBy!: string; // User ID who last updated

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CompanySettingsSchema = SchemaFactory.createForClass(CompanySettings);

// Create index to ensure only one settings document exists
CompanySettingsSchema.index({ companyName: 1 }, { unique: false });