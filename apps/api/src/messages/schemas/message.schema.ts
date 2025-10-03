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

// Foreign key validation middleware
MessageSchema.pre('save', async function (next) {
  try {
    // Validate threadId reference (required)
    if (this.threadId) {
      const MessageThread = mongoose.model('MessageThread');
      const threadExists = await MessageThread.exists({ _id: this.threadId });
      if (!threadExists) {
        throw new Error(`Referenced MessageThread not found: ${this.threadId}`);
      }
    }

    // Validate senderId reference (required)
    if (this.senderId) {
      const User = mongoose.model('User');
      const senderExists = await User.exists({ _id: this.senderId });
      if (!senderExists) {
        throw new Error(`Referenced User (senderId) not found: ${this.senderId}`);
      }
    }

    // Validate replyToId reference (optional)
    if (this.replyToId) {
      const Message = mongoose.model('Message');
      const replyToExists = await Message.exists({ _id: this.replyToId });
      if (!replyToExists) {
        throw new Error(`Referenced Message (replyToId) not found: ${this.replyToId}`);
      }
    }

    // Validate readBy user references
    if (this.readBy && this.readBy.length > 0) {
      const User = mongoose.model('User');
      for (const receipt of this.readBy) {
        if (receipt.userId) {
          const userExists = await User.exists({ _id: receipt.userId });
          if (!userExists) {
            throw new Error(`Referenced User in readBy not found: ${receipt.userId}`);
          }
        }
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compound indexes for efficient queries (OPTIMIZED)
MessageSchema.index({ threadId: 1, createdAt: -1 }); // Thread messages chronological
MessageSchema.index({ threadId: 1, isDeleted: 1, createdAt: -1 }); // Non-deleted messages
MessageSchema.index({ senderId: 1, createdAt: -1 }); // Messages by sender
MessageSchema.index({ 'readBy.userId': 1 }); // Read receipts lookup

// Text search index for message content
MessageSchema.index({ content: 'text' }, { name: 'message_content_search' });

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
