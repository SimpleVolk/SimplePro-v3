import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Auto Pricing Configuration Schema
 * Controls automatic pricing calculation behavior
 */
@Schema({ _id: false })
export class AutoPricing {
  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ required: true, min: 1, max: 24, default: 12 })
  maxHoursPerJob!: number;

  @Prop({ required: true, default: true })
  useCrewAbilityLimits!: boolean;

  @Prop({ required: true, default: true })
  applyWeekendSurcharge!: boolean;

  @Prop({ required: true, min: 0, max: 100, default: 10 })
  weekendSurchargePercent!: number;

  @Prop({ required: true, default: true })
  applyHolidaySurcharge!: boolean;

  @Prop({ required: true, min: 0, max: 100, default: 15 })
  holidaySurchargePercent!: number;
}

export const AutoPricingSchema = SchemaFactory.createForClass(AutoPricing);