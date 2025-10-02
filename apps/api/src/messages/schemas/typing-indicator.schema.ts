import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TypingIndicatorDocument = TypingIndicator & Document;

@Schema({ collection: 'typing_indicators', timestamps: false })
export class TypingIndicator {
  @Prop({ required: true, type: Types.ObjectId, ref: 'MessageThread', index: true })
  threadId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Date })
  startedAt!: Date;

  @Prop({ required: true, type: Date, index: true })
  expiresAt!: Date;
}

export const TypingIndicatorSchema = SchemaFactory.createForClass(TypingIndicator);

// Compound index for efficient lookups
TypingIndicatorSchema.index({ threadId: 1, userId: 1 }, { unique: true });

// TTL index to auto-delete expired typing indicators after 30 seconds
TypingIndicatorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure virtuals are serialized
TypingIndicatorSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

TypingIndicatorSchema.set('toObject', {
  virtuals: true,
  transform: function(_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});
