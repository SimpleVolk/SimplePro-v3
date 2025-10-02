'use client';

import { useState, useCallback, useRef } from 'react';
import { getApiUrl } from '@/lib/config';
import { UploadProgress } from './types';
import styles from './DocumentUpload.module.css';

interface DocumentUploadProps {
  onUploadComplete?: (documents: any[]) => void;
  entityType?: 'customer' | 'job' | 'estimate' | 'invoice';
  entityId?: string;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function DocumentUpload({
  onUploadComplete,
  entityType,
  entityId,
  maxFileSize = 50,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: DocumentUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [tags, description, documentType, entityType, entityId]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter((file) => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        alert(`File type not allowed: ${file.name}`);
        return false;
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`File too large: ${file.name} (max ${maxFileSize}MB)`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Initialize upload progress for each file
    const newUploads: UploadProgress[] = validFiles.map((file) => ({
      fileId: `${Date.now()}-${file.name}`,
      filename: file.name,
      progress: 0,
      status: 'uploading',
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Upload files
    const uploadedDocs = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileId = newUploads[i].fileId;

      try {
        const doc = await uploadFile(file, fileId);
        uploadedDocs.push(doc);

        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === fileId ? { ...u, progress: 100, status: 'success' } : u
          )
        );
      } catch (error) {
        console.error('Upload error:', error);
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === fileId
              ? { ...u, status: 'error', error: 'Upload failed' }
              : u
          )
        );
      }
    }

    if (uploadedDocs.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedDocs);
    }

    // Clear form after successful uploads
    if (uploadedDocs.length === validFiles.length) {
      setTags('');
      setDescription('');
      setDocumentType('other');
      setTimeout(() => {
        setUploads([]);
      }, 3000);
    }
  };

  const uploadFile = async (file: File, fileId: string): Promise<any> => {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      formData.append('tags', JSON.stringify(tagArray));
    }

    if (description) {
      formData.append('description', description);
    }

    if (entityType) {
      formData.append('entityType', entityType);
    }

    if (entityId) {
      formData.append('entityId', entityId);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((u) => (u.fileId === fileId ? { ...u, progress } : u))
          );
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', getApiUrl('documents/upload'));
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '📷';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📦';
    }
  };

  return (
    <div className={styles.uploadContainer}>
      <div className={styles.uploadForm}>
        <div className={styles.formFields}>
          <div className={styles.formGroup}>
            <label htmlFor="documentType">Document Type</label>
            <select
              id="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className={styles.select}
            >
              <option value="other">Other</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
              <option value="estimate">Estimate</option>
              <option value="photo">Photo</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., important, signed, delivery"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className={styles.textarea}
              rows={2}
            />
          </div>
        </div>

        <div
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.dropZoneContent}>
            <div className={styles.uploadIcon}>📤</div>
            <p className={styles.dropZoneText}>
              Drag and drop files here, or click to browse
            </p>
            <p className={styles.dropZoneHint}>
              Max {maxFileSize}MB • PDF, Images, Documents, Spreadsheets
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={handleFileSelect}
            className={styles.fileInput}
          />
        </div>
      </div>

      {uploads.length > 0 && (
        <div className={styles.uploadsList}>
          <h3>Uploading Files</h3>
          {uploads.map((upload) => (
            <div key={upload.fileId} className={styles.uploadItem}>
              <div className={styles.uploadInfo}>
                <span className={styles.fileIcon}>
                  {getFileIcon(upload.filename)}
                </span>
                <div className={styles.uploadDetails}>
                  <p className={styles.filename}>{upload.filename}</p>
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progressFill} ${
                        upload.status === 'success'
                          ? styles.progressSuccess
                          : upload.status === 'error'
                          ? styles.progressError
                          : ''
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.uploadStatus}>
                {upload.status === 'uploading' && (
                  <span className={styles.statusUploading}>
                    {upload.progress}%
                  </span>
                )}
                {upload.status === 'success' && (
                  <span className={styles.statusSuccess}>✓</span>
                )}
                {upload.status === 'error' && (
                  <span className={styles.statusError}>✗</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
