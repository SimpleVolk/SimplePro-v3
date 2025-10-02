import { Types } from 'mongoose';
import { DocumentType, EntityType } from '../schemas/document.schema';

export interface IDocument {
  _id?: Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  bucket: string;
  documentType: DocumentType;
  entityType: EntityType;
  entityId: Types.ObjectId;
  tags: string[];
  description?: string;
  uploadedBy: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  isShared: boolean;
  shareToken?: string;
  shareExpiresAt?: Date;
  sharePassword?: string;
  shareAccessCount: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStorageStatistics {
  totalFiles: number;
  totalSize: number;
  byType: Record<DocumentType, { count: number; size: number }>;
  byEntity: Record<EntityType, { count: number; size: number }>;
}

export interface IShareLink {
  token: string;
  url: string;
  expiresAt: Date;
}

export interface IDownloadResult {
  buffer: Buffer;
  document: IDocument;
}

// Allowed file types for upload
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/html',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
