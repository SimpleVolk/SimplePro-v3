'use client';

import { useState, useEffect, memo, useCallback, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { getApiUrl } from '../../lib/config';
import { KPICard } from './KPICard';
import { ActivitySection } from './ActivitySection';
import { OpenItemsSection } from './OpenItemsSection';
import { SalesSection } from './SalesSection';
import { LoadingSkeleton } from './LoadingSkeleton';
import styles from './DashboardOverview.module.css';

interface DashboardKPIs {
  totalMoves: number;
  totalRevenue: number;
  jobsToday: number;
  movesNotBooked: number;
  notBookedRevenue: number;
  averageMoveValue: number;
  conversionRate: number;
  activeJobs: number;
}

export const DashboardOverview = memo(function DashboardOverview() {
  const { user } = useAuth();
  const { isConnected, subscribeToAnalytics, unsubscribeFromAnalytics } =
    useWebSocket();
  const [kpiData, setKpiData] = useState<DashboardKPIs>({
    totalMoves: 0,
    totalRevenue: 0,
    jobsToday: 0,
    movesNotBooked: 0,
    notBookedRevenue: 0,
    averageMoveValue: 0,
    conversionRate: 0,
    activeJobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      if (!token || !user) {
        throw new Error('Authentication required');
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch dashboard KPIs
      const response = await fetch(getApiUrl('analytics/dashboard'), {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }

      const data = await response.json();

      // Transform the data to match our KPI structure
      const kpis: DashboardKPIs = {
        totalMoves: data.totalJobs || 0,
        totalRevenue: data.totalRevenue || 0,
        jobsToday: data.completedJobsToday || 0,
        movesNotBooked: Math.max(
          0,
          (data.activeJobs || 0) - (data.completedJobsToday || 0),
        ),
        notBookedRevenue: data.totalRevenue * 0.3 || 0, // Estimate pending revenue
        averageMoveValue: data.averageJobValue || 0,
        conversionRate: data.onTimePerformance || 85,
        activeJobs: data.activeJobs || 0,
      };

      setKpiData(kpis);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data',
      );

      // Set fallback data for development
      setKpiData({
        totalMoves: 5,
        totalRevenue: 3193,
        jobsToday: 0,
        movesNotBooked: 3,
        notBookedRevenue: 2368,
        averageMoveValue: 695,
        conversionRate: 82,
        activeJobs: 2,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchDashboardData();

      // Subscribe to real-time updates
      if (isConnected) {
        subscribeToAnalytics('dashboard');
      }
    }

    return () => {
      if (isConnected) {
        unsubscribeFromAnalytics('dashboard');
      }
    };
  }, [
    user,
    isConnected,
    fetchDashboardData,
    subscribeToAnalytics,
    unsubscribeFromAnalytics,
  ]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && !loading) {
        fetchDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, loading, fetchDashboardData]);

  // Listen for WebSocket updates
  useEffect(() => {
    const handleDashboardUpdate = (event: CustomEvent) => {
      const { dashboardType, data } = event.detail;
      if (dashboardType === 'dashboard' && data) {
        setKpiData((prevData) => ({ ...prevData, ...data }));
        setLastUpdated(new Date());
      }
    };

    window.addEventListener(
      'analyticsUpdate',
      handleDashboardUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        'analyticsUpdate',
        handleDashboardUpdate as EventListener,
      );
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTrend = (current: number, baseline = 100) => {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
  };

  // Handle KPI card clicks for navigation
  const handleKPIClick = (type: string) => {
    // Future: Navigate to specific views based on KPI type
    // Placeholder for navigation logic
  };

  return (
    <div className={styles.dashboardOverview}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h2>Business Dashboard</h2>
          <p>Real-time insights and key performance metrics</p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.connectionStatus}>
            <div
              className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}
            />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            onClick={fetchDashboardData}
            className={styles.refreshButton}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorMessage}>{error}</span>
          <button onClick={fetchDashboardData} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className={styles.kpiGrid}>
        <KPICard
          title="Moves"
          value={kpiData.totalMoves}
          subValue={formatCurrency(kpiData.totalRevenue)}
          change={calculateTrend(kpiData.totalMoves, 4)}
          trend={
            kpiData.totalMoves > 4
              ? 'up'
              : kpiData.totalMoves < 4
                ? 'down'
                : 'neutral'
          }
          icon="✅"
          color="success"
          onClick={() => handleKPIClick('moves')}
          loading={loading}
        />

        <KPICard
          title="Jobs Today"
          value={kpiData.jobsToday}
          change={calculateTrend(kpiData.jobsToday, 1)}
          trend={kpiData.jobsToday > 1 ? 'up' : 'neutral'}
          icon="📋"
          color="info"
          onClick={() => handleKPIClick('jobs-today')}
          loading={loading}
        />

        <KPICard
          title="Moves Not Booked"
          value={kpiData.movesNotBooked}
          subValue={formatCurrency(kpiData.notBookedRevenue)}
          change={calculateTrend(kpiData.movesNotBooked, 2)}
          trend={kpiData.movesNotBooked > 2 ? 'down' : 'up'}
          icon="📅"
          color="warning"
          onClick={() => handleKPIClick('not-booked')}
          loading={loading}
        />

        <KPICard
          title="Avg. Move Value"
          value={formatCurrency(kpiData.averageMoveValue)}
          change={calculateTrend(kpiData.averageMoveValue, 650)}
          trend={
            kpiData.averageMoveValue > 650
              ? 'up'
              : kpiData.averageMoveValue < 650
                ? 'down'
                : 'neutral'
          }
          icon="📈"
          color="success"
          onClick={() => handleKPIClick('avg-value')}
          loading={loading}
        />
      </div>

      {/* Main Dashboard Content */}
      <div className={styles.dashboardContent}>
        {/* Left Column - Activity */}
        <div className={styles.leftColumn}>
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <ActivitySection />
          </Suspense>
        </div>

        {/* Middle Column - Open Items */}
        <div className={styles.middleColumn}>
          <Suspense fallback={<LoadingSkeleton type="cards" rows={4} />}>
            <OpenItemsSection />
          </Suspense>
        </div>

        {/* Right Column - Sales Performance */}
        <div className={styles.rightColumn}>
          <Suspense fallback={<LoadingSkeleton type="table" rows={3} />}>
            <SalesSection />
          </Suspense>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.dashboardFooter}>
        <div className={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>

        <div className={styles.dashboardStats}>
          <span>Active Jobs: {kpiData.activeJobs}</span>
          <span>•</span>
          <span>Conversion Rate: {kpiData.conversionRate}%</span>
        </div>
      </div>
    </div>
  );
});
