'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './SalesPerformance.module.css';

interface Performer {
  userId: string;
  name: string;
  winRate: number;
  totalRevenue: number;
  quotes: number;
  jobs: number;
}

interface SalesPerformanceProps {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export default function SalesPerformance({
  startDate,
  endDate,
  limit = 10,
}: SalesPerformanceProps) {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalesPerformance();
  }, [startDate, endDate, limit]);

  const fetchSalesPerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Default to last 30 days if no dates provided
      const end = endDate || new Date().toISOString().split('T')[0];
      const start =
        startDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

      const response = await fetch(
        `http://localhost:3001/api/conversion-tracking/leaderboard?startDate=${start}&endDate=${end}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sales performance data');
      }

      const data = await response.json();
      setPerformers(data.topPerformers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching sales performance:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading sales performance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!performers || performers.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>No sales performance data available</div>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = performers.map((p) => ({
    name: p.name,
    revenue: p.totalRevenue,
    winRate: p.winRate,
  }));

  // Calculate totals
  const totalRevenue = performers.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalQuotes = performers.reduce((sum, p) => sum + p.quotes, 0);
  const totalJobs = performers.reduce((sum, p) => sum + p.jobs, 0);
  const avgWinRate = totalQuotes > 0 ? (totalJobs / totalQuotes) * 100 : 0;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Sales Performance Leaderboard</h2>

      {/* Summary Metrics */}
      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Revenue</div>
          <div className={styles.cardValue}>{formatCurrency(totalRevenue)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Quotes</div>
          <div className={styles.cardValue}>{totalQuotes}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Jobs</div>
          <div className={styles.cardValue}>{totalJobs}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Avg Win Rate</div>
          <div className={styles.cardValue}>{avgWinRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>Revenue by Sales Rep</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="name"
              stroke="rgba(255,255,255,0.7)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.7)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className={styles.customTooltip}>
                      <p className={styles.tooltipLabel}>{data.name}</p>
                      <p className={styles.tooltipValue}>
                        Revenue: {formatCurrency(data.revenue)}
                      </p>
                      <p className={styles.tooltipValue}>
                        Win Rate: {data.winRate.toFixed(1)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#667eea" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leaderboard Table */}
      <div className={styles.leaderboard}>
        <h3 className={styles.tableTitle}>Top Performers</h3>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.rankHeader}>#</div>
            <div className={styles.nameHeader}>Sales Rep</div>
            <div className={styles.quotesHeader}>Quotes</div>
            <div className={styles.jobsHeader}>Jobs</div>
            <div className={styles.winRateHeader}>Win Rate</div>
            <div className={styles.revenueHeader}>Revenue</div>
          </div>
          <div className={styles.tableBody}>
            {performers.map((performer, index) => (
              <div key={performer.userId} className={styles.tableRow}>
                <div className={styles.rank}>
                  {index === 0 && <span className={styles.medal}>🥇</span>}
                  {index === 1 && <span className={styles.medal}>🥈</span>}
                  {index === 2 && <span className={styles.medal}>🥉</span>}
                  {index > 2 && <span>{index + 1}</span>}
                </div>
                <div className={styles.name}>{performer.name}</div>
                <div className={styles.quotes}>{performer.quotes}</div>
                <div className={styles.jobs}>{performer.jobs}</div>
                <div className={styles.winRate}>
                  <div className={styles.winRateBar}>
                    <div
                      className={styles.winRateFill}
                      style={{ width: `${performer.winRate}%` }}
                    ></div>
                    <span className={styles.winRateText}>
                      {performer.winRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={styles.revenue}>
                  {formatCurrency(performer.totalRevenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
