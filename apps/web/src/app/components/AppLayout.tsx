'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SkipLink } from './SkipLink';
import { NotificationToast } from './notifications/NotificationToast';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function AppLayout({
  children,
  activeTab,
  onTabChange,
}: AppLayoutProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <>
      <SkipLink />
      <div className={styles.appLayout}>
        {/* Mobile Hamburger Menu Button */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileSidebar}
          aria-label={isMobileSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileSidebarOpen}
          type="button"
        >
          <svg
            className={styles.hamburgerIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMobileSidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Backdrop overlay for mobile */}
        {isMobileSidebarOpen && (
          <div
            className={styles.backdrop}
            onClick={toggleMobileSidebar}
            aria-hidden="true"
          />
        )}

        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={toggleMobileSidebar}
        />
        <div className={styles.mainContainer}>
          <TopBar />
          <main
            className={styles.content}
            id="main-content"
            role="main"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
        <NotificationToast onNavigate={(path) => router.push(path)} />
      </div>
    </>
  );
}
