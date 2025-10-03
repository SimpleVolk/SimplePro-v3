/**
 * Document Management Types
 * Type definitions for document management system
 */

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  documentType: 'contract' | 'invoice' | 'receipt' | 'estimate' | 'photo' | 'insurance' | 'other';
  entityType?: 'customer' | 'job' | 'estimate' | 'invoice';
  entityId?: string;
  tags: string[];
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
  shareLinks?: ShareLink[];
}

export interface ShareLink {
  id: string;
  documentId: string;
  token: string;
  url: string;
  expiresAt?: string;
  isPasswordProtected: boolean;
  accessCount: number;
  createdAt: string;
  createdBy: string;
}

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface DocumentFilters {
  documentType?: string;
  entityType?: string;
  entityId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  uploadedBy?: string;
  search?: string;
}

export interface CreateShareLinkDto {
  documentId: string;
  expiresAt?: string;
  password?: string;
}

export interface AccessSharedDocumentRequest {
  password: string;
}

export interface AccessSharedDocumentResponse {
  documentUrl: string;
  expiresAt?: string;
  documentName: string;
  documentType: string;
  mimeType: string;
  size: number;
}

export class RateLimitError extends Error {
  constructor(public retryAfter: string | null) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export class DocumentAccessError extends Error {
  constructor(public statusCode: number, message?: string) {
    super(message || `Document access failed with status ${statusCode}`);
    this.name = 'DocumentAccessError';
  }
}
