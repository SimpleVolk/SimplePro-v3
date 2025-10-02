/**
 * Documents API
 *
 * Endpoints for photo uploads, signatures, and document management
 */

import apiClient from './client';

export const documentsApi = {
  /**
   * Upload photo
   */
  uploadPhoto: async (
    token: string,
    data: {
      jobId: string;
      photoType: string;
      photoUri: string;
      fileName: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('jobId', data.jobId);
    formData.append('documentType', data.photoType);
    formData.append('file', {
      uri: data.photoUri,
      type: 'image/jpeg',
      name: data.fileName,
    } as any);

    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Upload signature
   */
  uploadSignature: async (
    token: string,
    data: {
      jobId: string;
      signatureData: string;
      documentType: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('jobId', data.jobId);
    formData.append('documentType', data.documentType);
    formData.append('signature', data.signatureData);

    const response = await apiClient.post('/documents/signature', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get job documents
   */
  getJobDocuments: async (token: string, jobId: string) => {
    const response = await apiClient.get(`/documents/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Download document
   */
  downloadDocument: async (token: string, documentId: string) => {
    const response = await apiClient.get(`/documents/${documentId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });
    return response.data;
  },
};
