import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HandicapCategory } from '../interfaces/tariff-settings.interface';

/**
 * Handicap Schema
 * Represents additional charges for access difficulties and special circumstances
 */
@Schema({ _id: false })
export class Handicap {
  @Prop({ required: true, maxlength: 100 })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(HandicapCategory),
    index: true
  })
  category!: HandicapCategory;

  @Prop({
    required: true,
    type: String,
    enum: ['fixed_fee', 'percentage', 'per_unit']
  })
  type!: 'fixed_fee' | 'percentage' | 'per_unit';

  @Prop({ required: true, min: 0 })
  value!: number;

  @Prop({ maxlength: 50 })
  unit?: string;

  @Prop({ required: true, default: true, index: true })
  isActive!: boolean;

  @Prop({
    type: [String],
    required: true,
    enum: ['pickup', 'delivery', 'both'],
    default: ['both']
  })
  appliesTo!: ('pickup' | 'delivery' | 'both')[];

  @Prop({ maxlength: 1000 })
  notes?: string;
}

export const HandicapSchema = SchemaFactory.createForClass(Handicap);

// Index for active handicaps by category
HandicapSchema.index({ isActive: 1, category: 1 });