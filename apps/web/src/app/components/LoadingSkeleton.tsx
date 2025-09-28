import React from 'react';
import styles from './LoadingSkeleton.module.css';

interface LoadingSkeletonProps {
  type?: 'default' | 'table' | 'cards' | 'analytics';
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'default',
  rows = 3
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'table':
        return (
          <div className={styles.skeletonTable}>
            <div className={styles.skeletonTableHeader}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={styles.skeletonTableHeaderCell} />
              ))}
            </div>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className={styles.skeletonTableRow}>
                {[...Array(4)].map((_, j) => (
                  <div key={j} className={styles.skeletonTableCell} />
                ))}
              </div>
            ))}
          </div>
        );

      case 'cards':
        return (
          <div className={styles.skeletonCards}>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonCardHeader} />
                <div className={styles.skeletonCardContent}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'analytics':
        return (
          <div className={styles.skeletonAnalytics}>
            <div className={styles.skeletonMetrics}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={styles.skeletonMetricCard}>
                  <div className={styles.skeletonMetricTitle} />
                  <div className={styles.skeletonMetricValue} />
                  <div className={styles.skeletonMetricSubtext} />
                </div>
              ))}
            </div>
            <div className={styles.skeletonCharts}>
              <div className={styles.skeletonChart}>
                <div className={styles.skeletonChartHeader} />
                <div className={styles.skeletonChartBody} />
              </div>
              <div className={styles.skeletonChart}>
                <div className={styles.skeletonChartHeader} />
                <div className={styles.skeletonChartBody} />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={styles.skeletonDefault}>
            <div className={styles.skeletonHeader} />
            {[...Array(rows)].map((_, i) => (
              <div key={i} className={styles.skeletonContent}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className={styles.skeletonContainer} role="status" aria-label="Loading content">
      {renderSkeleton()}
      <span className="sr-only">Loading...</span>
    </div>
  );
};