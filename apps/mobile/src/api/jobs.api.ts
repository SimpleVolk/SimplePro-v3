/**
 * Jobs API
 *
 * Endpoints for job management, check-in/out, and status updates
 */

import apiClient from './client';

export const jobsApi = {
  /**
   * Get all jobs for crew member
   */
  getJobs: async (token: string, filters?: any) => {
    const response = await apiClient.get('/jobs', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get job by ID
   */
  getJobById: async (token: string, jobId: string) => {
    const response = await apiClient.get(`/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Check in to job with GPS location
   */
  checkIn: async (
    token: string,
    data: {
      jobId: string;
      location: { latitude: number; longitude: number };
      timestamp: string;
    }
  ) => {
    const response = await apiClient.post(`/jobs/${data.jobId}/check-in`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Check out from job
   */
  checkOut: async (
    token: string,
    data: {
      jobId: string;
      timestamp: string;
      notes?: string;
    }
  ) => {
    const response = await apiClient.post(`/jobs/${data.jobId}/check-out`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Update job status
   */
  updateJobStatus: async (token: string, jobId: string, status: string) => {
    const response = await apiClient.patch(
      `/jobs/${jobId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Add job notes
   */
  addJobNotes: async (token: string, jobId: string, notes: string) => {
    const response = await apiClient.post(
      `/jobs/${jobId}/notes`,
      { notes },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Update item status (loaded/delivered)
   */
  updateItemStatus: async (
    token: string,
    jobId: string,
    itemId: string,
    status: string
  ) => {
    const response = await apiClient.patch(
      `/jobs/${jobId}/items/${itemId}`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};
