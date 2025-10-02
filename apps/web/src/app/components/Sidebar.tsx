'use client';

import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'opportunities',
      label: 'New Opportunity',
      icon: '✨',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'estimates',
      label: 'Estimates',
      icon: '📋',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👥',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: '📦',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: '📅',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'leads',
      label: 'Leads & Follow-up',
      icon: '🎯',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'partners',
      label: 'Partners',
      icon: '🤝',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: '📁',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'crew',
      label: 'Crew Schedule',
      icon: '👷',
      roles: ['super_admin', 'admin', 'dispatcher']
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      roles: ['super_admin', 'admin', 'dispatcher', 'crew']
    },
    {
      id: 'conversion',
      label: 'Conversion Analytics',
      icon: '📊',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📈',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      roles: ['super_admin', 'admin']
    },
  ];

  const availableItems = navigationItems.filter(item =>
    item.roles.includes(user?.role?.name || '')
  );

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          {!isCollapsed && <h1>SimplePro</h1>}
          {isCollapsed && <h1>SP</h1>}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.collapseButton}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className={styles.navigation}>
        {availableItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`${styles.navItem} ${
              activeTab === item.id ? styles.navItemActive : ''
            }`}
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            id={`tab-${item.id}`}
            tabIndex={activeTab === item.id ? 0 : -1}
            title={isCollapsed ? item.label : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const direction = e.key === 'ArrowUp' ? -1 : 1;
                const newIndex = (index + direction + availableItems.length) % availableItems.length;
                onTabChange(availableItems[newIndex].id);
                document.getElementById(`tab-${availableItems[newIndex].id}`)?.focus();
              }
            }}
          >
            <span className={styles.navIcon} aria-hidden="true">
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className={styles.navLabel}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        {!isCollapsed && (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </div>
              <div className={styles.userRole}>
                {user?.role?.displayName || user?.role?.name}
              </div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className={styles.userAvatarCollapsed}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        )}
      </div>
    </aside>
  );
}