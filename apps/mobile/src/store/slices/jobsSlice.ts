/**
 * Jobs Slice
 *
 * Manages job listings, details, check-in/out, and status updates
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { jobsApi } from '../../api/jobs.api';
import { queueAction } from './offlineSlice';
import { RootState } from '../store';

interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

interface Job {
  jobId: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  serviceType: string;
  status: string;
  priority: string;
  scheduledDate: string;
  estimatedStartTime: string;
  estimatedEndTime: string;
  pickupLocation: Location;
  deliveryLocation: Location;
  crewAssigned: string[];
  crewLeadId?: string;
  totalCost: number;
  estimatedHours: number;
  specialInstructions?: string;
  items: any[];
}

interface CheckInData {
  jobId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

interface CheckOutData {
  jobId: string;
  timestamp: string;
  notes?: string;
}

interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  loading: boolean;
  error: string | null;
  checkInStatus: {
    [jobId: string]: {
      checkedIn: boolean;
      checkInTime: string | null;
      location: { latitude: number; longitude: number } | null;
    };
  };
}

const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  loading: false,
  error: null,
  checkInStatus: {},
};

// Async thunks
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (_, { getState }: any) => {
    const { auth } = getState();
    return await jobsApi.getJobs(auth.accessToken);
  },
);

export const fetchJobDetails = createAsyncThunk(
  'jobs/fetchJobDetails',
  async (jobId: string, { getState }: any) => {
    const { auth } = getState();
    return await jobsApi.getJobById(auth.accessToken, jobId);
  },
);

export const checkInToJob = createAsyncThunk(
  'jobs/checkIn',
  async (data: CheckInData, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(checkInToJob(data)));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await jobsApi.checkIn(auth.accessToken, data);
  },
);

export const checkOutFromJob = createAsyncThunk(
  'jobs/checkOut',
  async (data: CheckOutData, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(checkOutFromJob(data)));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await jobsApi.checkOut(auth.accessToken, data);
  },
);

export const updateJobStatus = createAsyncThunk(
  'jobs/updateStatus',
  async (
    { jobId, status }: { jobId: string; status: string },
    { getState, dispatch }: any,
  ) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(updateJobStatus({ jobId, status })));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await jobsApi.updateJobStatus(auth.accessToken, jobId, status);
  },
);

// Slice
const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
    updateJobLocally: (state, action: PayloadAction<Job>) => {
      const index = state.jobs.findIndex(
        (job) => job.jobId === action.payload.jobId,
      );
      if (index !== -1) {
        state.jobs[index] = action.payload;
      }
      if (state.currentJob?.jobId === action.payload.jobId) {
        state.currentJob = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch jobs
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.jobs = action.payload;
        state.loading = false;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch jobs';
      })
      // Fetch job details
      .addCase(fetchJobDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchJobDetails.fulfilled, (state, action) => {
        state.currentJob = action.payload;
        state.loading = false;
      })
      .addCase(fetchJobDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch job details';
      })
      // Check in
      .addCase(checkInToJob.fulfilled, (state, action) => {
        const { jobId } = action.meta.arg;
        state.checkInStatus[jobId] = {
          checkedIn: true,
          checkInTime: action.meta.arg.timestamp,
          location: action.meta.arg.location,
        };
      })
      // Check out
      .addCase(checkOutFromJob.fulfilled, (state, action) => {
        const { jobId } = action.meta.arg;
        if (state.checkInStatus[jobId]) {
          state.checkInStatus[jobId].checkedIn = false;
        }
      })
      // Update status
      .addCase(updateJobStatus.fulfilled, (state, action) => {
        const jobId = action.meta.arg.jobId;
        const newStatus = action.meta.arg.status;

        // Update in jobs list
        const jobIndex = state.jobs.findIndex((job) => job.jobId === jobId);
        if (jobIndex !== -1) {
          state.jobs[jobIndex].status = newStatus;
        }

        // Update current job
        if (state.currentJob?.jobId === jobId) {
          state.currentJob.status = newStatus;
        }
      });
  },
});

export const { clearCurrentJob, updateJobLocally } = jobsSlice.actions;
export default jobsSlice.reducer;
