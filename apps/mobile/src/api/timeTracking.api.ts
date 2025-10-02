/**
 * Time Tracking API
 *
 * Endpoints for time tracking, breaks, and payroll
 */

import apiClient from './client';

export const timeTrackingApi = {
  /**
   * Clock in to job
   */
  clockIn: async (token: string, jobId: string) => {
    const response = await apiClient.post(
      '/time-tracking/clock-in',
      {
        jobId,
        clockInTime: new Date().toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Clock out from job
   */
  clockOut: async (token: string, entryId: string) => {
    const response = await apiClient.post(
      `/time-tracking/${entryId}/clock-out`,
      {
        clockOutTime: new Date().toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Add break time
   */
  addBreak: async (token: string, entryId: string, duration: number) => {
    const response = await apiClient.post(
      `/time-tracking/${entryId}/break`,
      {
        breakDuration: duration,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get time entries
   */
  getTimeEntries: async (token: string, filters?: any) => {
    const response = await apiClient.get('/time-tracking', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get weekly summary
   */
  getWeeklySummary: async (token: string, weekStart: string) => {
    const response = await apiClient.get('/time-tracking/weekly-summary', {
      params: { weekStart },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get estimated pay
   */
  getEstimatedPay: async (token: string) => {
    const response = await apiClient.get('/time-tracking/estimated-pay', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
