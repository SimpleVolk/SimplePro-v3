'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
  return (
    <div className={styles.appLayout}>
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <div className={styles.mainContainer}>
        <TopBar />
        <main className={styles.content} id="main-content" role="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}