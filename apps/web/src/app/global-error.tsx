'use client';

import { useEffect } from 'react';
import styles from './page.module.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className={styles.container}>
          <main className={styles.main}>
            <h1>Something went wrong!</h1>
            <p>An unexpected error occurred. Please try again.</p>
            <button onClick={reset} className={styles.button}>
              Try again
            </button>
          </main>
        </div>
      </body>
    </html>
  );
}