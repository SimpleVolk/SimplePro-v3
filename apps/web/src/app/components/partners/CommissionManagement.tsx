'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import styles from './CommissionManagement.module.css';
import type { Partner, Commission, CommissionStatus } from './types';

interface CommissionManagementProps {
  partners: Partner[];
}

export function CommissionManagement({ partners }: CommissionManagementProps) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());

  // Fetch commissions
  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getApiUrl('/partner-commissions'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch commissions: ${response.statusText}`);
      }

      const data = await response.json();
      setCommissions(data);
    } catch (err) {
      console.error('Error fetching commissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  // Filter commissions
  const filteredCommissions = commissions.filter(commission => {
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    const matchesPartner = partnerFilter === 'all' || commission.partnerId === partnerFilter;
    return matchesStatus && matchesPartner;
  });

  // Calculate summary statistics
  const summary = {
    totalCommissions: filteredCommissions.length,
    pendingAmount: filteredCommissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    calculatedAmount: filteredCommissions
      .filter(c => c.status === 'calculated')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    paidAmount: filteredCommissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    totalAmount: filteredCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
  };

  // Toggle commission selection
  const toggleCommissionSelection = (commissionId: string) => {
    const newSelection = new Set(selectedCommissions);
    if (newSelection.has(commissionId)) {
      newSelection.delete(commissionId);
    } else {
      newSelection.add(commissionId);
    }
    setSelectedCommissions(newSelection);
  };

  // Select all visible commissions
  const selectAll = () => {
    if (selectedCommissions.size === filteredCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(filteredCommissions.map(c => c.id)));
    }
  };

  // Mark commission as paid
  const markAsPaid = async (commissionId: string) => {
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(getApiUrl(`/partner-commissions/${commissionId}/status`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'paid',
          paidAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark commission as paid');
      }

      fetchCommissions();
    } catch (err) {
      console.error('Error marking commission as paid:', err);
      setError('Failed to update commission status');
    }
  };

  // Bulk mark as paid
  const bulkMarkAsPaid = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      await Promise.all(
        Array.from(selectedCommissions).map(async (commissionId) => {
          await fetch(getApiUrl(`/partner-commissions/${commissionId}/status`), {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'paid',
              paidAt: new Date().toISOString(),
            }),
          });
        })
      );

      setSelectedCommissions(new Set());
      fetchCommissions();
    } catch (err) {
      console.error('Error in bulk update:', err);
      setError('Failed to update commission statuses');
    } finally {
      setLoading(false);
    }
  };

  // Export commissions
  const exportCommissions = () => {
    const csvContent = [
      ['Partner', 'Job Value', 'Commission', 'Rate', 'Status', 'Created', 'Paid'].join(','),
      ...filteredCommissions.map(c => [
        c.partnerName || 'Unknown',
        c.jobValue.toFixed(2),
        c.commissionAmount.toFixed(2),
        c.commissionRate ? `${c.commissionRate}%` : 'N/A',
        c.status,
        new Date(c.createdAt).toLocaleDateString(),
        c.paidAt ? new Date(c.paidAt).toLocaleDateString() : 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get partner name
  const getPartnerName = (partnerId: string): string => {
    const partner = partners.find(p => p.id === partnerId);
    return partner?.name || 'Unknown Partner';
  };

  // Get status badge class
  const getStatusClass = (status: CommissionStatus): string => {
    return styles[status] || '';
  };

  if (loading && commissions.length === 0) {
    return <div className={styles.loading}>Loading commissions...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>💰</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>${summary.totalAmount.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Total Commissions</div>
            <div className={styles.summarySubtext}>{summary.totalCommissions} records</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>⏳</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>${summary.pendingAmount.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Pending</div>
            <div className={styles.summarySubtext}>awaiting calculation</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📊</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>${summary.calculatedAmount.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Calculated</div>
            <div className={styles.summarySubtext}>ready to pay</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>✅</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>${summary.paidAmount.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Paid</div>
            <div className={styles.summarySubtext}>completed</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | 'all')}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="calculated">Calculated</option>
          <option value="paid">Paid</option>
        </select>

        <select
          className={styles.filterSelect}
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
        >
          <option value="all">All Partners</option>
          {partners.map(partner => (
            <option key={partner.id} value={partner.id}>{partner.name}</option>
          ))}
        </select>

        <div className={styles.actions}>
          {selectedCommissions.size > 0 && (
            <>
              <button
                className={styles.bulkButton}
                onClick={bulkMarkAsPaid}
                disabled={loading}
              >
                Mark {selectedCommissions.size} as Paid
              </button>
              <button
                className={styles.clearButton}
                onClick={() => setSelectedCommissions(new Set())}
              >
                Clear Selection
              </button>
            </>
          )}
          <button className={styles.exportButton} onClick={exportCommissions}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Commissions Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedCommissions.size === filteredCommissions.length && filteredCommissions.length > 0}
                  onChange={selectAll}
                />
              </th>
              <th>Partner</th>
              <th>Job Value</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Created</th>
              <th>Paid Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  No commissions found
                </td>
              </tr>
            ) : (
              filteredCommissions.map(commission => (
                <tr key={commission.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedCommissions.has(commission.id)}
                      onChange={() => toggleCommissionSelection(commission.id)}
                    />
                  </td>
                  <td className={styles.partnerCell}>
                    {getPartnerName(commission.partnerId)}
                  </td>
                  <td className={styles.amountCell}>
                    ${commission.jobValue.toLocaleString()}
                  </td>
                  <td className={styles.rateCell}>
                    {commission.commissionRate ? `${commission.commissionRate}%` : 'N/A'}
                  </td>
                  <td className={styles.commissionCell}>
                    ${commission.commissionAmount.toLocaleString()}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(commission.status)}`}>
                      {commission.status}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(commission.createdAt).toLocaleDateString()}
                  </td>
                  <td className={styles.dateCell}>
                    {commission.paidAt
                      ? new Date(commission.paidAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td>
                    {commission.status !== 'paid' && (
                      <button
                        className={styles.payButton}
                        onClick={() => markAsPaid(commission.id)}
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      {filteredCommissions.filter(c => c.status === 'paid').length > 0 && (
        <div className={styles.paymentHistory}>
          <h3 className={styles.historyTitle}>Recent Payments</h3>
          <div className={styles.timeline}>
            {filteredCommissions
              .filter(c => c.status === 'paid' && c.paidAt)
              .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
              .slice(0, 10)
              .map(commission => (
                <div key={commission.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelinePartner}>
                        {getPartnerName(commission.partnerId)}
                      </span>
                      <span className={styles.timelineAmount}>
                        ${commission.commissionAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.timelineDate}>
                      {new Date(commission.paidAt!).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {commission.paymentReference && (
                      <div className={styles.timelineReference}>
                        Ref: {commission.paymentReference}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
