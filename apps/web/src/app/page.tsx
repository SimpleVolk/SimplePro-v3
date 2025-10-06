'use client';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import styles from './page.module.css';

// Force dynamic rendering for authenticated app
export const dynamic = 'force-dynamic';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true"></div>
        <p aria-live="assertive">Loading SimplePro Dashboard...</p>
        <span className="sr-only">Please wait while the application loads</span>
      </div>
    );
  }

  return isAuthenticated ? (
    <WebSocketProvider>
      <Dashboard />
    </WebSocketProvider>
  ) : (
    <LoginForm />
  );
}

export default function Index() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to monitoring service in production
        console.error('Application Error:', error, errorInfo);
      }}
    >
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}
