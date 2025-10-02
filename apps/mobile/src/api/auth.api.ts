/**
 * Authentication API
 *
 * Endpoints for login, logout, profile, and token management
 */

import apiClient from './client';

export const authApi = {
  /**
   * Login with username/email and password
   */
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Logout - invalidate session
   */
  logout: async (token: string) => {
    const response = await apiClient.post(
      '/auth/logout',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get user profile
   */
  getProfile: async (token: string) => {
    const response = await apiClient.get('/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (token: string, data: any) => {
    const response = await apiClient.patch('/auth/profile', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (token: string, oldPassword: string, newPassword: string) => {
    const response = await apiClient.post(
      '/auth/change-password',
      {
        oldPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};
