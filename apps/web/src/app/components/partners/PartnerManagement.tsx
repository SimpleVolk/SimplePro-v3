'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
import styles from './PartnerManagement.module.css';
import { PartnerForm } from './PartnerForm';
import { ReferralTracking } from './ReferralTracking';
import { CommissionManagement } from './CommissionManagement';
import type { Partner, PartnerDashboardStats, PartnerType, PartnerStatus } from './types';

type TabType = 'partners' | 'referrals' | 'commissions';

export function PartnerManagement() {
  const { user: _user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('partners');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PartnerType | 'all'>('all');
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);

  // Fetch partners
  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getApiUrl('/partners'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch partners: ${response.statusText}`);
      }

      const data = await response.json();
      setPartners(data);

      // Calculate dashboard stats
      calculateStats(data);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const calculateStats = (partnersData: Partner[]) => {
    const activePartners = partnersData.filter(p => p.status === 'active');
    const totalReferrals = partnersData.reduce((sum, p) => sum + (p.totalReferrals || 0), 0);
    const convertedReferrals = partnersData.reduce((sum, p) => sum + (p.convertedReferrals || 0), 0);
    const pendingCommissions = partnersData.reduce((sum, p) => sum + (p.pendingCommission || 0), 0);
    const totalRevenue = partnersData.reduce((sum, p) => sum + (p.totalCommission || 0), 0);

    setStats({
      totalPartners: partnersData.length,
      activePartners: activePartners.length,
      totalReferrals,
      activeReferrals: totalReferrals - convertedReferrals,
      conversionRate: totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0,
      pendingCommissions,
      totalRevenue,
      monthOverMonthGrowth: 0, // TODO: Calculate from historical data
    });
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Filter partners
  const filteredPartners = partners.filter(partner => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partner.company && partner.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    const matchesType = typeFilter === 'all' || partner.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle partner status toggle
  const handleToggleStatus = async (partnerId: string, currentStatus: PartnerStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      const response = await fetch(getApiUrl(`/partners/${partnerId}/status`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update partner status');
      }

      // Refresh partners list
      fetchPartners();
    } catch (err) {
      console.error('Error updating partner status:', err);
      setError('Failed to update partner status');
    }
  };

  // Get partner type icon
  const getTypeIcon = (type: PartnerType): string => {
    const icons = {
      real_estate: '🏢',
      relocation: '✈️',
      corporate: '🏭',
      individual: '👤',
    };
    return icons[type] || '🤝';
  };

  // Get commission structure display
  const getCommissionDisplay = (partner: Partner): string => {
    const { commissionStructure } = partner;
    if (commissionStructure.type === 'percentage' && commissionStructure.value) {
      return `💵 ${commissionStructure.value}%`;
    }
    if (commissionStructure.type === 'flat_rate' && commissionStructure.value) {
      return `💰 $${commissionStructure.value}`;
    }
    if (commissionStructure.type === 'tiered') {
      return '📊 Tiered';
    }
    return 'N/A';
  };

  // Handle form submit
  const handleFormSubmit = () => {
    setShowCreateForm(false);
    setEditingPartner(null);
    fetchPartners();
  };

  // Render statistics overview
  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className={styles.statsOverview}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.activePartners}</div>
            <div className={styles.statLabel}>Active Partners</div>
            <div className={styles.statSubtext}>of {stats.totalPartners} total</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.activeReferrals}</div>
            <div className={styles.statLabel}>Active Referrals</div>
            <div className={styles.statSubtext}>of {stats.totalReferrals} total</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>${stats.pendingCommissions.toLocaleString()}</div>
            <div className={styles.statLabel}>Pending Commissions</div>
            <div className={styles.statSubtext}>awaiting payment</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📈</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.conversionRate.toFixed(1)}%</div>
            <div className={styles.statLabel}>Conversion Rate</div>
            <div className={styles.statSubtext}>${stats.totalRevenue.toLocaleString()} revenue</div>
          </div>
        </div>
      </div>
    );
  };

  // Render partners list
  const renderPartnersList = () => {
    if (loading) {
      return <div className={styles.loading}>Loading partners...</div>;
    }

    if (error) {
      return <div className={styles.error}>{error}</div>;
    }

    if (filteredPartners.length === 0) {
      return <div className={styles.emptyState}>No partners found</div>;
    }

    return (
      <div className={styles.partnerGrid}>
        {filteredPartners.map(partner => (
          <div key={partner.id} className={styles.partnerCard}>
            <div className={styles.partnerHeader}>
              <div className={styles.partnerInfo}>
                <div className={styles.partnerType}>{getTypeIcon(partner.type)}</div>
                <div>
                  <h3 className={styles.partnerName}>{partner.name}</h3>
                  {partner.company && (
                    <div className={styles.partnerCompany}>{partner.company}</div>
                  )}
                </div>
              </div>
              <div className={styles.partnerActions}>
                <span className={`${styles.statusBadge} ${styles[partner.status]}`}>
                  {partner.status}
                </span>
              </div>
            </div>

            <div className={styles.partnerContact}>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Email:</span>
                <span className={styles.contactValue}>{partner.email}</span>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Phone:</span>
                <span className={styles.contactValue}>{partner.phone}</span>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Commission:</span>
                <span className={styles.contactValue}>{getCommissionDisplay(partner)}</span>
              </div>
            </div>

            <div className={styles.partnerStats}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{partner.totalReferrals || 0}</div>
                <div className={styles.statText}>Referrals</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>
                  {partner.conversionRate ? `${partner.conversionRate.toFixed(1)}%` : 'N/A'}
                </div>
                <div className={styles.statText}>Conversion</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>
                  ${(partner.totalCommission || 0).toLocaleString()}
                </div>
                <div className={styles.statText}>Commission</div>
              </div>
            </div>

            <div className={styles.partnerFooter}>
              <button
                className={styles.editButton}
                onClick={() => setEditingPartner(partner)}
              >
                Edit
              </button>
              <button
                className={styles.statusButton}
                onClick={() => handleToggleStatus(partner.id, partner.status)}
              >
                {partner.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Partner Management</h1>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
        >
          + New Partner
        </button>
      </div>

      {renderStats()}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'partners' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('partners')}
        >
          Partners
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'referrals' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          Referrals
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'commissions' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('commissions')}
        >
          Commissions
        </button>
      </div>

      {activeTab === 'partners' && (
        <>
          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Search partners..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PartnerStatus | 'all')}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PartnerType | 'all')}
            >
              <option value="all">All Types</option>
              <option value="real_estate">Real Estate</option>
              <option value="relocation">Relocation</option>
              <option value="corporate">Corporate</option>
              <option value="individual">Individual</option>
            </select>
          </div>

          {renderPartnersList()}
        </>
      )}

      {activeTab === 'referrals' && (
        <ReferralTracking partners={partners} onReferralUpdate={fetchPartners} />
      )}

      {activeTab === 'commissions' && (
        <CommissionManagement partners={partners} />
      )}

      {(showCreateForm || editingPartner) && (
        <PartnerForm
          partner={editingPartner}
          onClose={() => {
            setShowCreateForm(false);
            setEditingPartner(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
