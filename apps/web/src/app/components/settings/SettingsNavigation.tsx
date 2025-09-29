'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsRoutes } from './settingsRoutes';
import type { SettingsRoute } from './SettingsLayout';
import styles from './SettingsNavigation.module.css';

interface SettingsNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  searchQuery?: string;
}

export function SettingsNavigation({
  currentPath,
  onNavigate,
  searchQuery = ''
}: SettingsNavigationProps) {
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['company', 'estimates', 'tariffs']) // Default expanded sections
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const hasAccess = (route: SettingsRoute): boolean => {
    if (!route.roles || route.roles.length === 0) return true;
    return route.roles.includes(user?.role?.name || '');
  };

  const matchesSearch = (route: SettingsRoute, query: string): boolean => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return (
      route.label.toLowerCase().includes(searchLower) ||
      route.path.toLowerCase().includes(searchLower) ||
      (route.children?.some(child => matchesSearch(child, query)) || false)
    );
  };

  const renderNavigationItem = (route: SettingsRoute, level = 0) => {
    if (!hasAccess(route) || !matchesSearch(route, searchQuery)) {
      return null;
    }

    const isActive = currentPath === route.path;
    const isParentActive = currentPath.startsWith(route.path + '/');
    const hasChildren = route.children && route.children.length > 0;
    const isExpanded = expandedSections.has(route.id);
    const hasVisibleChildren = hasChildren && route.children!.some(child =>
      hasAccess(child) && matchesSearch(child, searchQuery)
    );

    return (
      <div key={route.id} className={styles.navigationItem}>
        <button
          className={`${styles.navButton} ${
            isActive ? styles.active : ''
          } ${isParentActive ? styles.parentActive : ''}`}
          style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
          onClick={() => {
            if (hasVisibleChildren && level === 0) {
              toggleSection(route.id);
            } else {
              onNavigate(route.path);
            }
          }}
          title={route.label}
        >
          <div className={styles.navContent}>
            {route.icon && (
              <span className={styles.navIcon}>{route.icon}</span>
            )}
            <span className={styles.navLabel}>{route.label}</span>
          </div>

          {hasVisibleChildren && level === 0 && (
            <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
              ▶
            </span>
          )}
        </button>

        {hasVisibleChildren && isExpanded && (
          <div className={styles.childrenContainer}>
            {route.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={styles.settingsNavigation} aria-label="Settings navigation">
      <div className={styles.navigationContent}>
        {settingsRoutes.map(route => renderNavigationItem(route))}
      </div>
    </nav>
  );
}