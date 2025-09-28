'use client';

import { useAuth } from '../contexts/AuthContext';
import { EstimateForm } from './EstimateForm';
import { EstimateResult } from './EstimateResult';
import type { EstimateResult as EstimateResultType } from '@simplepro/pricing-engine';
import { useState, Suspense, lazy } from 'react';
import styles from './Dashboard.module.css';
import { LoadingSkeleton } from './LoadingSkeleton';

// Dynamic imports for heavy components
const CustomerManagement = lazy(() => import('./CustomerManagement').then(mod => ({ default: mod.CustomerManagement })));
const JobManagement = lazy(() => import('./JobManagement').then(mod => ({ default: mod.JobManagement })));
const CalendarDispatch = lazy(() => import('./CalendarDispatch').then(mod => ({ default: mod.CalendarDispatch })));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard').then(mod => ({ default: mod.AnalyticsDashboard })));

export function Dashboard() {
  const { user, logout } = useAuth();
  const [estimateResult, setEstimateResult] = useState<EstimateResultType | null>(null);
  const [activeTab, setActiveTab] = useState('estimates');

  const userRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Administrator';
      case 'dispatcher':
        return 'Dispatcher';
      case 'crew':
        return 'Crew Member';
      default:
        return role;
    }
  };

  const tabs = [
    { id: 'estimates', label: 'Estimates', roles: ['super_admin', 'admin', 'dispatcher'] },
    { id: 'customers', label: 'Customers', roles: ['super_admin', 'admin', 'dispatcher'] },
    { id: 'jobs', label: 'Jobs', roles: ['super_admin', 'admin', 'dispatcher'] },
    { id: 'calendar', label: 'Calendar', roles: ['super_admin', 'admin', 'dispatcher'] },
    { id: 'reports', label: 'Reports', roles: ['super_admin', 'admin'] },
    { id: 'settings', label: 'Settings', roles: ['super_admin', 'admin'] },
  ];

  const availableTabs = tabs.filter(tab =>
    tab.roles.includes(user?.role || '')
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header} role="banner">
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>SimplePro Dashboard</h1>
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <span className={styles.userName} aria-label={`Current user: ${user?.firstName} ${user?.lastName}`}>
                {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.userRole} aria-label={`User role: ${userRoleDisplayName(user?.role || '')}`}>
                {userRoleDisplayName(user?.role || '')}
              </span>
            </div>
            <button
              onClick={logout}
              className={styles.logoutButton}
              aria-label="Sign out of SimplePro Dashboard"
              type="button"
            >
              <span aria-hidden="true">📤</span>
              Sign Out
            </button>
          </div>
        </div>

        <nav className={styles.navigation} role="navigation" aria-label="Main navigation">
          {availableTabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.navButton} ${
                activeTab === tab.id ? styles.navButtonActive : ''
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  const direction = e.key === 'ArrowLeft' ? -1 : 1;
                  const newIndex = (index + direction + availableTabs.length) % availableTabs.length;
                  setActiveTab(availableTabs[newIndex].id);
                  document.getElementById(`tab-${availableTabs[newIndex].id}`)?.focus();
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main} id="main-content" role="main" tabIndex={-1}>
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
            <div className={styles.pageHeader}>
              <h2>System Settings</h2>
              <p>Configure pricing rules, user management, and system preferences</p>
            </div>
            <div className={styles.placeholder}>
              <p>Settings interface coming soon...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}