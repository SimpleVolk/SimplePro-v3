'use client';

import { memo } from 'react';
import styles from './KPICard.module.css';

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color: 'success' | 'warning' | 'info' | 'neutral';
  onClick?: () => void;
  loading?: boolean;
}

export const KPICard = memo(function KPICard({
  title,
  value,
  subValue,
  change,
  trend,
  icon,
  color,
  onClick,
  loading = false
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toString();
    }
    return val;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '';
    }
  };

  const getTrendClass = () => {
    switch (trend) {
      case 'up':
        return styles.trendUp;
      case 'down':
        return styles.trendDown;
      default:
        return styles.trendNeutral;
    }
  };

  if (loading) {
    return (
      <div className={`${styles.kpiCard} ${styles.loading}`}>
        <div className={styles.loadingSkeleton}>
          <div className={styles.skeletonIcon}></div>
          <div className={styles.skeletonText}></div>
          <div className={styles.skeletonValue}></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.kpiCard} ${styles[color]} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`${styles.changeIndicator} ${getTrendClass()}`}>
            <span className={styles.trendIcon}>{getTrendIcon()}</span>
            <span className={styles.changeValue}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardTitle}>
          {title}
        </div>
        <div className={styles.cardValue}>
          {formatValue(value)}
        </div>
        {subValue && (
          <div className={styles.cardSubValue}>
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
});