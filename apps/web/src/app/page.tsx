'use client';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import styles from './page.module.css';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}