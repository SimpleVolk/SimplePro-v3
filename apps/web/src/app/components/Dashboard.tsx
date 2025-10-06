'use client';

import { EstimateForm } from './EstimateForm';
import { EstimateResult } from './EstimateResult';
import type { EstimateResult as EstimateResultType } from '@simplepro/pricing-engine';
import { useState, Suspense, lazy } from 'react';
import { AppLayout } from './AppLayout';
import { LoadingSkeleton } from './LoadingSkeleton';
import styles from './Dashboard.module.css';

// Dynamic imports for heavy components
const DashboardOverview = lazy(() =>
  import('./DashboardOverview').then((mod) => ({
    default: mod.DashboardOverview,
  })),
);
const NewOpportunity = lazy(() =>
  import('./NewOpportunity').then((mod) => ({ default: mod.default })),
);
const CustomerManagement = lazy(() =>
  import('./CustomerManagement').then((mod) => ({
    default: mod.CustomerManagement,
  })),
);
const JobManagement = lazy(() =>
  import('./JobManagement').then((mod) => ({ default: mod.JobManagement })),
);
const CalendarDispatch = lazy(() =>
  import('./CalendarDispatch').then((mod) => ({
    default: mod.CalendarDispatch,
  })),
);
const LeadActivities = lazy(() =>
  import('./leads/LeadActivities').then((mod) => ({
    default: mod.LeadActivities,
  })),
);
const PartnerManagement = lazy(() =>
  import('./partners/PartnerManagement').then((mod) => ({
    default: mod.PartnerManagement,
  })),
);
const DocumentUpload = lazy(() =>
  import('./documents/DocumentUpload').then((mod) => ({
    default: mod.DocumentUpload,
  })),
);
const CrewSchedule = lazy(() =>
  import('./crew/CrewSchedule').then((mod) => ({ default: mod.CrewSchedule })),
);
const NotificationCenter = lazy(() =>
  import('./notifications/NotificationCenter').then((mod) => ({
    default: mod.NotificationCenter,
  })),
);
const ConversionDashboard = lazy(() =>
  import('./conversion').then((mod) => ({ default: mod.ConversionDashboard })),
);
const AnalyticsDashboard = lazy(() =>
  import('./AnalyticsDashboard').then((mod) => ({
    default: mod.AnalyticsDashboard,
  })),
);
const Settings = lazy(() =>
  import('./settings/Settings').then((mod) => ({ default: mod.Settings })),
);

export function Dashboard() {
  const [estimateResult, setEstimateResult] =
    useState<EstimateResultType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-dashboard"
          aria-labelledby="tab-dashboard"
        >
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <DashboardOverview />
          </Suspense>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-opportunities"
          aria-labelledby="tab-opportunities"
        >
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <NewOpportunity />
          </Suspense>
        </div>
      )}

      {activeTab === 'estimates' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-estimates"
          aria-labelledby="tab-estimates"
        >
          <div className={styles.pageHeader}>
            <h2>Moving Estimates</h2>
            <p>Create accurate pricing estimates for customer moves</p>
          </div>

          <div className={styles.estimateSection}>
            <div className={styles.formSection}>
              <EstimateForm onEstimateComplete={setEstimateResult} />
            </div>

            {estimateResult && (
              <div className={styles.resultSection} aria-live="polite">
                <EstimateResult result={estimateResult} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-customers"
          aria-labelledby="tab-customers"
        >
          <Suspense fallback={<LoadingSkeleton type="cards" rows={6} />}>
            <CustomerManagement />
          </Suspense>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-jobs"
          aria-labelledby="tab-jobs"
        >
          <Suspense fallback={<LoadingSkeleton type="table" rows={8} />}>
            <JobManagement />
          </Suspense>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-calendar"
          aria-labelledby="tab-calendar"
        >
          <Suspense fallback={<LoadingSkeleton type="default" rows={5} />}>
            <CalendarDispatch />
          </Suspense>
        </div>
      )}

      {activeTab === 'leads' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-leads"
          aria-labelledby="tab-leads"
        >
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <LeadActivities />
          </Suspense>
        </div>
      )}

      {activeTab === 'partners' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-partners"
          aria-labelledby="tab-partners"
        >
          <Suspense fallback={<LoadingSkeleton type="cards" rows={6} />}>
            <PartnerManagement />
          </Suspense>
        </div>
      )}

      {activeTab === 'documents' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-documents"
          aria-labelledby="tab-documents"
        >
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <DocumentUpload />
          </Suspense>
        </div>
      )}

      {activeTab === 'crew' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-crew"
          aria-labelledby="tab-crew"
        >
          <Suspense fallback={<LoadingSkeleton type="table" rows={8} />}>
            <CrewSchedule />
          </Suspense>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-notifications"
          aria-labelledby="tab-notifications"
        >
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <NotificationCenter />
          </Suspense>
        </div>
      )}

      {activeTab === 'conversion' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-conversion"
          aria-labelledby="tab-conversion"
        >
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <ConversionDashboard />
          </Suspense>
        </div>
      )}

      {activeTab === 'reports' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-reports"
          aria-labelledby="tab-reports"
        >
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <AnalyticsDashboard />
          </Suspense>
        </div>
      )}

      {activeTab === 'settings' && (
        <div
          className={styles.content}
          role="tabpanel"
          id="tabpanel-settings"
          aria-labelledby="tab-settings"
        >
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <Settings />
          </Suspense>
        </div>
      )}
    </AppLayout>
  );
}
