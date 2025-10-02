import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type DocumentDocument = DocumentEntity & MongooseDocument;

export enum DocumentType {
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  PHOTO = 'photo',
  INSURANCE = 'insurance',
  LICENSE = 'license',
  OTHER = 'other',
}

export enum EntityType {
  CUSTOMER = 'customer',
  JOB = 'job',
  ESTIMATE = 'estimate',
  OPPORTUNITY = 'opportunity',
  INVOICE = 'invoice',
  CREW = 'crew',
}

@Schema({ collection: 'documents', timestamps: true })
export class DocumentEntity {
  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number; // in bytes

  @Prop({ required: true })
  storageKey!: string; // MinIO object key

  @Prop({ required: true })
  bucket!: string; // MinIO bucket name

  @Prop({
    required: true,
    enum: Object.values(DocumentType),
    index: true,
  })
  documentType!: DocumentType;

  @Prop({
    required: true,
    enum: Object.values(EntityType),
    index: true,
  })
  entityType!: EntityType;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  entityId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop()
  description?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;

  // Sharing
  @Prop({ default: false })
  isShared!: boolean;

  @Prop({ unique: true, sparse: true, index: true })
  shareToken?: string;

  @Prop()
  shareExpiresAt?: Date;

  @Prop()
  sharePassword?: string; // bcrypt hashed

  @Prop({ default: 0 })
  shareAccessCount!: number;

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);

// Compound indexes
DocumentSchema.index({ entityType: 1, entityId: 1, isDeleted: 1 });
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ shareToken: 1 });
DocumentSchema.index({ documentType: 1 });
DocumentSchema.index({ tags: 1 });

// Text index for search
DocumentSchema.index({
  filename: 'text',
  originalName: 'text',
  description: 'text',
  tags: 'text',
});

// Ensure toJSON and toObject transformations
DocumentSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: any) {
    delete ret.sharePassword; // Never expose share password hash
    return ret;
  },
});

DocumentSchema.set('toObject', {
  virtuals: true,
  transform: function (_doc, ret: any) {
    delete ret.sharePassword; // Never expose share password hash
    return ret;
  },
});
