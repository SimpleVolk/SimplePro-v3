/**
 * Document Service
 * Handles all document-related API calls including secure shared document access
 */

import { getApiUrl } from '@/lib/config';
import {
  AccessSharedDocumentRequest,
  AccessSharedDocumentResponse,
  RateLimitError,
  DocumentAccessError,
} from '@/app/components/documents/types';

/**
 * Access a shared document using a secure token and password
 * @param token - The share token from the URL
 * @param password - The password for password-protected documents
 * @returns Document access response with download URL
 * @throws RateLimitError if too many attempts have been made
 * @throws DocumentAccessError for other access failures
 */
export async function accessSharedDocument(
  token: string,
  password: string
): Promise<AccessSharedDocumentResponse> {
  const response = await fetch(getApiUrl(`documents/shared/${token}/access`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password } as AccessSharedDocumentRequest),
  });

  // Handle rate limiting (429 Too Many Requests)
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new RateLimitError(retryAfter);
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage = 'Failed to access document';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new DocumentAccessError(response.status, errorMessage);
  }

  return response.json();
}

/**
 * Access a shared document without password (public links)
 * @param token - The share token from the URL
 * @returns Document access response with download URL
 * @throws RateLimitError if too many attempts have been made
 * @throws DocumentAccessError for other access failures
 */
export async function accessPublicDocument(
  token: string
): Promise<AccessSharedDocumentResponse> {
  const response = await fetch(getApiUrl(`documents/shared/${token}/access`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: '' } as AccessSharedDocumentRequest),
  });

  // Handle rate limiting (429 Too Many Requests)
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new RateLimitError(retryAfter);
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage = 'Failed to access document';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new DocumentAccessError(response.status, errorMessage);
  }

  return response.json();
}

/**
 * Download a document from a presigned URL
 * @param documentUrl - The presigned URL from the access response
 * @param filename - The filename to save as
 */
export async function downloadDocument(
  documentUrl: string,
  filename: string
): Promise<void> {
  const response = await fetch(documentUrl);

  if (!response.ok) {
    throw new Error('Failed to download document');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
