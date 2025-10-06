import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import DataLoader from 'dataloader';
import {
  DocumentEntity,
  DocumentDocument,
} from '../../documents/schemas/document.schema';

@Injectable({ scope: Scope.REQUEST })
export class DocumentDataLoader {
  constructor(
    @InjectModel(DocumentEntity.name)
    private documentModel: Model<DocumentDocument>,
  ) {}

  private readonly batchDocuments = new DataLoader<
    string,
    DocumentEntity | null
  >(async (documentIds: readonly string[]) => {
    // Fetch all documents in a single query
    const documents = await this.documentModel
      .find({ _id: { $in: documentIds as string[] } })
      .lean()
      .exec();

    // Create a map for quick lookup
    const documentMap = new Map<string, any>();
    documents.forEach((doc: any) => {
      documentMap.set(doc._id.toString(), this.convertDocumentDocument(doc));
    });

    // Return documents in the same order as requested IDs
    return documentIds.map((id) => documentMap.get(id) || null);
  });

  async load(documentId: string): Promise<DocumentEntity | null> {
    return this.batchDocuments.load(documentId);
  }

  async loadMany(documentIds: string[]): Promise<(DocumentEntity | null)[]> {
    return this.batchDocuments.loadMany(documentIds) as Promise<
      (DocumentEntity | null)[]
    >;
  }

  private convertDocumentDocument(doc: any): DocumentEntity {
    return {
      id: doc._id?.toString() || doc.id,
      originalName: doc.originalName,
      storagePath: doc.storagePath,
      mimeType: doc.mimeType,
      size: doc.size,
      category: doc.category,
      description: doc.description,
      tags: doc.tags,
      entityType: doc.entityType,
      entityId: doc.entityId,
      uploadedBy: doc.uploadedBy,
      isDeleted: doc.isDeleted,
      deletedAt: doc.deletedAt,
      deletedBy: doc.deletedBy,
      shareLinks: doc.shareLinks,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    } as any;
  }
}
