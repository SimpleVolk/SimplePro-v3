'use client';

import { ReactNode, useState } from 'react';
import { SettingsNavigation } from './SettingsNavigation';
import { SettingsBreadcrumb } from './SettingsBreadcrumb';
import styles from './SettingsLayout.module.css';

export interface SettingsRoute {
  id: string;
  label: string;
  path: string;
  icon?: string;
  component?: ReactNode;
  children?: SettingsRoute[];
  roles?: string[];
}

export interface SettingsLayoutProps {
  children?: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function SettingsLayout({ children, currentPath, onNavigate }: SettingsLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className={styles.settingsLayout}>
      {/* Settings Header */}
      <div className={styles.settingsHeader}>
        <div className={styles.headerContent}>
          <h2>System Settings</h2>
          <p>Configure your business operations, pricing, and system preferences</p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>
        </div>
      </div>

      <div className={styles.settingsContent}>
        {/* Navigation Sidebar */}
        <aside className={styles.settingsNavigation}>
          <SettingsNavigation
            currentPath={currentPath}
            onNavigate={onNavigate}
            searchQuery={searchQuery}
          />
        </aside>

        {/* Main Content Area */}
        <main className={styles.settingsMain}>
          <SettingsBreadcrumb
            currentPath={currentPath}
            onNavigate={onNavigate}
          />

          <div className={styles.settingsPanel}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}