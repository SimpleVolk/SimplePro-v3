import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Move Size Schema
 * Defines categories for move sizes based on volume and weight
 */
@Schema({ _id: false })
export class MoveSize {
  @Prop({ required: true, maxlength: 100 })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true, min: 0 })
  minCubicFeet!: number;

  @Prop({ required: true, min: 0 })
  maxCubicFeet!: number;

  @Prop({ required: true, min: 0 })
  minWeightLbs!: number;

  @Prop({ required: true, min: 0 })
  maxWeightLbs!: number;

  @Prop({ required: true, min: 1, max: 10 })
  recommendedCrewSize!: number;

  @Prop({ required: true, min: 0 })
  estimatedHours!: number;

  @Prop({ required: true, default: true })
  isActive!: boolean;
}

export const MoveSizeSchema = SchemaFactory.createForClass(MoveSize);