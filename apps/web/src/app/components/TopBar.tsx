'use client';

import { useAuth } from '../contexts/AuthContext';
import styles from './TopBar.module.css';

export function TopBar() {
  const { user, logout } = useAuth();

  const getUserRoleDisplayName = (role?: { name: string; displayName: string }) => {
    return role?.displayName || role?.name || 'Unknown Role';
  };

  return (
    <header className={styles.topBar} role="banner">
      <div className={styles.topBarContent}>
        <div className={styles.breadcrumb}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
        </div>

        <div className={styles.rightSection}>
          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <span className={styles.userName} aria-label={`Current user: ${user?.firstName} ${user?.lastName}`}>
                {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.userRole} aria-label={`User role: ${getUserRoleDisplayName(user?.role)}`}>
                {getUserRoleDisplayName(user?.role)}
              </span>
            </div>
            <div className={styles.userAvatar}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>

          <button
            onClick={logout}
            className={styles.logoutButton}
            aria-label="Sign out of SimplePro Dashboard"
            type="button"
          >
            <span className={styles.logoutIcon} aria-hidden="true">📤</span>
            <span className={styles.logoutText}>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}