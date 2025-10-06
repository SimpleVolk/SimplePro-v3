'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  accessSharedDocument,
  accessPublicDocument,
  downloadDocument,
} from '../../../services/documents.service';
import {
  RateLimitError,
  DocumentAccessError,
  AccessSharedDocumentResponse,
} from './types';
import { RateLimitNotification } from './RateLimitNotification';
import styles from './SharedDocumentAccess.module.css';

interface SharedDocumentAccessProps {
  token: string;
}

type AccessState = 'initial' | 'loading' | 'success' | 'error' | 'rate_limited';

export function SharedDocumentAccess({ token }: SharedDocumentAccessProps) {
  const [password, setPassword] = useState('');
  const [state, setState] = useState<AccessState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<string | null>(null);
  const [document, setDocument] = useState<AccessSharedDocumentResponse | null>(
    null,
  );
  const [needsPassword, setNeedsPassword] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Try public access on mount
  useEffect(() => {
    tryPublicAccess();
  }, [token]);

  const tryPublicAccess = async () => {
    try {
      setState('loading');
      setError(null);
      const response = await accessPublicDocument(token);
      setDocument(response);
      setNeedsPassword(false);
      setState('success');
    } catch (err) {
      if (err instanceof DocumentAccessError) {
        // If 401/403, this likely needs a password
        if (err.statusCode === 401 || err.statusCode === 403) {
          setNeedsPassword(true);
          setState('initial');
        } else if (err.statusCode === 404) {
          setError('Document not found or link has expired');
          setState('error');
        } else if (err.statusCode === 410) {
          setError('This share link has expired');
          setState('error');
        } else {
          setError(err.message);
          setState('error');
        }
      } else if (err instanceof RateLimitError) {
        setRetryAfter(err.retryAfter);
        setState('rate_limited');
      } else {
        setError('An unexpected error occurred');
        setState('error');
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    try {
      setState('loading');
      setError(null);
      setRetryAfter(null);

      const response = await accessSharedDocument(token, password);
      setDocument(response);
      setState('success');
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRetryAfter(err.retryAfter);
        setState('rate_limited');
      } else if (err instanceof DocumentAccessError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setError('Invalid password. Please try again.');
        } else if (err.statusCode === 404) {
          setError('Document not found or link has expired');
        } else if (err.statusCode === 410) {
          setError('This share link has expired');
        } else {
          setError(err.message);
        }
        setState('error');
      } else {
        setError('An unexpected error occurred');
        setState('error');
      }
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      await downloadDocument(document.documentUrl, document.documentName);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const handleDismissRateLimit = () => {
    setState('initial');
    setRetryAfter(null);
    setPassword('');
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
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
      return '📊';
    return '📦';
  };

  // Show rate limit notification
  if (state === 'rate_limited') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <RateLimitNotification
            retryAfter={retryAfter}
            onDismiss={handleDismissRateLimit}
          />
          <div className={styles.rateLimitInfo}>
            <p className={styles.helpText}>
              For security, access is temporarily limited after multiple failed
              attempts. You can try again once the timer expires.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show success state with document info
  if (state === 'success' && document) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successHeader}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Document Ready</h1>
          </div>

          <div className={styles.documentInfo}>
            <div className={styles.documentIcon}>
              {getFileIcon(document.mimeType)}
            </div>
            <div className={styles.documentDetails}>
              <h2 className={styles.documentName}>{document.documentName}</h2>
              <div className={styles.documentMeta}>
                <span className={styles.metaItem}>
                  Type: {document.documentType}
                </span>
                <span className={styles.metaItem}>
                  Size: {formatFileSize(document.size)}
                </span>
                {document.expiresAt && (
                  <span className={styles.metaItem}>
                    Expires: {new Date(document.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button onClick={handleDownload} className={styles.downloadButton}>
            ⬇️ Download Document
          </button>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              This document was shared with you securely. The download link will
              expire after use.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show password form (initial or needs password)
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🔒</div>
          <h1 className={styles.title}>Access Shared Document</h1>
          {needsPassword && (
            <p className={styles.subtitle}>
              This document is password protected
            </p>
          )}
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span className={styles.errorIcon}>⚠️</span>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        {needsPassword !== false && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the password"
                  className={styles.input}
                  disabled={state === 'loading'}
                  autoFocus
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.showPasswordButton}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {error && (
                <p id="password-error" className={styles.fieldError}>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={state === 'loading' || !password.trim()}
            >
              {state === 'loading' ? (
                <>
                  <span className={styles.spinner} />
                  Accessing...
                </>
              ) : (
                'Access Document'
              )}
            </button>
          </form>
        )}

        {state === 'loading' && needsPassword === null && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading document...</p>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.securityBadge}>
            <span className={styles.badgeIcon}>🔐</span>
            <span className={styles.badgeText}>Secure Document Sharing</span>
          </div>
          <p className={styles.helpText}>
            Having trouble? Contact the person who shared this document with
            you.
          </p>
        </div>
      </div>
    </div>
  );
}
