import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PricingRuleDocument = PricingRule & Document;

@Schema({ collection: 'pricing-rules' })
export class PricingRuleCondition {
  @Prop({ required: true })
  field!: string;

  @Prop({ required: true, type: String, enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'starts_with', 'ends_with'] })
  operator!: string;

  @Prop({ type: Object })
  value?: any;

  @Prop({ type: [Object] })
  values?: any[];
}

@Schema({ collection: 'pricing-rules' })
export class PricingRuleAction {
  @Prop({ required: true, type: String, enum: ['add_fixed', 'add_percentage', 'subtract_fixed', 'subtract_percentage', 'multiply', 'set_fixed', 'set_percentage'] })
  type!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  targetField!: string;

  @Prop()
  condition?: string;
}

@Schema({ collection: 'pricing-rules', timestamps: true })
export class PricingRule {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({
    required: true,
    enum: ['base_pricing', 'crew_adjustments', 'weight_volume', 'distance', 'timing', 'special_items', 'location_handicaps', 'additional_services'],
    index: true
  })
  category!: string;

  @Prop({ required: true, min: 1, max: 1000, index: true })
  priority!: number;

  @Prop({ type: [PricingRuleCondition], required: true })
  conditions!: PricingRuleCondition[];

  @Prop({ type: [PricingRuleAction], required: true })
  actions!: PricingRuleAction[];

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({
    type: [String],
    enum: ['local', 'long_distance', 'storage', 'packing_only'],
    required: true,
    index: true
  })
  applicableServices!: string[];

  @Prop({ default: '1.0.0' })
  version!: string;

  @Prop()
  notes?: string;

  @Prop()
  effectiveDate?: Date;

  @Prop()
  expiryDate?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;
}

export const PricingRuleSchema = SchemaFactory.createForClass(PricingRule);

// Create compound indexes for better query performance
PricingRuleSchema.index({ category: 1, priority: 1 });
PricingRuleSchema.index({ isActive: 1, applicableServices: 1 });
PricingRuleSchema.index({ createdAt: -1 });
PricingRuleSchema.index({ updatedAt: -1 });

// Add text index for search functionality
PricingRuleSchema.index({
  name: 'text',
  description: 'text',
  id: 'text'
});

// Virtual for rule status
PricingRuleSchema.virtual('status').get(function() {
  if (this.deletedAt) return 'deleted';
  if (!this.isActive) return 'inactive';
  if (this.expiryDate && this.expiryDate < new Date()) return 'expired';
  if (this.effectiveDate && this.effectiveDate > new Date()) return 'pending';
  return 'active';
});

// Ensure virtual fields are included in JSON output
PricingRuleSchema.set('toJSON', { virtuals: true });
PricingRuleSchema.set('toObject', { virtuals: true });