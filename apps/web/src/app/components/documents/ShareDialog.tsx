'use client';

import { useState } from 'react';
import { getApiUrl } from '@/lib/config';
import { Document, ShareLink } from './types';
import styles from './ShareDialog.module.css';

interface ShareDialogProps {
  document: Document;
  onClose: () => void;
}

export function ShareDialog({ document, onClose }: ShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [usePassword, setUsePassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareHistory, setShareHistory] = useState<ShareLink[]>(
    document.shareLinks || []
  );

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const requestBody: any = {
        documentId: document.id,
      };

      if (expiresAt) {
        requestBody.expiresAt = new Date(expiresAt).toISOString();
      }

      if (usePassword && password) {
        requestBody.password = password;
      }

      const response = await fetch(getApiUrl(`documents/${document.id}/share`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate share link');
      }

      const data = await response.json();
      setShareLink(data);
      setShareHistory([data, ...shareHistory]);
    } catch (err) {
      console.error('Share link generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const handleShareViaEmail = () => {
    if (!shareLink) return;

    const subject = encodeURIComponent(`Shared Document: ${document.originalName}`);
    const body = encodeURIComponent(
      `I've shared a document with you.\n\nDocument: ${document.originalName}\nLink: ${shareLink.url}\n\n${
        shareLink.expiresAt
          ? `This link will expire on ${new Date(shareLink.expiresAt).toLocaleDateString()}.`
          : 'This link does not expire.'
      }\n\n${
        shareLink.isPasswordProtected
          ? 'This link is password protected. Please contact me for the password.'
          : ''
      }`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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

  const getMinDateTime = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className={styles.dialogOverlay} onClick={onClose}>
      <div className={styles.dialogContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <div>
            <h3>Share Document</h3>
            <p className={styles.documentName}>{document.originalName}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.dialogContent}>
          {error && (
            <div className={styles.error}>
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Generate New Link Section */}
          <div className={styles.section}>
            <h4>Generate Share Link</h4>

            <div className={styles.formGroup}>
              <label htmlFor="expiresAt">Expiration Date (Optional)</label>
              <input
                type="datetime-local"
                id="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={getMinDateTime()}
                className={styles.input}
              />
              <p className={styles.hint}>Leave empty for no expiration</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Password Protection</span>
              </label>
            </div>

            {usePassword && (
              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className={styles.input}
                />
              </div>
            )}

            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className={styles.generateButton}
            >
              {loading ? 'Generating...' : 'Generate Link'}
            </button>
          </div>

          {/* Current Share Link */}
          {shareLink && (
            <div className={styles.section}>
              <h4>Share Link Generated</h4>

              <div className={styles.linkBox}>
                <input
                  type="text"
                  value={shareLink.url}
                  readOnly
                  className={styles.linkInput}
                />
                <button onClick={handleCopyLink} className={styles.copyButton}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>

              <div className={styles.linkInfo}>
                {shareLink.expiresAt && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Expires:</span>
                    <span className={styles.infoValue}>
                      {formatDate(shareLink.expiresAt)}
                    </span>
                  </div>
                )}
                {shareLink.isPasswordProtected && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Password:</span>
                    <span className={styles.infoValue}>Protected</span>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Created:</span>
                  <span className={styles.infoValue}>
                    {formatDate(shareLink.createdAt)}
                  </span>
                </div>
              </div>

              <button onClick={handleShareViaEmail} className={styles.emailButton}>
                📧 Share via Email
              </button>
            </div>
          )}

          {/* Share History */}
          {shareHistory.length > 0 && (
            <div className={styles.section}>
              <h4>Share History</h4>
              <div className={styles.historyList}>
                {shareHistory.map((link) => (
                  <div key={link.id} className={styles.historyItem}>
                    <div className={styles.historyInfo}>
                      <div className={styles.historyUrl}>{link.url}</div>
                      <div className={styles.historyMeta}>
                        <span>Created: {formatDate(link.createdAt)}</span>
                        {link.expiresAt && (
                          <>
                            <span>•</span>
                            <span>
                              Expires: {formatDate(link.expiresAt)}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>Views: {link.accessCount}</span>
                      </div>
                    </div>
                    <div className={styles.historyBadges}>
                      {link.isPasswordProtected && (
                        <span className={styles.badge}>🔒 Protected</span>
                      )}
                      {link.expiresAt &&
                        new Date(link.expiresAt) < new Date() && (
                          <span className={`${styles.badge} ${styles.expired}`}>
                            ⏱️ Expired
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Tips */}
          <div className={styles.tips}>
            <h5>Tips for Secure Sharing:</h5>
            <ul>
              <li>Set an expiration date for sensitive documents</li>
              <li>Use password protection for confidential information</li>
              <li>Share links only through secure channels (email, messaging)</li>
              <li>Monitor access counts in share history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
