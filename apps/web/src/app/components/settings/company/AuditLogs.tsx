'use client';

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from './AuditLogs.module.css';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  outcome?: 'success' | 'failure';
}

export default function AuditLogs() {
  const [_logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const actionTypes = [
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_CREATED',
    'USER_MODIFIED',
    'USER_DELETED',
    'JOB_CREATED',
    'JOB_MODIFIED',
    'JOB_STATUS_CHANGED',
    'JOB_COMPLETED',
    'CUSTOMER_CREATED',
    'CUSTOMER_MODIFIED',
    'CUSTOMER_DELETED',
    'ESTIMATE_CREATED',
    'ESTIMATE_MODIFIED',
    'ESTIMATE_APPROVED',
    'PRICING_RULE_MODIFIED',
    'SYSTEM_SETTINGS_CHANGED',
  ];

  // Fetch audit logs from API
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: '50',
        skip: '0',
      });

      if (filterAction !== 'all') params.append('action', filterAction);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (searchQuery) params.append('search', searchQuery);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getApiUrl('audit-logs')}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();
      const fetchedLogs = result.data || [];
      setLogs(fetchedLogs);
      setFilteredLogs(fetchedLogs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load audit logs',
      );
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs on component mount and filter changes
  useEffect(() => {
    fetchLogs();
  }, [dateRange, filterAction, filterSeverity, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSeverityClass = (severity: string) => {
    const classes = {
      info: styles.severityLow,
      warning: styles.severityMedium,
      error: styles.severityHigh,
      critical: styles.severityCritical,
      // Legacy mappings for backward compatibility
      low: styles.severityLow,
      medium: styles.severityMedium,
      high: styles.severityHigh,
    };
    return classes[severity as keyof typeof classes] || styles.severityLow;
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      USER_LOGIN: '🔐',
      USER_LOGOUT: '🚪',
      USER_CREATED: '👤',
      USER_MODIFIED: '✏️',
      USER_DELETED: '🗑️',
      JOB_CREATED: '📦',
      JOB_MODIFIED: '📝',
      JOB_STATUS_CHANGED: '🔄',
      JOB_COMPLETED: '✅',
      CUSTOMER_CREATED: '👥',
      CUSTOMER_MODIFIED: '👥',
      CUSTOMER_DELETED: '❌',
      ESTIMATE_CREATED: '📋',
      ESTIMATE_MODIFIED: '📋',
      ESTIMATE_APPROVED: '✅',
      PRICING_RULE_MODIFIED: '💰',
      SYSTEM_SETTINGS_CHANGED: '⚙️',
    };
    return icons[action] || '📝';
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'csv',
      });

      if (filterAction !== 'all') params.append('action', filterAction);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (searchQuery) params.append('search', searchQuery);

      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getApiUrl('audit-logs/export/csv')}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to export logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting logs:', err);
      setError('Failed to export audit logs');
    }
  };

  return (
    <div className={styles.auditLogs}>
      <div className={styles.header}>
        <div>
          <h3>Audit Logs</h3>
          <p>View system activity and security events</p>
        </div>
        <button
          onClick={exportLogs}
          className={styles.exportButton}
          disabled={loading}
        >
          📥 Export Logs
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>
            ×
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.loadingMessage}>Loading audit logs...</div>
      )}

      <div className={styles.filters}>
        <div className={styles.dateRange}>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
            }
            className={styles.dateInput}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className={styles.dateInput}
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Actions</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        <span>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of{' '}
          {filteredLogs.length} logs
        </span>
      </div>

      <div className={styles.logsContainer}>
        <div className={styles.logsList}>
          {currentLogs.map((log) => (
            <div key={log.id} className={styles.logEntry}>
              <div className={styles.logHeader}>
                <div className={styles.logAction}>
                  <span className={styles.actionIcon}>
                    {getActionIcon(log.action)}
                  </span>
                  <span className={styles.actionText}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`${styles.severity} ${getSeverityClass(log.severity)}`}
                  >
                    {log.severity.toUpperCase()}
                  </span>
                </div>
                <div className={styles.logTimestamp}>
                  {formatDate(log.timestamp)}
                </div>
              </div>

              <div className={styles.logDetails}>
                <div className={styles.logUser}>
                  <strong>{log.userName}</strong>
                  {log.resourceId && (
                    <span className={styles.resourceId}>
                      {log.resource}:{log.resourceId}
                    </span>
                  )}
                </div>
                <div className={styles.logDescription}>{log.details}</div>
                <div className={styles.logMeta}>
                  <span>IP: {log.ipAddress}</span>
                  <span>•</span>
                  <span>{log.userAgent.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className={styles.emptyState}>
            <p>No audit logs found for the selected criteria</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              ← Previous
            </button>

            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className={styles.pageButton}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
