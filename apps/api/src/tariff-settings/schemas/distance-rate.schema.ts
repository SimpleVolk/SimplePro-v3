import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Distance Rate Schema
 * Defines pricing tiers based on distance traveled
 */
@Schema({ _id: false })
export class DistanceRate {
  @Prop({ required: true, maxlength: 100 })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true, min: 0 })
  minMiles!: number;

  @Prop({ required: true, min: 0 })
  maxMiles!: number;

  @Prop({ required: true, min: 0 })
  ratePerMile!: number;

  @Prop({ min: 0 })
  minimumCharge?: number;

  @Prop({ required: true, default: true })
  isActive!: boolean;
}

export const DistanceRateSchema = SchemaFactory.createForClass(DistanceRate);