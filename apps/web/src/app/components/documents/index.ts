/**
 * Document Management System Components
 * Export all document-related components and types
 */

export { DocumentManagement } from './DocumentManagement';
export { DocumentUpload } from './DocumentUpload';
export { DocumentViewer } from './DocumentViewer';
export { DocumentGallery } from './DocumentGallery';
export { ShareDialog } from './ShareDialog';
export { SharedDocumentAccess } from './SharedDocumentAccess';
export { RateLimitNotification } from './RateLimitNotification';

export type {
  Document,
  ShareLink,
  UploadProgress,
  DocumentFilters,
  CreateShareLinkDto,
  AccessSharedDocumentRequest,
  AccessSharedDocumentResponse,
} from './types';

export { RateLimitError, DocumentAccessError } from './types';
