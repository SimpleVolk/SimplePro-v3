'use client';

import styles from './SkipLink.module.css';

/**
 * SkipLink Component
 *
 * Provides a keyboard-accessible skip navigation link for users who rely on keyboard navigation
 * or screen readers. This link allows users to bypass repetitive navigation and jump directly
 * to the main content of the page.
 *
 * WCAG 2.1 Success Criterion: 2.4.1 Bypass Blocks (Level A)
 *
 * @example
 * <SkipLink />
 */
export function SkipLink() {
  return (
    <a href="#main-content" className={styles.skipLink}>
      Skip to main content
    </a>
  );
}
