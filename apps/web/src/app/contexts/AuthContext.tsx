'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from '@/lib/config';

interface UserRole {
  id: string;
  name: 'super_admin' | 'admin' | 'manager' | 'dispatcher' | 'sales' | 'crew_lead' | 'crew_member' | 'customer_service';
  displayName: string;
  description: string;
  isSystemRole: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('auth/profile'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Enhanced debugging for fetch issues
      const apiUrl = getApiUrl('auth/login');
      console.log('🔗 Attempting login to:', apiUrl);
      console.log('📋 Environment variables check:', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NODE_ENV: process.env.NODE_ENV,
        windowDefined: typeof window !== 'undefined'
      });

      const requestPayload = { username: email, password };
      console.log('📤 Request payload:', requestPayload);

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        // Add credentials for CORS
        credentials: 'include' as RequestCredentials,
      };

      console.log('⚙️ Fetch options:', fetchOptions);
      console.log('🚀 Making fetch request...');

      const response = await fetch(apiUrl, fetchOptions);

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: response.headers,
        url: response.url,
        type: response.type
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Login successful, response data:', result);

        const data = result.data; // Extract data from the response envelope
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          console.log('💾 Tokens stored in localStorage');
        }
        setUser(data.user);
        return true;
      } else {
        console.error('❌ Login failed with status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        return false;
      }
    } catch (error) {
      console.error('💥 Login failed with exception:', error);

      // Enhanced error analysis
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network/Fetch Error Details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          isNetworkError: error.message.includes('Failed to fetch'),
          isCORSError: error.message.includes('CORS'),
          isConnectionError: error.message.includes('ERR_CONNECTION')
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}