'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    const success = await login(username, password);
    if (!success) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <header className={styles.header}>
          <h1>SimplePro Login</h1>
          <p>Access your moving company dashboard</p>
        </header>

        <main>
          <form onSubmit={handleSubmit} className={styles.form} noValidate aria-label="User login form">
            {error && (
              <div
                className={styles.error}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <span className="sr-only">Error: </span>
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'login-error' : undefined}
                autoComplete="username"
                placeholder="Enter your username or email"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'login-error' : undefined}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
              aria-describedby="login-status"
            >
              {isLoading ? (
                <>
                  <span className="sr-only">Please wait, </span>
                  <span aria-hidden="true">⏳ </span>
                  Signing In...
                </>
              ) : (
                <>
                  <span aria-hidden="true">🔑 </span>
                  Sign In
                </>
              )}
            </button>

            <div id="login-status" className="sr-only" aria-live="polite">
              {isLoading ? 'Signing in, please wait...' : ''}
            </div>
          </form>
        </main>

        <footer className={styles.footer}>
          <h2 className="sr-only">Demo Information</h2>
          <p>Demo Credentials:</p>
          <p><strong>Admin:</strong> admin / Admin123!</p>
          <p><em>Additional users can be created from the admin dashboard</em></p>
        </footer>
      </div>
    </div>
  );
}