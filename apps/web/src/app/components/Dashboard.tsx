'use client';

import { useAuth } from '../contexts/AuthContext';
import { EstimateForm } from './EstimateForm';
import { EstimateResult } from './EstimateResult';
import { CustomerManagement } from './CustomerManagement';
import { JobManagement } from './JobManagement';
import { CalendarDispatch } from './CalendarDispatch';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useState } from 'react';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [estimateResult, setEstimateResult] = useState(null);
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
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>SimplePro Dashboard</h1>
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <span className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.userRole}>
                {userRoleDisplayName(user?.role || '')}
              </span>
            </div>
            <button onClick={logout} className={styles.logoutButton}>
              Sign Out
            </button>
          </div>
        </div>

        <nav className={styles.navigation}>
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.navButton} ${
                activeTab === tab.id ? styles.navButtonActive : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {activeTab === 'estimates' && (
          <div className={styles.content}>
            <div className={styles.pageHeader}>
              <h2>Moving Estimates</h2>
              <p>Create accurate pricing estimates for customer moves</p>
            </div>

            <div className={styles.estimateSection}>
              <div className={styles.formSection}>
                <EstimateForm onEstimateComplete={setEstimateResult} />
              </div>

              {estimateResult && (
                <div className={styles.resultSection}>
                  <EstimateResult result={estimateResult} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className={styles.content}>
            <CustomerManagement />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className={styles.content}>
            <JobManagement />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className={styles.content}>
            <CalendarDispatch />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className={styles.content}>
            <AnalyticsDashboard />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.content}>
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