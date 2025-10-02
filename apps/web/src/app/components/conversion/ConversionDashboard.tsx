'use client';

import { useState } from 'react';
import ConversionFunnel from './ConversionFunnel';
import WinLossAnalysis from './WinLossAnalysis';
import SalesPerformance from './SalesPerformance';
import QuoteTimeline from './QuoteTimeline';
import styles from './ConversionDashboard.module.css';

interface ConversionDashboardProps {
  opportunityId?: string;
}

export default function ConversionDashboard({
  opportunityId,
}: ConversionDashboardProps) {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [activeTab, setActiveTab] = useState<
    'funnel' | 'winloss' | 'performance' | 'timeline'
  >('funnel');

  const handleQuickRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Conversion Analytics</h1>

        {/* Quick Range Buttons */}
        <div className={styles.quickRanges}>
          <button
            className={styles.quickRangeBtn}
            onClick={() => handleQuickRange(7)}
          >
            Last 7 Days
          </button>
          <button
            className={styles.quickRangeBtn}
            onClick={() => handleQuickRange(30)}
          >
            Last 30 Days
          </button>
          <button
            className={styles.quickRangeBtn}
            onClick={() => handleQuickRange(90)}
          >
            Last 90 Days
          </button>
          <button
            className={styles.quickRangeBtn}
            onClick={() => handleQuickRange(365)}
          >
            Last Year
          </button>
        </div>

        {/* Custom Date Range */}
        <div className={styles.dateSelector}>
          <label className={styles.dateLabel}>
            Start Date:
            <input
              type="date"
              className={styles.dateInput}
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
            />
          </label>
          <label className={styles.dateLabel}>
            End Date:
            <input
              type="date"
              className={styles.dateInput}
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
            />
          </label>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'funnel' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('funnel')}
        >
          Conversion Funnel
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'winloss' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('winloss')}
        >
          Win/Loss Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'performance' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Sales Performance
        </button>
        {opportunityId && (
          <button
            className={`${styles.tab} ${activeTab === 'timeline' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Quote Timeline
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {activeTab === 'funnel' && (
          <div className={styles.tabPanel}>
            <ConversionFunnel
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        )}

        {activeTab === 'winloss' && (
          <div className={styles.tabPanel}>
            <WinLossAnalysis
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        )}

        {activeTab === 'performance' && (
          <div className={styles.tabPanel}>
            <SalesPerformance
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              limit={10}
            />
          </div>
        )}

        {activeTab === 'timeline' && opportunityId && (
          <div className={styles.tabPanel}>
            <QuoteTimeline opportunityId={opportunityId} />
          </div>
        )}
      </div>

      {/* Export/Print Actions */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => window.print()}>
          📄 Print Report
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => {
            /* TODO: Implement CSV export */
            alert('CSV export coming soon!');
          }}
        >
          📊 Export to CSV
        </button>
      </div>
    </div>
  );
}
