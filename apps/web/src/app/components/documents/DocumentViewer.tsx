'use client';

import { useState } from 'react';
import { Document } from './types';
import styles from './DocumentViewer.module.css';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onDownload: (document: Document) => void;
  onShare: (document: Document) => void;
}

export function DocumentViewer({
  document,
  onClose,
  onDownload,
  onShare,
}: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedTags, setEditedTags] = useState(document.tags.join(', '));
  const [editedDescription, setEditedDescription] = useState(
    document.description || '',
  );

  const isPDF = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSaveMetadata = async () => {
    // TODO: Implement metadata update API call
    setIsEditingMetadata(false);
  };

  return (
    <div className={styles.viewerOverlay} onClick={onClose}>
      <div
        className={styles.viewerContainer}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.viewerHeader}>
          <div className={styles.headerLeft}>
            <h3>{document.originalName}</h3>
            <span className={styles.fileInfo}>
              {formatFileSize(document.size)} • {document.documentType}
            </span>
          </div>
          <div className={styles.headerActions}>
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className={styles.headerButton}
                  title="Zoom out"
                >
                  🔍−
                </button>
                <span className={styles.zoomLevel}>{zoom}%</span>
                <button
                  onClick={handleZoomIn}
                  className={styles.headerButton}
                  title="Zoom in"
                >
                  🔍+
                </button>
                <button
                  onClick={handleRotate}
                  className={styles.headerButton}
                  title="Rotate"
                >
                  🔄
                </button>
              </>
            )}
            <button
              onClick={() => onDownload(document)}
              className={styles.headerButton}
              title="Download"
            >
              ⬇️
            </button>
            <button
              onClick={() => onShare(document)}
              className={styles.headerButton}
              title="Share"
            >
              🔗
            </button>
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.viewerContent}>
          <div className={styles.previewPanel}>
            {isPDF ? (
              <div className={styles.pdfViewer}>
                <iframe
                  src={document.url}
                  title={document.originalName}
                  className={styles.pdfFrame}
                />
                <div className={styles.pdfControls}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>
                  <span>Page {currentPage}</span>
                  <button onClick={() => setCurrentPage((p) => p + 1)}>
                    →
                  </button>
                </div>
              </div>
            ) : isImage ? (
              <div className={styles.imageViewer}>
                <img
                  src={document.url}
                  alt={document.originalName}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  }}
                  className={styles.viewerImage}
                />
              </div>
            ) : (
              <div className={styles.unsupportedPreview}>
                <div className={styles.unsupportedIcon}>📄</div>
                <p>Preview not available for this file type</p>
                <button
                  onClick={() => onDownload(document)}
                  className={styles.downloadButton}
                >
                  Download to View
                </button>
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <div className={styles.metadataPanel}>
            <div className={styles.metadataHeader}>
              <h4>Document Details</h4>
              <button
                onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                className={styles.editButton}
              >
                {isEditingMetadata ? 'Cancel' : '✏️ Edit'}
              </button>
            </div>

            <div className={styles.metadataContent}>
              {/* Basic Info */}
              <div className={styles.metadataSection}>
                <h5>Information</h5>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>File Name:</span>
                  <span className={styles.metadataValue}>
                    {document.originalName}
                  </span>
                </div>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>Type:</span>
                  <span className={styles.metadataValue}>
                    {document.documentType}
                  </span>
                </div>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>Size:</span>
                  <span className={styles.metadataValue}>
                    {formatFileSize(document.size)}
                  </span>
                </div>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>Uploaded:</span>
                  <span className={styles.metadataValue}>
                    {formatDate(document.uploadedAt)}
                  </span>
                </div>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>Uploaded By:</span>
                  <span className={styles.metadataValue}>
                    {document.uploadedBy}
                  </span>
                </div>
              </div>

              {/* Entity Association */}
              {document.entityType && document.entityId && (
                <div className={styles.metadataSection}>
                  <h5>Associated With</h5>
                  <div className={styles.metadataRow}>
                    <span className={styles.metadataLabel}>Entity:</span>
                    <span className={styles.metadataValue}>
                      {document.entityType} - {document.entityId}
                    </span>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className={styles.metadataSection}>
                <h5>Tags</h5>
                {isEditingMetadata ? (
                  <input
                    type="text"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                    placeholder="Comma-separated tags"
                    className={styles.metadataInput}
                  />
                ) : (
                  <div className={styles.tagsList}>
                    {document.tags.length > 0 ? (
                      document.tags.map((tag, idx) => (
                        <span key={idx} className={styles.tag}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noData}>No tags</span>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className={styles.metadataSection}>
                <h5>Description</h5>
                {isEditingMetadata ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Add description..."
                    className={styles.metadataTextarea}
                    rows={3}
                  />
                ) : (
                  <p className={styles.description}>
                    {document.description || (
                      <span className={styles.noData}>No description</span>
                    )}
                  </p>
                )}
              </div>

              {isEditingMetadata && (
                <button
                  onClick={handleSaveMetadata}
                  className={styles.saveButton}
                >
                  Save Changes
                </button>
              )}

              {/* Version History */}
              <div className={styles.metadataSection}>
                <h5>Version History</h5>
                <p className={styles.noData}>No previous versions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
