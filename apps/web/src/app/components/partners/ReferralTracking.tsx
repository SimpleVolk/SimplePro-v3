'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import styles from './ReferralTracking.module.css';
import type {
  Partner,
  Referral,
  CreateReferralDto,
  ReferralStatus,
} from './types';

interface ReferralTrackingProps {
  partners: Partner[];
  onReferralUpdate?: () => void;
}

export function ReferralTracking({
  partners,
  onReferralUpdate,
}: ReferralTrackingProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'all'>(
    'all',
  );
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newReferral, setNewReferral] = useState<CreateReferralDto>({
    partnerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    estimatedValue: undefined,
    assignedSalesRep: '',
    notes: '',
  });

  // Fetch referrals
  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getApiUrl('/referrals'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch referrals: ${response.statusText}`);
      }

      const data = await response.json();
      setReferrals(data);
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  // Filter referrals
  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch =
      referral.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.customerPhone.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' || referral.status === statusFilter;
    const matchesPartner =
      partnerFilter === 'all' || referral.partnerId === partnerFilter;

    return matchesSearch && matchesStatus && matchesPartner;
  });

  // Group referrals by status for pipeline view
  const referralsByStatus: Record<ReferralStatus, Referral[]> = {
    new: filteredReferrals.filter((r) => r.status === 'new'),
    contacted: filteredReferrals.filter((r) => r.status === 'contacted'),
    qualified: filteredReferrals.filter((r) => r.status === 'qualified'),
    converted: filteredReferrals.filter((r) => r.status === 'converted'),
    lost: filteredReferrals.filter((r) => r.status === 'lost'),
  };

  // Calculate conversion metrics
  const metrics = {
    totalReferrals: referrals.length,
    newReferrals: referrals.filter((r) => r.status === 'new').length,
    contactedReferrals: referrals.filter((r) => r.status === 'contacted')
      .length,
    qualifiedReferrals: referrals.filter((r) => r.status === 'qualified')
      .length,
    convertedReferrals: referrals.filter((r) => r.status === 'converted')
      .length,
    conversionRate:
      referrals.length > 0
        ? (referrals.filter((r) => r.status === 'converted').length /
            referrals.length) *
          100
        : 0,
  };

  // Handle create referral
  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getApiUrl('/referrals'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReferral),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create referral');
      }

      // Reset form and refresh
      setNewReferral({
        partnerId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        estimatedValue: undefined,
        assignedSalesRep: '',
        notes: '',
      });
      setShowCreateForm(false);
      fetchReferrals();
      onReferralUpdate?.();
    } catch (err) {
      console.error('Error creating referral:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create referral',
      );
    } finally {
      setLoading(false);
    }
  };

  // Update referral status
  const updateReferralStatus = async (
    referralId: string,
    newStatus: ReferralStatus,
  ) => {
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(
        getApiUrl(`/referrals/${referralId}/status`),
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      fetchReferrals();
      onReferralUpdate?.();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update referral status');
    }
  };

  // Get status badge class
  const getStatusClass = (status: ReferralStatus): string => {
    return styles[status] || '';
  };

  // Get partner name
  const getPartnerName = (partnerId: string): string => {
    const partner = partners.find((p) => p.id === partnerId);
    return partner?.name || 'Unknown Partner';
  };

  // Render referral card
  const renderReferralCard = (referral: Referral) => (
    <div
      key={referral.id}
      className={styles.referralCard}
      onClick={() => setSelectedReferral(referral)}
    >
      <div className={styles.cardHeader}>
        <h4 className={styles.customerName}>{referral.customerName}</h4>
        <span
          className={`${styles.statusBadge} ${getStatusClass(referral.status)}`}
        >
          {referral.status}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Partner:</span>
          <span className={styles.value}>
            {getPartnerName(referral.partnerId)}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Email:</span>
          <span className={styles.value}>{referral.customerEmail}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Phone:</span>
          <span className={styles.value}>{referral.customerPhone}</span>
        </div>

        {referral.estimatedValue && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Est. Value:</span>
            <span className={styles.value}>
              ${referral.estimatedValue.toLocaleString()}
            </span>
          </div>
        )}

        <div className={styles.infoRow}>
          <span className={styles.label}>Referred:</span>
          <span className={styles.value}>
            {new Date(referral.dateReferred).toLocaleDateString()}
          </span>
        </div>
      </div>

      {referral.status !== 'converted' && referral.status !== 'lost' && (
        <div className={styles.cardActions}>
          {referral.status === 'new' && (
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                updateReferralStatus(referral.id, 'contacted');
              }}
            >
              Mark Contacted
            </button>
          )}
          {referral.status === 'contacted' && (
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                updateReferralStatus(referral.id, 'qualified');
              }}
            >
              Mark Qualified
            </button>
          )}
          {referral.status === 'qualified' && (
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                updateReferralStatus(referral.id, 'converted');
              }}
            >
              Convert to Job
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Metrics Overview */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{metrics.totalReferrals}</div>
          <div className={styles.metricLabel}>Total Referrals</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{metrics.newReferrals}</div>
          <div className={styles.metricLabel}>New</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{metrics.qualifiedReferrals}</div>
          <div className={styles.metricLabel}>Qualified</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{metrics.convertedReferrals}</div>
          <div className={styles.metricLabel}>Converted</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>
            {metrics.conversionRate.toFixed(1)}%
          </div>
          <div className={styles.metricLabel}>Conversion Rate</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
        >
          + New Referral
        </button>

        <input
          type="text"
          placeholder="Search referrals..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ReferralStatus | 'all')
          }
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>

        <select
          className={styles.filterSelect}
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
        >
          <option value="all">All Partners</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Pipeline View */}
      <div className={styles.pipeline}>
        {(
          [
            'new',
            'contacted',
            'qualified',
            'converted',
            'lost',
          ] as ReferralStatus[]
        ).map((status) => (
          <div key={status} className={styles.pipelineColumn}>
            <div className={styles.columnHeader}>
              <h3 className={styles.columnTitle}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </h3>
              <span className={styles.columnCount}>
                {referralsByStatus[status].length}
              </span>
            </div>
            <div className={styles.columnCards}>
              {referralsByStatus[status].map(renderReferralCard)}
              {referralsByStatus[status].length === 0 && (
                <div className={styles.emptyColumn}>No referrals</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Referral Form */}
      {showCreateForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Referral</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Partner *</label>
                <select
                  className={styles.input}
                  value={newReferral.partnerId}
                  onChange={(e) =>
                    setNewReferral({
                      ...newReferral,
                      partnerId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select partner...</option>
                  {partners
                    .filter((p) => p.status === 'active')
                    .map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Customer Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newReferral.customerName}
                  onChange={(e) =>
                    setNewReferral({
                      ...newReferral,
                      customerName: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email *</label>
                <input
                  type="email"
                  className={styles.input}
                  value={newReferral.customerEmail}
                  onChange={(e) =>
                    setNewReferral({
                      ...newReferral,
                      customerEmail: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Phone *</label>
                <input
                  type="tel"
                  className={styles.input}
                  value={newReferral.customerPhone}
                  onChange={(e) =>
                    setNewReferral({
                      ...newReferral,
                      customerPhone: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Estimated Value</label>
                <input
                  type="number"
                  className={styles.input}
                  value={newReferral.estimatedValue || ''}
                  onChange={(e) =>
                    setNewReferral({
                      ...newReferral,
                      estimatedValue: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  min="0"
                  step="100"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Assigned Sales Rep</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newReferral.assignedSalesRep}
                  onChange={(e) =>
                    setNewReferral({
                      ...newReferral,
                      assignedSalesRep: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Notes</label>
                <textarea
                  className={styles.textarea}
                  value={newReferral.notes}
                  onChange={(e) =>
                    setNewReferral({ ...newReferral, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Referral Details Modal */}
      {selectedReferral && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedReferral(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Referral Details</h2>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedReferral(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.detailsContent}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Customer:</span>
                <span className={styles.detailValue}>
                  {selectedReferral.customerName}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email:</span>
                <span className={styles.detailValue}>
                  {selectedReferral.customerEmail}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Phone:</span>
                <span className={styles.detailValue}>
                  {selectedReferral.customerPhone}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Partner:</span>
                <span className={styles.detailValue}>
                  {getPartnerName(selectedReferral.partnerId)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span
                  className={`${styles.statusBadge} ${getStatusClass(selectedReferral.status)}`}
                >
                  {selectedReferral.status}
                </span>
              </div>
              {selectedReferral.estimatedValue && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Estimated Value:</span>
                  <span className={styles.detailValue}>
                    ${selectedReferral.estimatedValue.toLocaleString()}
                  </span>
                </div>
              )}
              {selectedReferral.assignedSalesRep && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Sales Rep:</span>
                  <span className={styles.detailValue}>
                    {selectedReferral.assignedSalesRep}
                  </span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date Referred:</span>
                <span className={styles.detailValue}>
                  {new Date(selectedReferral.dateReferred).toLocaleDateString()}
                </span>
              </div>
              {selectedReferral.notes && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Notes:</span>
                  <span className={styles.detailValue}>
                    {selectedReferral.notes}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
