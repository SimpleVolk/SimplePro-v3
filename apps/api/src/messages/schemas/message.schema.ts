import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

interface MessageAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface ReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: 'MessageThread', index: true })
  threadId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  senderId!: Types.ObjectId;

  @Prop({ required: true, maxlength: 5000 })
  content!: string;

  @Prop({ enum: ['text', 'image', 'file', 'location', 'quick_reply'], default: 'text' })
  messageType!: string;

  @Prop({ type: [Object], default: [] })
  attachments?: MessageAttachment[];

  @Prop({ type: Object })
  location?: MessageLocation;

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, readAt: Date }], default: [] })
  readBy!: ReadReceipt[];

  @Prop({ default: false })
  isEdited!: boolean;

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyToId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Compound indexes for efficient queries
MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index({ threadId: 1, isDeleted: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ 'readBy.userId': 1 });

// Text search index for message content
MessageSchema.index({ content: 'text' });

// Ensure virtuals are serialized
MessageSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

MessageSchema.set('toObject', {
  virtuals: true,
  transform: function(_doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});
