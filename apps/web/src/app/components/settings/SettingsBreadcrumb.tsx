'use client';

import { settingsRoutes } from './settingsRoutes';
import type { SettingsRoute } from './SettingsLayout';
import styles from './SettingsBreadcrumb.module.css';

interface SettingsBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function SettingsBreadcrumb({ currentPath, onNavigate }: SettingsBreadcrumbProps) {
  const findRouteByPath = (routes: SettingsRoute[], path: string): SettingsRoute | null => {
    for (const route of routes) {
      if (route.path === path) {
        return route;
      }
      if (route.children) {
        const childRoute = findRouteByPath(route.children, path);
        if (childRoute) {
          return childRoute;
        }
      }
    }
    return null;
  };

  const buildBreadcrumbPath = (routes: SettingsRoute[], targetPath: string): SettingsRoute[] => {
    const path: SettingsRoute[] = [];

    const findPath = (routes: SettingsRoute[], target: string, currentPath: SettingsRoute[] = []): boolean => {
      for (const route of routes) {
        const newPath = [...currentPath, route];

        if (route.path === target) {
          path.push(...newPath);
          return true;
        }

        if (route.children && findPath(route.children, target, newPath)) {
          return true;
        }
      }
      return false;
    };

    findPath(routes, targetPath);
    return path;
  };

  const breadcrumbPath = buildBreadcrumbPath(settingsRoutes, currentPath);

  if (breadcrumbPath.length === 0) {
    return null;
  }

  return (
    <nav className={styles.breadcrumb} aria-label="Settings breadcrumb">
      <ol className={styles.breadcrumbList}>
        <li className={styles.breadcrumbItem}>
          <button
            className={styles.breadcrumbLink}
            onClick={() => onNavigate('/settings')}
          >
            ⚙️ Settings
          </button>
          <span className={styles.breadcrumbSeparator}>›</span>
        </li>

        {breadcrumbPath.map((item, index) => {
          const isLast = index === breadcrumbPath.length - 1;

          return (
            <li key={item.path} className={styles.breadcrumbItem}>
              {isLast ? (
                <span className={`${styles.breadcrumbCurrent} ${styles.breadcrumbText}`}>
                  {item.icon && <span className={styles.breadcrumbIcon}>{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <>
                  <button
                    className={styles.breadcrumbLink}
                    onClick={() => onNavigate(item.path)}
                  >
                    {item.icon && <span className={styles.breadcrumbIcon}>{item.icon}</span>}
                    {item.label}
                  </button>
                  <span className={styles.breadcrumbSeparator}>›</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}