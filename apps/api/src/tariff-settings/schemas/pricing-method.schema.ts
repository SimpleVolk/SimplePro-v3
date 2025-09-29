import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PricingMethodType } from '../interfaces/tariff-settings.interface';

/**
 * Pricing Method Default Schema
 * Defines available pricing methods and their configurations
 */
@Schema({ _id: false })
export class PricingMethodDefault {
  @Prop({
    required: true,
    enum: Object.values(PricingMethodType)
  })
  method!: PricingMethodType;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ required: true, default: false })
  isDefault!: boolean;

  @Prop({ type: Object })
  configuration?: Record<string, any>;
}

export const PricingMethodDefaultSchema = SchemaFactory.createForClass(PricingMethodDefault);