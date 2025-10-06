/**
 * Time Tracking Slice
 *
 * Manages time tracking for jobs, breaks, and payroll calculations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { timeTrackingApi } from '../../api/timeTracking.api';
import { queueAction } from './offlineSlice';
import { RootState } from '../store';

interface TimeEntry {
  entryId: string;
  jobId: string;
  userId: string;
  clockInTime: string;
  clockOutTime?: string;
  breakDuration: number;
  totalHours?: number;
  status: 'active' | 'completed';
}

interface TimeTrackingState {
  entries: TimeEntry[];
  activeEntry: TimeEntry | null;
  dailyTotal: number;
  weeklyTotal: number;
  estimatedPay: number;
  loading: boolean;
  error: string | null;
}

const initialState: TimeTrackingState = {
  entries: [],
  activeEntry: null,
  dailyTotal: 0,
  weeklyTotal: 0,
  estimatedPay: 0,
  loading: false,
  error: null,
};

// Async thunks
export const clockIn = createAsyncThunk(
  'timeTracking/clockIn',
  async (jobId: string, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    if (!state.offline.isOnline) {
      dispatch(queueAction(clockIn(jobId)));
      throw new Error('Offline - action queued');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await timeTrackingApi.clockIn(auth.accessToken, jobId);
  },
);

export const clockOut = createAsyncThunk(
  'timeTracking/clockOut',
  async (entryId: string, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    if (!state.offline.isOnline) {
      dispatch(queueAction(clockOut(entryId)));
      throw new Error('Offline - action queued');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await timeTrackingApi.clockOut(auth.accessToken, entryId);
  },
);

export const addBreak = createAsyncThunk(
  'timeTracking/addBreak',
  async (
    { entryId, duration }: { entryId: string; duration: number },
    { getState }: any,
  ) => {
    const { auth } = getState();
    return await timeTrackingApi.addBreak(auth.accessToken, entryId, duration);
  },
);

export const fetchTimeEntries = createAsyncThunk(
  'timeTracking/fetchEntries',
  async (_, { getState }: any) => {
    const { auth } = getState();
    return await timeTrackingApi.getTimeEntries(auth.accessToken);
  },
);

// Slice
const timeTrackingSlice = createSlice({
  name: 'timeTracking',
  initialState,
  reducers: {
    updateDailyTotal: (state, action: PayloadAction<number>) => {
      state.dailyTotal = action.payload;
    },
    updateWeeklyTotal: (state, action: PayloadAction<number>) => {
      state.weeklyTotal = action.payload;
    },
    updateEstimatedPay: (state, action: PayloadAction<number>) => {
      state.estimatedPay = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(clockIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clockIn.fulfilled, (state, action) => {
        state.activeEntry = action.payload;
        state.entries.push(action.payload);
        state.loading = false;
      })
      .addCase(clockIn.rejected, (state, action) => {
        state.loading = false;
        if (!action.error.message?.includes('queued')) {
          state.error = action.error.message || 'Failed to clock in';
        }
      })
      .addCase(clockOut.fulfilled, (state, action) => {
        state.activeEntry = null;
        const index = state.entries.findIndex(
          (e) => e.entryId === action.payload.entryId,
        );
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(addBreak.fulfilled, (state, action) => {
        const index = state.entries.findIndex(
          (e) => e.entryId === action.payload.entryId,
        );
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(fetchTimeEntries.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.activeEntry =
          action.payload.find((e: TimeEntry) => e.status === 'active') || null;
      });
  },
});

export const { updateDailyTotal, updateWeeklyTotal, updateEstimatedPay } =
  timeTrackingSlice.actions;

export default timeTrackingSlice.reducer;
