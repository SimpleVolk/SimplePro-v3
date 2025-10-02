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
