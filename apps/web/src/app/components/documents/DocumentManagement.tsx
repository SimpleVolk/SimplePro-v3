'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../../lib/config';
import { Document, DocumentFilters } from './types';
import { DocumentUpload } from './DocumentUpload';
import { DocumentViewer } from './DocumentViewer';
import { ShareDialog } from './ShareDialog';
import styles from './DocumentManagement.module.css';

type ViewMode = 'grid' | 'list';

export function DocumentManagement() {
  const { user: _user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [showUpload, setShowUpload] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [documentToShare, setDocumentToShare] = useState<Document | null>(null);

  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    documentType: undefined,
    entityType: undefined,
  });

  // Statistics
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSize: 0,
    recentUploads: 0,
  });

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.documentType)
        queryParams.append('documentType', filters.documentType);
      if (filters.entityType)
        queryParams.append('entityType', filters.entityType);

      const response = await fetch(
        `${getApiUrl('documents')}?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data);

      // Calculate stats
      const totalSize = data.reduce(
        (sum: number, doc: Document) => sum + doc.size,
        0,
      );
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentUploads = data.filter(
        (doc: Document) => new Date(doc.uploadedAt) > sevenDaysAgo,
      ).length;

      setStats({
        totalDocuments: data.length,
        totalSize,
        recentUploads,
      });

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

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(getApiUrl(`documents/${documentId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');

      setDocuments(documents.filter((doc) => doc.id !== documentId));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document');
    }
  };

  const handleShare = (document: Document) => {
    setDocumentToShare(document);
    setShowShareDialog(true);
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '📷';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📦';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading && documents.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className={styles.documentManagement}>
      <div className={styles.header}>
        <div>
          <h2>Document Library</h2>
          <p className={styles.subtitle}>Manage all your documents and files</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className={styles.uploadButton}
        >
          {showUpload ? 'Hide Upload' : '+ Upload Documents'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Statistics */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📄</div>
          <div className={styles.statContent}>
            <p className={styles.statValue}>{stats.totalDocuments}</p>
            <p className={styles.statLabel}>Total Documents</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💾</div>
          <div className={styles.statContent}>
            <p className={styles.statValue}>
              {formatFileSize(stats.totalSize)}
            </p>
            <p className={styles.statLabel}>Storage Used</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⬆️</div>
          <div className={styles.statContent}>
            <p className={styles.statValue}>{stats.recentUploads}</p>
            <p className={styles.statLabel}>Recent Uploads (7d)</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className={styles.uploadSection}>
          <DocumentUpload
            onUploadComplete={(_newDocs) => {
              fetchDocuments();
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {/* Filters and View Toggle */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search documents..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={styles.searchInput}
          />
          <select
            value={filters.documentType || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                documentType: e.target.value || undefined,
              })
            }
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            <option value="contract">Contract</option>
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
            <option value="estimate">Estimate</option>
            <option value="photo">Photo</option>
            <option value="insurance">Insurance</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filters.entityType || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                entityType: e.target.value || undefined,
              })
            }
            className={styles.filterSelect}
          >
            <option value="">All Entities</option>
            <option value="customer">Customer</option>
            <option value="job">Job</option>
            <option value="estimate">Estimate</option>
            <option value="invoice">Invoice</option>
          </select>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={viewMode === 'grid' ? styles.active : ''}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ▦
          </button>
          <button
            className={viewMode === 'list' ? styles.active : ''}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Documents Display */}
      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📂</div>
          <p>No documents found</p>
          <button
            onClick={() => setShowUpload(true)}
            className={styles.emptyButton}
          >
            Upload Your First Document
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid' ? styles.documentsGrid : styles.documentsList
          }
        >
          {documents.map((doc) => (
            <div key={doc.id} className={styles.documentCard}>
              <div
                className={styles.documentPreview}
                onClick={() => handleViewDocument(doc)}
              >
                {doc.mimeType.startsWith('image/') ? (
                  <img src={doc.url} alt={doc.originalName} />
                ) : (
                  <div className={styles.documentIcon}>
                    {getFileIcon(doc.mimeType)}
                  </div>
                )}
              </div>
              <div className={styles.documentInfo}>
                <h3
                  className={styles.documentName}
                  onClick={() => handleViewDocument(doc)}
                  title={doc.originalName}
                >
                  {doc.originalName}
                </h3>
                <div className={styles.documentMeta}>
                  <span className={styles.documentType}>
                    {doc.documentType}
                  </span>
                  <span className={styles.documentSize}>
                    {formatFileSize(doc.size)}
                  </span>
                  <span className={styles.documentDate}>
                    {formatDate(doc.uploadedAt)}
                  </span>
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className={styles.documentTags}>
                    {doc.tags.map((tag, idx) => (
                      <span key={idx} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.documentActions}>
                <button
                  onClick={() => handleViewDocument(doc)}
                  className={styles.actionButton}
                  title="View"
                >
                  👁️
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className={styles.actionButton}
                  title="Download"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleShare(doc)}
                  className={styles.actionButton}
                  title="Share"
                >
                  🔗
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className={styles.actionButton}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
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

      {/* Share Dialog */}
      {showShareDialog && documentToShare && (
        <ShareDialog
          document={documentToShare}
          onClose={() => {
            setShowShareDialog(false);
            setDocumentToShare(null);
          }}
        />
      )}
    </div>
  );
}
