'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import styles from './WinLossAnalysis.module.css';

interface WinLossData {
  totalQuotes: number;
  quotesWon: number;
  quotesLost: number;
  winRate: number;
  winReasons: Array<{ reason: string; count: number; percentage: number }>;
  lossReasons: Array<{ reason: string; count: number; percentage: number }>;
}

interface WinLossAnalysisProps {
  startDate?: string;
  endDate?: string;
}

const COLORS = {
  won: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  lost: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
};

export default function WinLossAnalysis({
  startDate,
  endDate,
}: WinLossAnalysisProps) {
  const [data, setData] = useState<WinLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWinLossData();
  }, [startDate, endDate]);

  const fetchWinLossData = async () => {
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
        `http://localhost:3001/api/quote-history/analytics/win-loss-reasons?startDate=${start}&endDate=${end}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch win/loss data');
      }

      const result = await response.json();
      setData(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching win/loss data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatReasonLabel = (reason: string) => {
    return reason
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading win/loss analysis...</div>
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

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>No win/loss data available</div>
      </div>
    );
  }

  const winChartData = data.winReasons.map((item) => ({
    name: formatReasonLabel(item.reason),
    value: item.count,
    percentage: item.percentage,
  }));

  const lossChartData = data.lossReasons.map((item) => ({
    name: formatReasonLabel(item.reason),
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Win/Loss Analysis</h2>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Quotes</div>
          <div className={styles.cardValue}>{data.totalQuotes}</div>
        </div>
        <div className={`${styles.card} ${styles.wonCard}`}>
          <div className={styles.cardLabel}>Quotes Won</div>
          <div className={styles.cardValue}>{data.quotesWon}</div>
        </div>
        <div className={`${styles.card} ${styles.lostCard}`}>
          <div className={styles.cardLabel}>Quotes Lost</div>
          <div className={styles.cardValue}>{data.quotesLost}</div>
        </div>
        <div className={`${styles.card} ${styles.winRateCard}`}>
          <div className={styles.cardLabel}>Win Rate</div>
          <div className={styles.cardValue}>{data.winRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsContainer}>
        {/* Win Reasons Chart */}
        {winChartData.length > 0 && (
          <div className={styles.chartSection}>
            <h3 className={styles.chartTitle}>Win Reasons</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={winChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.percent ? (props.percent * 100).toFixed(1) : '0'}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {winChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS.won[index % COLORS.won.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={styles.customTooltip}>
                          <p className={styles.tooltipLabel}>{data.name}</p>
                          <p className={styles.tooltipValue}>
                            Count: {data.value}
                          </p>
                          <p className={styles.tooltipValue}>
                            {data.percentage.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className={styles.reasonsList}>
              {data.winReasons.map((reason, index) => (
                <div key={index} className={styles.reasonItem}>
                  <div
                    className={styles.reasonColor}
                    style={{ backgroundColor: COLORS.won[index % COLORS.won.length] }}
                  ></div>
                  <span className={styles.reasonName}>
                    {formatReasonLabel(reason.reason)}
                  </span>
                  <span className={styles.reasonCount}>{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loss Reasons Chart */}
        {lossChartData.length > 0 && (
          <div className={styles.chartSection}>
            <h3 className={styles.chartTitle}>Loss Reasons</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={lossChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.percent ? (props.percent * 100).toFixed(1) : '0'}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {lossChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS.lost[index % COLORS.lost.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={styles.customTooltip}>
                          <p className={styles.tooltipLabel}>{data.name}</p>
                          <p className={styles.tooltipValue}>
                            Count: {data.value}
                          </p>
                          <p className={styles.tooltipValue}>
                            {data.percentage.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className={styles.reasonsList}>
              {data.lossReasons.map((reason, index) => (
                <div key={index} className={styles.reasonItem}>
                  <div
                    className={styles.reasonColor}
                    style={{ backgroundColor: COLORS.lost[index % COLORS.lost.length] }}
                  ></div>
                  <span className={styles.reasonName}>
                    {formatReasonLabel(reason.reason)}
                  </span>
                  <span className={styles.reasonCount}>{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
