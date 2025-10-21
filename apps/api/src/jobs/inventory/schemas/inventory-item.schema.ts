import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryItemDocument = InventoryItem & Document;

export enum ItemCategory {
  LIVING_ROOM_FURNITURE = 'Living Room Furniture',
  BEDROOM_FURNITURE = 'Bedroom Furniture',
  KITCHEN_DINING = 'Kitchen & Dining',
  APPLIANCES = 'Appliances',
  ELECTRONICS = 'Electronics',
  BOXES = 'Boxes',
  OUTDOOR_ITEMS = 'Outdoor Items',
  OFFICE_EQUIPMENT = 'Office Equipment',
  SPORTS_EQUIPMENT = 'Sports Equipment',
  MUSICAL_INSTRUMENTS = 'Musical Instruments',
  OTHER = 'Other',
}

export enum ItemStatus {
  NOT_STARTED = 'not_started',
  LOADED = 'loaded',
  DELIVERED = 'delivered',
}

export enum ItemCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  DAMAGED = 'damaged',
}

@Schema({ collection: 'inventory_items', timestamps: true })
export class InventoryItem {
  @Prop({ required: true, type: Types.ObjectId, ref: 'InventoryChecklist' })
  checklistId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(ItemCategory),
    default: ItemCategory.OTHER
  })
  category!: ItemCategory;

  @Prop({ required: true, type: Number, default: 1, min: 1 })
  quantity!: number;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(ItemStatus),
    default: ItemStatus.NOT_STARTED
  })
  status!: ItemStatus;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(ItemCondition),
    default: ItemCondition.GOOD
  })
  condition!: ItemCondition;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: Date })
  loadedAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastModifiedBy?: Types.ObjectId;
}

export const InventoryItemSchema = SchemaFactory.createForClass(InventoryItem);

// Indexes for optimal performance
InventoryItemSchema.index({ checklistId: 1, status: 1 }); // Filter items by checklist and status
InventoryItemSchema.index({ checklistId: 1, category: 1 }); // Group items by category
InventoryItemSchema.index({ checklistId: 1, createdAt: -1 }); // Items in creation order
InventoryItemSchema.index({ condition: 1 }); // Filter damaged items
InventoryItemSchema.index({ status: 1, loadedAt: 1 }); // Track loading timeline
InventoryItemSchema.index({ status: 1, deliveredAt: 1 }); // Track delivery timeline
