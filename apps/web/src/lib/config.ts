/**
 * Configuration utilities for the SimplePro web application
 * Handles environment-based API URL and WebSocket URL configuration
 */

/**
 * Get the API base URL or full endpoint URL based on environment
 * @param endpoint - Optional API endpoint path (e.g., 'analytics/dashboard')
 * @returns The API base URL or full endpoint URL
 */
export function getApiUrl(endpoint?: string): string {
  // Get base API URL
  let baseUrl: string;

  // Check for environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    baseUrl = process.env.NEXT_PUBLIC_API_URL;
  } else if (process.env.NODE_ENV === 'production') {
    // Default to localhost in development, production URL in production
    baseUrl =
      process.env.NEXT_PUBLIC_PRODUCTION_API_URL ||
      'https://api.yourdomain.com';
  } else {
    // Development default
    baseUrl = 'http://localhost:3001';
  }

  // Debug logging for URL construction
  console.log('🔧 getApiUrl debug:', {
    endpoint,
    envVar: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    baseUrl,
    typeof_window: typeof window,
    isClient: typeof window !== 'undefined',
  });

  // If no endpoint provided, return base URL
  if (!endpoint) {
    return baseUrl;
  }

  // Build full endpoint URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}/api${cleanEndpoint}`;

  console.log('🎯 Final URL constructed:', fullUrl);
  return fullUrl;
}

/**
 * Get the WebSocket URL based on environment
 * @returns The WebSocket URL
 */
export function getWebSocketUrl(): string {
  // Check for environment variable first
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Get base API URL and convert to WebSocket URL
  const apiUrl = getApiUrl();

  if (process.env.NODE_ENV === 'production') {
    // Convert HTTPS to WSS for production
    return apiUrl.replace(/^https?/, 'wss');
  }

  // Convert HTTP to WS for development
  return apiUrl.replace(/^https?/, 'ws');
}

/**
 * Get the full API endpoint URL
 * @param endpoint - The API endpoint path (e.g., '/api/customers')
 * @returns The full API URL
 */
export function getApiEndpoint(endpoint: string): string {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Configuration object for the application
 */
export const config = {
  api: {
    baseUrl: getApiUrl(),
    timeout: 30000, // 30 seconds
  },
  websocket: {
    url: getWebSocketUrl(),
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10,
  },
  app: {
    name: 'SimplePro',
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
} as const;

export default config;
