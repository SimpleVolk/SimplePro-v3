'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../../lib/config';
import styles from './SalesSection.module.css';

interface SalesPerformer {
  id: string;
  name: string;
  role: string;
  sales: number;
  revenue: number;
  conversion: number;
  avatar?: string;
}

interface ReferralSource {
  id: string;
  name: string;
  leads: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

interface SalesData {
  topPerformers: SalesPerformer[];
  referralSources: ReferralSource[];
}

export const SalesSection = memo(function SalesSection() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesData>({
    topPerformers: [],
    referralSources: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'performers' | 'referrals'>(
    'performers',
  );

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token || !user) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(getApiUrl('analytics/sales-performance'), {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      } else {
        // Fallback data for development
        const fallbackData: SalesData = {
          topPerformers: [
            {
              id: '1',
              name: 'Sarah Johnson',
              role: 'Sales Manager',
              sales: 12,
              revenue: 18500,
              conversion: 85,
            },
            {
              id: '2',
              name: 'Mike Chen',
              role: 'Sales Rep',
              sales: 8,
              revenue: 12200,
              conversion: 72,
            },
            {
              id: '3',
              name: 'Lisa Rodriguez',
              role: 'Sales Rep',
              sales: 6,
              revenue: 9800,
              conversion: 68,
            },
          ],
          referralSources: [
            {
              id: '1',
              name: 'Google Ads',
              leads: 25,
              conversions: 8,
              revenue: 12400,
              conversionRate: 32,
            },
            {
              id: '2',
              name: 'Referrals',
              leads: 18,
              conversions: 12,
              revenue: 18600,
              conversionRate: 67,
            },
            {
              id: '3',
              name: 'Website',
              leads: 15,
              conversions: 4,
              revenue: 6200,
              conversionRate: 27,
            },
            {
              id: '4',
              name: 'Yelp',
              leads: 12,
              conversions: 3,
              revenue: 4800,
              conversionRate: 25,
            },
          ],
        };
        setSalesData(fallbackData);
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
      // Set empty fallback data
      setSalesData({
        topPerformers: [],
        referralSources: [],
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSalesData();

    // Refresh every 10 minutes
    const interval = setInterval(fetchSalesData, 600000);
    return () => clearInterval(interval);
  }, [fetchSalesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const getPerformanceColor = (conversion: number) => {
    if (conversion >= 80) return '#4caf50';
    if (conversion >= 60) return '#ff9800';
    return '#f44336';
  };

  return (
    <div className={styles.salesSection}>
      <div className={styles.sectionHeader}>
        <h3>Sales Performance</h3>
        <div className={styles.viewToggle}>
          <button
            onClick={() => setActiveView('performers')}
            className={`${styles.toggleButton} ${activeView === 'performers' ? styles.active : ''}`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveView('referrals')}
            className={`${styles.toggleButton} ${activeView === 'referrals' ? styles.active : ''}`}
          >
            Sources
          </button>
        </div>
      </div>

      <div className={styles.sectionContent}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading sales data...</p>
          </div>
        ) : (
          <>
            {activeView === 'performers' && (
              <div className={styles.performersView}>
                <h4>Sales Leaders This Month</h4>
                <div className={styles.performersList}>
                  {salesData.topPerformers.length > 0 ? (
                    salesData.topPerformers.map((performer, index) => (
                      <div key={performer.id} className={styles.performerCard}>
                        <div className={styles.performerRank}>#{index + 1}</div>

                        <div className={styles.performerAvatar}>
                          {performer.avatar ? (
                            <img src={performer.avatar} alt={performer.name} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {getInitials(performer.name)}
                            </div>
                          )}
                        </div>

                        <div className={styles.performerInfo}>
                          <div className={styles.performerName}>
                            {performer.name}
                          </div>
                          <div className={styles.performerRole}>
                            {performer.role}
                          </div>
                        </div>

                        <div className={styles.performerMetrics}>
                          <div className={styles.metric}>
                            <span className={styles.metricValue}>
                              {performer.sales}
                            </span>
                            <span className={styles.metricLabel}>Sales</span>
                          </div>
                          <div className={styles.metric}>
                            <span className={styles.metricValue}>
                              {formatCurrency(performer.revenue)}
                            </span>
                            <span className={styles.metricLabel}>Revenue</span>
                          </div>
                          <div className={styles.metric}>
                            <span
                              className={styles.metricValue}
                              style={{
                                color: getPerformanceColor(
                                  performer.conversion,
                                ),
                              }}
                            >
                              {performer.conversion}%
                            </span>
                            <span className={styles.metricLabel}>Rate</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>👥</span>
                      <p>No sales data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'referrals' && (
              <div className={styles.referralsView}>
                <h4>Top Referral Sources This Month</h4>
                <div className={styles.referralsList}>
                  {salesData.referralSources.length > 0 ? (
                    salesData.referralSources.map((source) => (
                      <div key={source.id} className={styles.referralCard}>
                        <div className={styles.referralHeader}>
                          <div className={styles.referralName}>
                            {source.name}
                          </div>
                          <div className={styles.referralRevenue}>
                            {formatCurrency(source.revenue)}
                          </div>
                        </div>

                        <div className={styles.referralMetrics}>
                          <div className={styles.referralStat}>
                            <span className={styles.statLabel}>Leads:</span>
                            <span className={styles.statValue}>
                              {source.leads}
                            </span>
                          </div>
                          <div className={styles.referralStat}>
                            <span className={styles.statLabel}>
                              Conversions:
                            </span>
                            <span className={styles.statValue}>
                              {source.conversions}
                            </span>
                          </div>
                          <div className={styles.referralStat}>
                            <span className={styles.statLabel}>Rate:</span>
                            <span
                              className={styles.statValue}
                              style={{
                                color: getPerformanceColor(
                                  source.conversionRate,
                                ),
                              }}
                            >
                              {source.conversionRate}%
                            </span>
                          </div>
                        </div>

                        <div className={styles.conversionBar}>
                          <div
                            className={styles.conversionProgress}
                            style={{
                              width: `${source.conversionRate}%`,
                              backgroundColor: getPerformanceColor(
                                source.conversionRate,
                              ),
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📊</span>
                      <p>No referral data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
