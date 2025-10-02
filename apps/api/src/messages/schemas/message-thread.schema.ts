import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageThreadDocument = MessageThread & Document;

@Schema({ collection: 'message_threads', timestamps: true })
export class MessageThread {
  @Prop({ required: true, type: [{ type: Types.ObjectId, ref: 'User' }], index: true })
  participants!: Types.ObjectId[];

  @Prop({ enum: ['direct', 'job', 'group'], default: 'direct', index: true })
  threadType!: string;

  @Prop({ type: Types.ObjectId, ref: 'Job', index: true })
  jobId?: Types.ObjectId;

  @Prop()
  threadName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessageId?: Types.ObjectId;

  @Prop({ type: Date, index: true })
  lastMessageAt?: Date;

  @Prop({ default: false })
  isArchived!: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  archivedBy!: Types.ObjectId[];

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const MessageThreadSchema = SchemaFactory.createForClass(MessageThread);

// Compound indexes for efficient queries
MessageThreadSchema.index({ participants: 1, lastMessageAt: -1 });
MessageThreadSchema.index({ jobId: 1, isArchived: 1 });
MessageThreadSchema.index({ threadType: 1, createdAt: -1 });

// Ensure virtuals are serialized
MessageThreadSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

MessageThreadSchema.set('toObject', {
  virtuals: true,
  transform: function(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});
