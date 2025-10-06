/**
 * Shifts Slice
 *
 * Manages crew member schedules and shift assignments
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { shiftsApi } from '../../api/shifts.api';

interface Shift {
  shiftId: string;
  crewMemberId: string;
  jobId: string;
  jobNumber: string;
  customerName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  role: string;
  location: string;
}

interface ShiftsState {
  shifts: Shift[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
}

const initialState: ShiftsState = {
  shifts: [],
  loading: false,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
};

// Async thunks
export const fetchShifts = createAsyncThunk(
  'shifts/fetchShifts',
  async (_, { getState }: any) => {
    const { auth } = getState();
    return await shiftsApi.getShifts(auth.accessToken);
  },
);

export const fetchShiftsByDate = createAsyncThunk(
  'shifts/fetchShiftsByDate',
  async (date: string, { getState }: any) => {
    const { auth } = getState();
    return await shiftsApi.getShiftsByDate(auth.accessToken, date);
  },
);

// Slice
const shiftsSlice = createSlice({
  name: 'shifts',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShifts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShifts.fulfilled, (state, action) => {
        state.shifts = action.payload;
        state.loading = false;
      })
      .addCase(fetchShifts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch shifts';
      })
      .addCase(fetchShiftsByDate.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchShiftsByDate.fulfilled, (state, action) => {
        state.shifts = action.payload;
        state.loading = false;
      })
      .addCase(fetchShiftsByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch shifts';
      });
  },
});

export const { setSelectedDate } = shiftsSlice.actions;
export default shiftsSlice.reducer;
