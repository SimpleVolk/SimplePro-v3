'use client';

import { useEffect } from 'react';
import styles from './page.module.css';

// Force dynamic rendering for error page
export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1>Something went wrong!</h1>
        <p>An error occurred while loading this page.</p>
        <button onClick={reset} className={styles.button}>
          Try again
        </button>
      </main>
    </div>
  );
}