'use client';

import { useState, useEffect } from 'react';
import styles from './ConversionFunnel.module.css';

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  conversionRate: number | null;
}

interface ConversionFunnelProps {
  startDate?: string;
  endDate?: string;
}

export default function ConversionFunnel({
  startDate,
  endDate,
}: ConversionFunnelProps) {
  const [funnelData, setFunnelData] = useState<FunnelStage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversionFunnel();
  }, [startDate, endDate]);

  const fetchConversionFunnel = async () => {
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
        `http://localhost:3001/api/conversion-tracking/funnel?startDate=${start}&endDate=${end}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch conversion funnel data');
      }

      const data = await response.json();
      setFunnelData(data.funnelStages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching conversion funnel:', err);
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

  const getStageWidth = (index: number, total: number) => {
    // Create a funnel effect by reducing width for each stage
    const baseWidth = 100;
    const reduction = (index / (total - 1)) * 40;
    return baseWidth - reduction;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading conversion funnel...</div>
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

  if (!funnelData || funnelData.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>No conversion data available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Sales Conversion Funnel</h2>

      <div className={styles.funnel}>
        {funnelData.map((stage, index) => (
          <div
            key={stage.stage}
            className={styles.stage}
            style={{
              width: `${getStageWidth(index, funnelData.length)}%`,
            }}
          >
            <div className={styles.stageHeader}>
              <h3 className={styles.stageName}>{stage.stage}</h3>
            </div>

            <div className={styles.stageBody}>
              <div className={styles.stageMetrics}>
                <div className={styles.count}>{stage.count}</div>
                {stage.value > 0 && (
                  <div className={styles.value}>
                    {formatCurrency(stage.value)}
                  </div>
                )}
              </div>

              {stage.conversionRate !== null && (
                <div className={styles.conversionRate}>
                  <span className={styles.rateLabel}>Conversion:</span>
                  <span className={styles.rateValue}>
                    {stage.conversionRate}%
                  </span>
                </div>
              )}
            </div>

            {index < funnelData.length - 1 && (
              <div className={styles.connector}></div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Leads:</span>
          <span className={styles.summaryValue}>
            {funnelData[0]?.count || 0}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Jobs Created:</span>
          <span className={styles.summaryValue}>
            {funnelData[funnelData.length - 1]?.count || 0}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Overall Conversion:</span>
          <span className={styles.summaryValue}>
            {funnelData[0]?.count > 0
              ? (
                  ((funnelData[funnelData.length - 1]?.count || 0) /
                    funnelData[0].count) *
                  100
                ).toFixed(1)
              : 0}
            %
          </span>
        </div>
      </div>
    </div>
  );
}
