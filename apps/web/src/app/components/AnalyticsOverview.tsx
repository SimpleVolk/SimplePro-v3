'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getApiUrl } from '@/lib/config';
import styles from './AnalyticsOverview.module.css';

interface DashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobsToday: number;
  totalRevenue: number;
  revenueToday: number;
  averageJobValue: number;
  crewUtilization: number;
  customerSatisfaction: number;
  onTimePerformance: number;
  topServices: Array<{ service: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; jobs: number }>;
  performanceMetrics: {
    averageJobDuration: number;
    averageCrewEfficiency: number;
    jobCompletionRate: number;
  };
}

interface BusinessMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageJobValue: number;
  revenueGrowthRate: number;
  jobCompletionRate: number;
  averageJobDuration: number;
  crewUtilization: number;
  onTimeDeliveryRate: number;
  customerSatisfactionScore: number;
  customerRetentionRate: number;
  newCustomerAcquisitionRate: number;
  churnRate: number;
  estimateAccuracy: number;
  crewProductivity: number;
  equipmentUtilization: number;
  costPerJob: number;
}


export function AnalyticsOverview() {
  const { user } = useAuth();
  const { isConnected, subscribeToAnalytics, unsubscribeFromAnalytics, lastUpdate } = useWebSocket();
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'business' | 'revenue' | 'performance'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();

      // Subscribe to analytics updates when component mounts
      if (isConnected) {
        subscribeToAnalytics(activeTab);
      }
    }

    return () => {
      // Cleanup: unsubscribe from analytics updates
      if (isConnected) {
        unsubscribeFromAnalytics(activeTab);
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user, isConnected]);

  // Handle tab changes and re-subscribe to specific dashboard type
  useEffect(() => {
    if (isConnected && user) {
      // Unsubscribe from previous tab
      const previousTabs = ['overview', 'business', 'revenue', 'performance'].filter(tab => tab !== activeTab);
      previousTabs.forEach(tab => unsubscribeFromAnalytics(tab));

      // Subscribe to new active tab
      subscribeToAnalytics(activeTab);
    }
  }, [activeTab, isConnected]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefresh && user) {
      const interval = setInterval(() => {
        fetchAnalyticsData();
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);

      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    // Explicit return for other cases
    return undefined;
  }, [autoRefresh, user]);

  // Listen for WebSocket analytics updates
  useEffect(() => {
    const handleAnalyticsUpdate = (event: CustomEvent) => {
      const { dashboardType, data } = event.detail;
      console.log('Real-time analytics update:', dashboardType, data);

      // Update appropriate state based on dashboard type
      if (dashboardType === activeTab) {
        if (dashboardType === 'business') {
          setBusinessMetrics(data);
        } else {
          setDashboardMetrics(data);
        }
      }
    };

    const handleMetricsUpdate = (event: CustomEvent) => {
      const { metrics } = event.detail;
      console.log('Real-time metrics update:', metrics);

      // Refresh data when metrics are updated
      fetchAnalyticsData();
    };

    // Add event listeners for WebSocket events
    window.addEventListener('analyticsUpdate', handleAnalyticsUpdate as EventListener);
    window.addEventListener('metricsUpdate', handleMetricsUpdate as EventListener);

    return () => {
      window.removeEventListener('analyticsUpdate', handleAnalyticsUpdate as EventListener);
      window.removeEventListener('metricsUpdate', handleMetricsUpdate as EventListener);
    };
  }, [activeTab]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch dashboard metrics
      const dashboardResponse = await fetch(getApiUrl('analytics/dashboard'), { headers });
      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      const dashboardData = await dashboardResponse.json();
      setDashboardMetrics(dashboardData);

      // Fetch business metrics
      const businessResponse = await fetch(getApiUrl('analytics/business-metrics'), { headers });
      if (!businessResponse.ok) {
        throw new Error('Failed to fetch business metrics');
      }
      const businessData = await businessResponse.json();
      setBusinessMetrics(businessData);

    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h3>Error Loading Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchAnalyticsData} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.analyticsOverview}>
      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`${styles.tab} ${activeTab === 'business' ? styles.tabActive : ''}`}
        >
          Business Metrics
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`${styles.tab} ${activeTab === 'revenue' ? styles.tabActive : ''}`}
        >
          Revenue
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`${styles.tab} ${activeTab === 'performance' ? styles.tabActive : ''}`}
        >
          Performance
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardMetrics && (
        <div className={styles.tabContent}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Total Jobs</h3>
              <div className={styles.metricValue}>{dashboardMetrics.totalJobs}</div>
              <div className={styles.metricSubtext}>All time</div>
            </div>

            <div className={styles.metricCard}>
              <h3>Active Jobs</h3>
              <div className={styles.metricValue}>{dashboardMetrics.activeJobs}</div>
              <div className={styles.metricSubtext}>Currently in progress</div>
            </div>

            <div className={styles.metricCard}>
              <h3>Completed Today</h3>
              <div className={styles.metricValue}>{dashboardMetrics.completedJobsToday}</div>
              <div className={styles.metricSubtext}>Jobs finished today</div>
            </div>

            <div className={styles.metricCard}>
              <h3>Total Revenue</h3>
              <div className={styles.metricValue}>{formatCurrency(dashboardMetrics.totalRevenue)}</div>
              <div className={styles.metricSubtext}>All time</div>
            </div>

            <div className={styles.metricCard}>
              <h3>Today's Revenue</h3>
              <div className={styles.metricValue}>{formatCurrency(dashboardMetrics.revenueToday)}</div>
              <div className={styles.metricSubtext}>Revenue generated today</div>
            </div>

            <div className={styles.metricCard}>
              <h3>Average Job Value</h3>
              <div className={styles.metricValue}>{formatCurrency(dashboardMetrics.averageJobValue)}</div>
              <div className={styles.metricSubtext}>Per job</div>
            </div>
          </div>

          <div className={styles.chartSection}>
            <div className={styles.chartCard}>
              <h3>Top Services</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardMetrics.topServices}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => {
                        const { service, percent } = props;
                        return `${service} ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {dashboardMetrics.topServices.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0070f3', '#00d9ff', '#ff6b6b', '#4ecdc4', '#45b7d1'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3>Performance Indicators</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'Crew Utilization', value: dashboardMetrics.crewUtilization },
                      { name: 'Customer Satisfaction', value: dashboardMetrics.customerSatisfaction * 20 },
                      { name: 'On-Time Performance', value: dashboardMetrics.onTimePerformance },
                      { name: 'Job Completion', value: dashboardMetrics.performanceMetrics.jobCompletionRate }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'Customer Satisfaction') {
                          return [(Number(value) / 20).toFixed(1) + '/5.0', name];
                        }
                        return [formatPercentage(Number(value)), name];
                      }}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
                    />
                    <Bar dataKey="value" fill="#0070f3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Metrics Tab */}
      {activeTab === 'business' && businessMetrics && (
        <div className={styles.tabContent}>
          <div className={styles.businessMetricsGrid}>
            <div className={styles.metricSection}>
              <h3>Revenue Metrics</h3>
              <div className={styles.metricsList}>
                <div className={styles.metricRow}>
                  <span>Total Revenue</span>
                  <span>{formatCurrency(businessMetrics.totalRevenue)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Monthly Recurring Revenue</span>
                  <span>{formatCurrency(businessMetrics.monthlyRecurringRevenue)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Average Job Value</span>
                  <span>{formatCurrency(businessMetrics.averageJobValue)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Revenue Growth Rate</span>
                  <span>{formatPercentage(businessMetrics.revenueGrowthRate)}</span>
                </div>
              </div>
            </div>

            <div className={styles.metricSection}>
              <h3>Operational Metrics</h3>
              <div className={styles.metricsList}>
                <div className={styles.metricRow}>
                  <span>Job Completion Rate</span>
                  <span>{formatPercentage(businessMetrics.jobCompletionRate)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Average Job Duration</span>
                  <span>{businessMetrics.averageJobDuration.toFixed(1)} hours</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Crew Utilization</span>
                  <span>{formatPercentage(businessMetrics.crewUtilization)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>On-Time Delivery Rate</span>
                  <span>{formatPercentage(businessMetrics.onTimeDeliveryRate)}</span>
                </div>
              </div>
            </div>

            <div className={styles.metricSection}>
              <h3>Customer Metrics</h3>
              <div className={styles.metricsList}>
                <div className={styles.metricRow}>
                  <span>Customer Satisfaction Score</span>
                  <span>{businessMetrics.customerSatisfactionScore.toFixed(1)}/5.0</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Customer Retention Rate</span>
                  <span>{formatPercentage(businessMetrics.customerRetentionRate)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>New Customer Acquisition Rate</span>
                  <span>{formatPercentage(businessMetrics.newCustomerAcquisitionRate)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Churn Rate</span>
                  <span>{formatPercentage(businessMetrics.churnRate)}</span>
                </div>
              </div>
            </div>

            <div className={styles.metricSection}>
              <h3>Efficiency Metrics</h3>
              <div className={styles.metricsList}>
                <div className={styles.metricRow}>
                  <span>Estimate Accuracy</span>
                  <span>{formatPercentage(businessMetrics.estimateAccuracy)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Crew Productivity</span>
                  <span>{formatPercentage(businessMetrics.crewProductivity)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Equipment Utilization</span>
                  <span>{formatPercentage(businessMetrics.equipmentUtilization)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Cost Per Job</span>
                  <span>{formatCurrency(businessMetrics.costPerJob)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && dashboardMetrics && (
        <div className={styles.tabContent}>
          <div className={styles.revenueGrid}>
            <div className={styles.chartCard}>
              <h3>Monthly Revenue Trend</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={dashboardMetrics.revenueByMonth}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="month" stroke="#888" />
                    <YAxis stroke="#888" tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue'];
                        if (name === 'jobs') return [value + ' jobs', 'Jobs'];
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#0070f3"
                      fill="#0070f3"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3>Jobs vs Revenue</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={dashboardMetrics.revenueByMonth}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="month" stroke="#888" />
                    <YAxis yAxisId="left" stroke="#888" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue'];
                        if (name === 'jobs') return [value + ' jobs', 'Jobs Completed'];
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0070f3"
                      strokeWidth={3}
                      dot={{ fill: '#0070f3' }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="jobs"
                      stroke="#00d9ff"
                      strokeWidth={3}
                      dot={{ fill: '#00d9ff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && dashboardMetrics && (
        <div className={styles.tabContent}>
          <div className={styles.performanceGrid}>
            <div className={styles.chartCard}>
              <h3>Performance Metrics Overview</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={[
                      {
                        name: 'Job Performance',
                        'Completion Rate': dashboardMetrics.performanceMetrics.jobCompletionRate,
                        'On-Time Performance': dashboardMetrics.onTimePerformance,
                        'Average Duration': (dashboardMetrics.performanceMetrics.averageJobDuration / 8) * 100
                      },
                      {
                        name: 'Crew Performance',
                        'Crew Efficiency': dashboardMetrics.performanceMetrics.averageCrewEfficiency,
                        'Utilization Rate': dashboardMetrics.crewUtilization,
                        'Customer Satisfaction': dashboardMetrics.customerSatisfaction * 20
                      }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'Customer Satisfaction') {
                          return [(Number(value) / 20).toFixed(1) + '/5.0', name];
                        }
                        if (name === 'Average Duration') {
                          return [(Number(value) / 100 * 8).toFixed(1) + ' hrs', name];
                        }
                        return [formatPercentage(Number(value)), name];
                      }}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
                    />
                    <Legend />
                    <Bar dataKey="Completion Rate" fill="#0070f3" />
                    <Bar dataKey="On-Time Performance" fill="#00d9ff" />
                    <Bar dataKey="Crew Efficiency" fill="#4ecdc4" />
                    <Bar dataKey="Utilization Rate" fill="#45b7d1" />
                    <Bar dataKey="Customer Satisfaction" fill="#ff6b6b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3>Performance Trends</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={[
                      { period: 'Week 1', performance: 85, satisfaction: 4.2, efficiency: 78 },
                      { period: 'Week 2', performance: 88, satisfaction: 4.3, efficiency: 82 },
                      { period: 'Week 3', performance: 92, satisfaction: 4.5, efficiency: 85 },
                      { period: 'Week 4', performance: dashboardMetrics.onTimePerformance, satisfaction: dashboardMetrics.customerSatisfaction, efficiency: dashboardMetrics.performanceMetrics.averageCrewEfficiency }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="period" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'satisfaction') return [Number(value).toFixed(1) + '/5.0', 'Customer Satisfaction'];
                        return [formatPercentage(Number(value)), name];
                      }}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="performance" stroke="#0070f3" strokeWidth={2} name="On-Time Performance" />
                    <Line type="monotone" dataKey="efficiency" stroke="#00d9ff" strokeWidth={2} name="Crew Efficiency" />
                    <Line type="monotone" dataKey="satisfaction" stroke="#ff6b6b" strokeWidth={2} name="Customer Satisfaction" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Controls */}
      <div className={styles.refreshSection}>
        <div className={styles.refreshControls}>
          <div className={styles.connectionStatus}>
            <div className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}></div>
            <span className={styles.statusText}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          <label className={styles.autoRefreshToggle}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          <button onClick={fetchAnalyticsData} className={styles.refreshButton}>
            Refresh Data
          </button>
        </div>

        <span className={styles.lastUpdated}>
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}