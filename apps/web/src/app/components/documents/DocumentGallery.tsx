'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import { Document } from './types';
import { DocumentViewer } from './DocumentViewer';
import { DocumentUpload } from './DocumentUpload';
import styles from './DocumentGallery.module.css';

interface DocumentGalleryProps {
  entityType: 'customer' | 'job' | 'estimate' | 'invoice';
  entityId: string;
  title?: string;
  allowUpload?: boolean;
}

export function DocumentGallery({
  entityType,
  entityId,
  title = 'Related Documents',
  allowUpload = true,
}: DocumentGalleryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [showViewer, setShowViewer] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        getApiUrl(`documents/entity/${entityType}/${entityId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        getApiUrl(`documents/${document.id}/download`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const handleShare = (document: Document) => {
    // This will be handled by the parent component or open share dialog
    // TODO: Implement share functionality
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '📷';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📦';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && documents.length === 0) {
    return (
      <div className={styles.galleryContainer}>
        <div className={styles.header}>
          <h3>{title}</h3>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>{title}</h3>
          <span className={styles.documentCount}>
            {documents.length}{' '}
            {documents.length === 1 ? 'document' : 'documents'}
          </span>
        </div>
        {allowUpload && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={styles.uploadButton}
          >
            {showUpload ? 'Cancel' : '+ Upload'}
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {showUpload && (
        <div className={styles.uploadSection}>
          <DocumentUpload
            entityType={entityType}
            entityId={entityId}
            onUploadComplete={(_newDocs) => {
              fetchDocuments();
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📂</div>
          <p>No documents yet</p>
          {allowUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className={styles.emptyButton}
            >
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className={styles.gallery}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={styles.galleryItem}
              onClick={() => handleViewDocument(doc)}
            >
              <div className={styles.thumbnail}>
                {doc.mimeType.startsWith('image/') ? (
                  <img src={doc.url} alt={doc.originalName} />
                ) : (
                  <div className={styles.fileIcon}>
                    {getFileIcon(doc.mimeType)}
                  </div>
                )}
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemName} title={doc.originalName}>
                  {doc.originalName}
                </p>
                <div className={styles.itemMeta}>
                  <span className={styles.itemSize}>
                    {formatFileSize(doc.size)}
                  </span>
                  <span className={styles.itemDate}>
                    {formatDate(doc.uploadedAt)}
                  </span>
                </div>
              </div>
              <div className={styles.quickActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(doc);
                  }}
                  className={styles.quickAction}
                  title="Download"
                >
                  ⬇️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Viewer */}
      {showViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => {
            setShowViewer(false);
            setSelectedDocument(null);
          }}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}
    </div>
  );
}
