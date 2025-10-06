import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Individual Hourly Rate Schema
 * Represents the hourly rate for a specific crew size
 */
@Schema({ _id: false })
export class HourlyRate {
  @Prop({ required: true, min: 1, max: 10 })
  crewSize!: number;

  @Prop({ required: true, min: 0 })
  baseRate!: number;

  @Prop({ min: 0 })
  weekendRate?: number;

  @Prop({ min: 0 })
  holidayRate?: number;

  @Prop({ min: 1, default: 1.5 })
  overtimeMultiplier?: number;
}

export const HourlyRateSchema = SchemaFactory.createForClass(HourlyRate);

/**
 * Crew Ability Entry Schema
 * Defines maximum capacity for a crew size
 */
@Schema({ _id: false })
export class CrewAbilityEntry {
  @Prop({ required: true, min: 1, max: 10 })
  crewSize!: number;

  @Prop({ required: true, min: 0 })
  maxCubicFeet!: number;

  @Prop({ required: true, min: 0 })
  maxWeightLbs!: number;
}

export const CrewAbilityEntrySchema =
  SchemaFactory.createForClass(CrewAbilityEntry);

/**
 * Minimum Hours Configuration Schema
 */
@Schema({ _id: false })
export class MinimumHours {
  @Prop({ required: true, min: 0, max: 24, default: 2 })
  weekday!: number;

  @Prop({ required: true, min: 0, max: 24, default: 3 })
  weekend!: number;

  @Prop({ required: true, min: 0, max: 24, default: 3 })
  holiday!: number;
}

export const MinimumHoursSchema = SchemaFactory.createForClass(MinimumHours);

/**
 * Hourly Rates Configuration Schema
 * Main configuration for hourly-based pricing
 */
@Schema({ _id: false })
export class HourlyRates {
  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({
    type: MinimumHoursSchema,
    required: true,
    default: () => ({ weekday: 2, weekend: 3, holiday: 3 }),
  })
  minimumHours!: MinimumHours;

  @Prop({ type: [HourlyRateSchema], default: [] })
  rates!: HourlyRate[];

  @Prop({ type: [CrewAbilityEntrySchema], default: [] })
  crewAbility!: CrewAbilityEntry[];
}

export const HourlyRatesSchema = SchemaFactory.createForClass(HourlyRates);
