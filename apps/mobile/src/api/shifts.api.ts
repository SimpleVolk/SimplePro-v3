/**
 * Shifts API
 *
 * Endpoints for crew schedule management
 */

import apiClient from './client';

export const shiftsApi = {
  /**
   * Get all shifts for crew member
   */
  getShifts: async (token: string) => {
    const response = await apiClient.get('/shifts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get shifts by date
   */
  getShiftsByDate: async (token: string, date: string) => {
    const response = await apiClient.get('/shifts', {
      params: { date },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get shift details
   */
  getShiftById: async (token: string, shiftId: string) => {
    const response = await apiClient.get(`/shifts/${shiftId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Update availability
   */
  updateAvailability: async (
    token: string,
    availability: {
      date: string;
      available: boolean;
      notes?: string;
    }
  ) => {
    const response = await apiClient.post('/shifts/availability', availability, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
