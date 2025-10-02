'use client';

import { EstimateForm } from './EstimateForm';
import { EstimateResult } from './EstimateResult';
import type { EstimateResult as EstimateResultType } from '@simplepro/pricing-engine';
import { useState, Suspense, lazy } from 'react';
import { AppLayout } from './AppLayout';
import { LoadingSkeleton } from './LoadingSkeleton';
import styles from './Dashboard.module.css';

// Dynamic imports for heavy components
const DashboardOverview = lazy(() => import('./DashboardOverview').then(mod => ({ default: mod.DashboardOverview })));
const NewOpportunity = lazy(() => import('./NewOpportunity').then(mod => ({ default: mod.default })));
const CustomerManagement = lazy(() => import('./CustomerManagement').then(mod => ({ default: mod.CustomerManagement })));
const JobManagement = lazy(() => import('./JobManagement').then(mod => ({ default: mod.JobManagement })));
const CalendarDispatch = lazy(() => import('./CalendarDispatch').then(mod => ({ default: mod.CalendarDispatch })));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard').then(mod => ({ default: mod.AnalyticsDashboard })));
const Settings = lazy(() => import('./settings/Settings').then(mod => ({ default: mod.Settings })));

export function Dashboard() {
  const [estimateResult, setEstimateResult] = useState<EstimateResultType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-dashboard" aria-labelledby="tab-dashboard">
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <DashboardOverview />
          </Suspense>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-opportunities" aria-labelledby="tab-opportunities">
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <NewOpportunity />
          </Suspense>
        </div>
      )}

      {activeTab === 'estimates' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-estimates" aria-labelledby="tab-estimates">
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
        <div className={styles.content} role="tabpanel" id="tabpanel-customers" aria-labelledby="tab-customers">
          <Suspense fallback={<LoadingSkeleton type="cards" rows={6} />}>
            <CustomerManagement />
          </Suspense>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-jobs" aria-labelledby="tab-jobs">
          <Suspense fallback={<LoadingSkeleton type="table" rows={8} />}>
            <JobManagement />
          </Suspense>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-calendar" aria-labelledby="tab-calendar">
          <Suspense fallback={<LoadingSkeleton type="default" rows={5} />}>
            <CalendarDispatch />
          </Suspense>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-reports" aria-labelledby="tab-reports">
          <Suspense fallback={<LoadingSkeleton type="analytics" />}>
            <AnalyticsDashboard />
          </Suspense>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className={styles.content} role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings">
          <Suspense fallback={<LoadingSkeleton type="default" rows={8} />}>
            <Settings />
          </Suspense>
        </div>
      )}
    </AppLayout>
  );
}