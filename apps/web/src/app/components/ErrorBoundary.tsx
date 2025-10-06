'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * ErrorBoundary component for catching and handling React errors
 * Provides a user-friendly fallback UI when errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console and call optional onError handler
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({ errorInfo });

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error monitoring service
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className={styles.errorBoundary} role="alert">
          <div className={styles.container}>
            <div className={styles.icon}>⚠️</div>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
              We apologize for the inconvenience. An unexpected error has
              occurred.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>
                  Error Details (Development)
                </summary>
                <pre className={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <br />
                      <br />
                      Component Stack:
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className={styles.actions}>
              <button
                className={styles.retryButton}
                onClick={() => {
                  this.setState({
                    hasError: false,
                    error: undefined,
                    errorInfo: undefined,
                  });
                }}
                aria-label="Try again"
              >
                Try Again
              </button>
              <button
                className={styles.reloadButton}
                onClick={() => window.location.reload()}
                aria-label="Reload page"
              >
                Reload Page
              </button>
            </div>

            <div className={styles.support}>
              <p>If this problem persists, please contact support.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
