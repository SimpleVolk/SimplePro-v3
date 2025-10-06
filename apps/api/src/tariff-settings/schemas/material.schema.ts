import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MaterialCategory } from '../interfaces/tariff-settings.interface';

/**
 * Material Schema
 * Represents packing materials and supplies with inventory tracking
 */
@Schema({ _id: false })
export class Material {
  @Prop({ required: true, maxlength: 100 })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(MaterialCategory),
    index: true,
  })
  category!: MaterialCategory;

  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  @Prop({ required: true, maxlength: 50 })
  unit!: string;

  @Prop({ required: true, default: true, index: true })
  isActive!: boolean;

  @Prop({ required: true, default: true })
  inStock!: boolean;

  @Prop({ min: 0 })
  stockQuantity?: number;

  @Prop({ min: 0 })
  minQuantity?: number;

  @Prop({ min: 0 })
  reorderPoint?: number;

  @Prop({ maxlength: 200 })
  supplier?: string;

  @Prop({ maxlength: 100 })
  sku?: string;

  @Prop({ maxlength: 1000 })
  notes?: string;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);

// Index for active materials by category
MaterialSchema.index({ isActive: 1, category: 1 });
