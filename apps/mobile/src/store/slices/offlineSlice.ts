/**
 * Offline Slice
 *
 * Manages offline state, action queueing, and background sync
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { RootState } from '../store';

interface QueuedAction {
  id: string;
  action: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: QueuedAction[];
  syncInProgress: boolean;
  lastSyncTime: string | null;
  syncErrors: Array<{
    actionId: string;
    error: string;
    timestamp: string;
  }>;
}

const initialState: OfflineState = {
  isOnline: true,
  pendingActions: [],
  syncInProgress: false,
  lastSyncTime: null,
  syncErrors: [],
};

// Async thunks
export const initializeNetworkListener = createAsyncThunk(
  'offline/initializeNetworkListener',
  async (_, { dispatch }) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      dispatch(setOnlineStatus(state.isConnected ?? false));

      // Trigger sync when connection restored
      if (state.isConnected) {
        dispatch(syncPendingActions());
      }
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    dispatch(setOnlineStatus(state.isConnected ?? false));

    return unsubscribe;
  },
);

export const syncPendingActions = createAsyncThunk(
  'offline/syncPendingActions',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { pendingActions, isOnline } = state.offline;

    if (!isOnline || pendingActions.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const queuedAction of pendingActions) {
      try {
        // Re-dispatch the queued action
        await dispatch(queuedAction.action);
        dispatch(removeQueuedAction(queuedAction.id));
        synced++;
      } catch (error: any) {
        failed++;

        // Increment retry count
        if (queuedAction.retryCount < queuedAction.maxRetries) {
          dispatch(
            incrementRetryCount({
              actionId: queuedAction.id,
            }),
          );
        } else {
          // Max retries reached, add to error log and remove from queue
          dispatch(
            addSyncError({
              actionId: queuedAction.id,
              error: error.message || 'Unknown error',
              timestamp: new Date().toISOString(),
            }),
          );
          dispatch(removeQueuedAction(queuedAction.id));
        }
      }
    }

    return { synced, failed };
  },
);

// Slice
const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    queueAction: (state, action: PayloadAction<any>) => {
      const queuedAction: QueuedAction = {
        id: Date.now().toString() + Math.random(),
        action: action.payload,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      };
      state.pendingActions.push(queuedAction);
    },
    removeQueuedAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(
        (item) => item.id !== action.payload,
      );
    },
    incrementRetryCount: (
      state,
      action: PayloadAction<{ actionId: string }>,
    ) => {
      const action_ = state.pendingActions.find(
        (item) => item.id === action.payload.actionId,
      );
      if (action_) {
        action_.retryCount++;
      }
    },
    addSyncError: (
      state,
      action: PayloadAction<{
        actionId: string;
        error: string;
        timestamp: string;
      }>,
    ) => {
      state.syncErrors.push(action.payload);
    },
    clearSyncErrors: (state) => {
      state.syncErrors = [];
    },
    clearQueue: (state) => {
      state.pendingActions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncPendingActions.pending, (state) => {
        state.syncInProgress = true;
      })
      .addCase(syncPendingActions.fulfilled, (state) => {
        state.syncInProgress = false;
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(syncPendingActions.rejected, (state) => {
        state.syncInProgress = false;
      });
  },
});

export const {
  setOnlineStatus,
  queueAction,
  removeQueuedAction,
  incrementRetryCount,
  addSyncError,
  clearSyncErrors,
  clearQueue,
} = offlineSlice.actions;

export default offlineSlice.reducer;
