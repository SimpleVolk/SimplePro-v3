'use client';

import { useState, Suspense, lazy, memo } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';
import styles from './AnalyticsDashboard.module.css';

// Dynamic imports for chart-heavy components
const AnalyticsOverview = lazy(() =>
  import('./AnalyticsOverview').then((mod) => ({
    default: mod.AnalyticsOverview,
  })),
);
const ReportsManagement = lazy(() =>
  import('./ReportsManagement').then((mod) => ({
    default: mod.ReportsManagement,
  })),
);

export const AnalyticsDashboard = memo(function AnalyticsDashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'reports'>(
    'overview',
  );

  return (
    <div className={styles.analyticsDashboard}>
      <div className={styles.header}>
        <h2>Analytics & Reports</h2>
        <p>Business insights, performance metrics, and report management</p>
      </div>

      <div className={styles.sectionNavigation}>
        <button
          onClick={() => setActiveSection('overview')}
          className={`${styles.sectionButton} ${
            activeSection === 'overview' ? styles.sectionButtonActive : ''
          }`}
        >
          <div className={styles.sectionIcon}>📊</div>
          <div className={styles.sectionInfo}>
            <div className={styles.sectionTitle}>Dashboard Overview</div>
            <div className={styles.sectionDescription}>
              Real-time metrics and KPIs
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveSection('reports')}
          className={`${styles.sectionButton} ${
            activeSection === 'reports' ? styles.sectionButtonActive : ''
          }`}
        >
          <div className={styles.sectionIcon}>📋</div>
          <div className={styles.sectionInfo}>
            <div className={styles.sectionTitle}>Reports Management</div>
            <div className={styles.sectionDescription}>
              Create and manage custom reports
            </div>
          </div>
        </button>
      </div>

      <div className={styles.sectionContent}>
        {activeSection === 'overview' && (
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <AnalyticsOverview />
          </Suspense>
        )}
        {activeSection === 'reports' && (
          <Suspense fallback={<LoadingSkeleton type="table" rows={5} />}>
            <ReportsManagement />
          </Suspense>
        )}
      </div>
    </div>
  );
});
