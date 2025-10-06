'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import styles from './PartnerPortal.module.css';
import type { Partner, Referral, Commission, CreateReferralDto } from './types';

interface PartnerPortalProps {
  partnerId: string;
}

export function PartnerPortal({ partnerId }: PartnerPortalProps) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'submit' | 'referrals' | 'commissions'
  >('submit');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [newReferral, setNewReferral] = useState<
    Omit<CreateReferralDto, 'partnerId'>
  >({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    estimatedValue: undefined,
    notes: '',
  });

  // Fetch partner data
  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Fetch partner details
      const partnerResponse = await fetch(getApiUrl(`/partners/${partnerId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!partnerResponse.ok) {
        throw new Error('Failed to fetch partner details');
      }

      const partnerData = await partnerResponse.json();
      setPartner(partnerData);

      // Fetch partner's referrals
      const referralsResponse = await fetch(
        getApiUrl(`/referrals/partner/${partnerId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (referralsResponse.ok) {
        const referralsData = await referralsResponse.json();
        setReferrals(referralsData);
      }

      // Fetch partner's commissions
      const commissionsResponse = await fetch(
        getApiUrl(`/partner-commissions?partnerId=${partnerId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (commissionsResponse.ok) {
        const commissionsData = await commissionsResponse.json();
        setCommissions(
          commissionsData.filter((c: Commission) => c.partnerId === partnerId),
        );
      }
    } catch (err) {
      console.error('Error fetching partner data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load partner data',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, [partnerId]);

  // Submit new referral
  const handleSubmitReferral = async (e: React.FormEvent) => {
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
        body: JSON.stringify({
          ...newReferral,
          partnerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit referral');
      }

      // Reset form and show success
      setNewReferral({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        estimatedValue: undefined,
        notes: '',
      });
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);

      // Refresh referrals
      fetchPartnerData();
      setActiveTab('referrals');
    } catch (err) {
      console.error('Error submitting referral:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to submit referral',
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate commission summary
  const commissionSummary = {
    total: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
    pending: commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    calculated: commissions
      .filter((c) => c.status === 'calculated')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    paid: commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
  };

  // Calculate referral statistics
  const referralStats = {
    total: referrals.length,
    new: referrals.filter((r) => r.status === 'new').length,
    converted: referrals.filter((r) => r.status === 'converted').length,
    conversionRate:
      referrals.length > 0
        ? (referrals.filter((r) => r.status === 'converted').length /
            referrals.length) *
          100
        : 0,
  };

  if (loading && !partner) {
    return <div className={styles.loading}>Loading portal...</div>;
  }

  if (error && !partner) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h1 className={styles.title}>Partner Portal</h1>
          {partner && (
            <p className={styles.welcomeText}>Welcome back, {partner.name}!</p>
          )}
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{referralStats.total}</div>
            <div className={styles.statLabel}>Total Referrals</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{referralStats.converted}</div>
            <div className={styles.statLabel}>Converted</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📈</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>
              {referralStats.conversionRate.toFixed(1)}%
            </div>
            <div className={styles.statLabel}>Conversion Rate</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>
              ${commissionSummary.total.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Total Commissions</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'submit' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          Submit Referral
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'referrals' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          My Referrals ({referralStats.total})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'commissions' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('commissions')}
        >
          Commissions ({commissions.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Submit Referral Form */}
        {activeTab === 'submit' && (
          <div className={styles.submitSection}>
            <h2 className={styles.sectionTitle}>Submit New Referral</h2>
            <p className={styles.sectionDescription}>
              Fill out the form below to submit a new customer referral. We&apos;ll
              contact them within 24 hours.
            </p>

            {showSuccessMessage && (
              <div className={styles.successMessage}>
                ✅ Referral submitted successfully! We&apos;ll be in touch soon.
              </div>
            )}

            {error && <div className={styles.errorMessage}>{error}</div>}

            <form onSubmit={handleSubmitReferral} className={styles.form}>
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
                  placeholder="John Doe"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address *</label>
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
                  placeholder="john@example.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number *</label>
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
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Estimated Move Value (Optional)
                </label>
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
                  placeholder="5000"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Additional Notes</label>
                <textarea
                  className={styles.textarea}
                  value={newReferral.notes}
                  onChange={(e) =>
                    setNewReferral({ ...newReferral, notes: e.target.value })
                  }
                  rows={4}
                  placeholder="Any special requirements or details about the customer..."
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Referral'}
              </button>
            </form>
          </div>
        )}

        {/* My Referrals */}
        {activeTab === 'referrals' && (
          <div className={styles.referralsSection}>
            <h2 className={styles.sectionTitle}>My Referrals</h2>

            {referrals.length === 0 ? (
              <div className={styles.emptyState}>
                <p>You haven&apos;t submitted any referrals yet.</p>
                <button
                  className={styles.emptyStateButton}
                  onClick={() => setActiveTab('submit')}
                >
                  Submit Your First Referral
                </button>
              </div>
            ) : (
              <div className={styles.referralsList}>
                {referrals.map((referral) => (
                  <div key={referral.id} className={styles.referralCard}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>
                        {referral.customerName}
                      </h3>
                      <span
                        className={`${styles.statusBadge} ${styles[referral.status]}`}
                      >
                        {referral.status}
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span className={styles.infoValue}>
                          {referral.customerEmail}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Phone:</span>
                        <span className={styles.infoValue}>
                          {referral.customerPhone}
                        </span>
                      </div>
                      {referral.estimatedValue && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Est. Value:</span>
                          <span className={styles.infoValue}>
                            ${referral.estimatedValue.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Submitted:</span>
                        <span className={styles.infoValue}>
                          {new Date(referral.dateReferred).toLocaleDateString()}
                        </span>
                      </div>
                      {referral.notes && (
                        <div className={styles.notes}>
                          <strong>Notes:</strong> {referral.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commissions */}
        {activeTab === 'commissions' && (
          <div className={styles.commissionsSection}>
            <h2 className={styles.sectionTitle}>Commission Statement</h2>

            <div className={styles.commissionSummary}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Total Earned</div>
                <div className={styles.summaryValue}>
                  ${commissionSummary.total.toLocaleString()}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Pending</div>
                <div className={styles.summaryValue}>
                  ${commissionSummary.pending.toLocaleString()}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Ready to Pay</div>
                <div className={styles.summaryValue}>
                  ${commissionSummary.calculated.toLocaleString()}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Paid</div>
                <div className={styles.summaryValue}>
                  ${commissionSummary.paid.toLocaleString()}
                </div>
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No commissions yet. Keep referring to earn!</p>
              </div>
            ) : (
              <div className={styles.commissionsTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Job Value</th>
                      <th>Commission</th>
                      <th>Status</th>
                      <th>Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => (
                      <tr key={commission.id}>
                        <td>
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        <td>${commission.jobValue.toLocaleString()}</td>
                        <td className={styles.commissionAmount}>
                          ${commission.commissionAmount.toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${styles[commission.status]}`}
                          >
                            {commission.status}
                          </span>
                        </td>
                        <td>
                          {commission.paidAt
                            ? new Date(commission.paidAt).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
