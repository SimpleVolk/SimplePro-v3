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

// Foreign key validation middleware
DocumentSchema.pre('save', async function (next) {
  try {
    // Validate uploadedBy reference (required)
    if (this.uploadedBy) {
      const User = mongoose.model('User');
      const uploaderExists = await User.exists({ _id: this.uploadedBy });
      if (!uploaderExists) {
        throw new Error(`Referenced User (uploadedBy) not found: ${this.uploadedBy}`);
      }
    }

    // Validate deletedBy reference (optional)
    if (this.deletedBy) {
      const User = mongoose.model('User');
      const deleterExists = await User.exists({ _id: this.deletedBy });
      if (!deleterExists) {
        throw new Error(`Referenced User (deletedBy) not found: ${this.deletedBy}`);
      }
    }

    // Validate entityId reference based on entityType
    if (this.entityId && this.entityType) {
      let modelName: string;
      switch (this.entityType) {
        case EntityType.CUSTOMER:
          modelName = 'Customer';
          break;
        case EntityType.JOB:
          modelName = 'Job';
          break;
        case EntityType.ESTIMATE:
          modelName = 'Estimate';
          break;
        case EntityType.OPPORTUNITY:
          modelName = 'Opportunity';
          break;
        case EntityType.INVOICE:
          modelName = 'Invoice';
          break;
        case EntityType.CREW:
          modelName = 'Crew';
          break;
        default:
          return next();
      }

      const Model = mongoose.model(modelName);
      const entityExists = await Model.exists({ _id: this.entityId });
      if (!entityExists) {
        throw new Error(`Referenced ${modelName} not found: ${this.entityId}`);
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compound indexes (OPTIMIZED)
DocumentSchema.index({ entityType: 1, entityId: 1, isDeleted: 1 }); // Entity documents
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 }); // User uploads
DocumentSchema.index({ shareToken: 1 }); // Shared document lookups
DocumentSchema.index({ documentType: 1 }); // Filter by document type
DocumentSchema.index({ tags: 1 }); // Tag-based filtering

// Text index for search
DocumentSchema.index({
  filename: 'text',
  originalName: 'text',
  description: 'text',
  tags: 'text',
}, { name: 'document_text_search' });

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
