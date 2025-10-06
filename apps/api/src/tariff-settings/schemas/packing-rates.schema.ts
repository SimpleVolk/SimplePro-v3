import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Individual Packing Rate Schema
 * Represents pricing for specific packing services
 */
@Schema({ _id: false })
export class PackingRate {
  @Prop({ required: true, maxlength: 100 })
  itemType!: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({ required: true, min: 0 })
  rate!: number;

  @Prop({ required: true, maxlength: 50 })
  unit!: string;

  @Prop({ required: true, maxlength: 50 })
  category!: string;
}

export const PackingRateSchema = SchemaFactory.createForClass(PackingRate);

/**
 * Packing Rates Configuration Schema
 * Main configuration for packing service pricing
 */
@Schema({ _id: false })
export class PackingRates {
  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ type: [PackingRateSchema], default: [] })
  rates!: PackingRate[];
}

export const PackingRatesSchema = SchemaFactory.createForClass(PackingRates);
