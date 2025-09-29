'use client';

import React, { useState } from 'react';
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
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function AuditLogs() {
  const [logs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2024-01-15T14:30:00Z',
      userId: '1',
      userName: 'Admin User',
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: '5',
      details: 'Created new user: John Doe (john.doe@company.com)',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium'
    },
    {
      id: '2',
      timestamp: '2024-01-15T13:45:00Z',
      userId: '2',
      userName: 'John Dispatcher',
      action: 'JOB_STATUS_CHANGED',
      resource: 'job',
      resourceId: '123',
      details: 'Changed job status from "scheduled" to "in_progress"',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low'
    },
    {
      id: '3',
      timestamp: '2024-01-15T12:20:00Z',
      userId: '1',
      userName: 'Admin User',
      action: 'PRICING_RULE_MODIFIED',
      resource: 'pricing_rule',
      resourceId: 'base_local_rate',
      details: 'Modified base local moving rate from $150/hour to $160/hour',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'high'
    },
    {
      id: '4',
      timestamp: '2024-01-15T11:15:00Z',
      userId: '1',
      userName: 'Admin User',
      action: 'USER_LOGIN',
      resource: 'authentication',
      details: 'Successful login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low'
    },
    {
      id: '5',
      timestamp: '2024-01-15T10:30:00Z',
      userId: '3',
      userName: 'Mike CrewLead',
      action: 'JOB_COMPLETED',
      resource: 'job',
      resourceId: '122',
      details: 'Marked job as completed with customer signature',
      ipAddress: '10.0.0.25',
      userAgent: 'SimplePro Mobile App v1.0',
      severity: 'low'
    }
  ]);

  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(logs);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const actionTypes = [
    'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_MODIFIED', 'USER_DELETED',
    'JOB_CREATED', 'JOB_MODIFIED', 'JOB_STATUS_CHANGED', 'JOB_COMPLETED',
    'CUSTOMER_CREATED', 'CUSTOMER_MODIFIED', 'CUSTOMER_DELETED',
    'ESTIMATE_CREATED', 'ESTIMATE_MODIFIED', 'ESTIMATE_APPROVED',
    'PRICING_RULE_MODIFIED', 'SYSTEM_SETTINGS_CHANGED'
  ];

  // Filter logs based on criteria
  const applyFilters = () => {
    let filtered = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const matchesDateRange = logDate >= startDate && logDate <= endDate;
      const matchesAction = filterAction === 'all' || log.action === filterAction;
      const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
      const matchesSearch = searchQuery === '' ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDateRange && matchesAction && matchesSeverity && matchesSearch;
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  // Apply filters whenever criteria change
  React.useEffect(() => {
    applyFilters();
  }, [dateRange, filterAction, filterSeverity, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityClass = (severity: string) => {
    const classes = {
      low: styles.severityLow,
      medium: styles.severityMedium,
      high: styles.severityHigh,
      critical: styles.severityCritical
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
      SYSTEM_SETTINGS_CHANGED: '⚙️'
    };
    return icons[action] || '📝';
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const exportLogs = () => {
    const csvContent = [
      'Timestamp,User,Action,Resource,Details,IP Address,Severity',
      ...filteredLogs.map(log =>
        `"${log.timestamp}","${log.userName}","${log.action}","${log.resource}","${log.details}","${log.ipAddress}","${log.severity}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.auditLogs}>
      <div className={styles.header}>
        <div>
          <h3>Audit Logs</h3>
          <p>View system activity and security events</p>
        </div>
        <button onClick={exportLogs} className={styles.exportButton}>
          📥 Export Logs
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.dateRange}>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className={styles.dateInput}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className={styles.dateInput}
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Actions</option>
          {actionTypes.map(action => (
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
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
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
        <span>Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs</span>
      </div>

      <div className={styles.logsContainer}>
        <div className={styles.logsList}>
          {currentLogs.map(log => (
            <div key={log.id} className={styles.logEntry}>
              <div className={styles.logHeader}>
                <div className={styles.logAction}>
                  <span className={styles.actionIcon}>{getActionIcon(log.action)}</span>
                  <span className={styles.actionText}>{log.action.replace(/_/g, ' ')}</span>
                  <span className={`${styles.severity} ${getSeverityClass(log.severity)}`}>
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
                <div className={styles.logDescription}>
                  {log.details}
                </div>
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
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              ← Previous
            </button>

            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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