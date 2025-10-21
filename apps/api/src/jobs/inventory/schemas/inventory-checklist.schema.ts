import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryChecklistDocument = InventoryChecklist & Document;

@Schema({ collection: 'inventory_checklists', timestamps: true })
export class InventoryChecklist {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId!: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  completedBy?: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;

  // Computed statistics (updated on item changes)
  @Prop({ type: Number, default: 0 })
  totalItems!: number;

  @Prop({ type: Number, default: 0 })
  notStartedCount!: number;

  @Prop({ type: Number, default: 0 })
  loadedCount!: number;

  @Prop({ type: Number, default: 0 })
  deliveredCount!: number;

  @Prop({ type: Number, default: 0 })
  damagedCount!: number;
}

export const InventoryChecklistSchema = SchemaFactory.createForClass(InventoryChecklist);

// Indexes for optimal performance
InventoryChecklistSchema.index({ jobId: 1 }, { unique: true }); // One checklist per job
InventoryChecklistSchema.index({ createdAt: -1 }); // Recent checklists first
InventoryChecklistSchema.index({ completedAt: 1 }); // Filter by completion status
