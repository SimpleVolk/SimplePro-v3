/**
 * Redux Store Configuration with Offline Persistence
 *
 * Features:
 * - Redux Toolkit for state management
 * - Redux Persist for offline storage
 * - Middleware for action queueing when offline
 * - Auto-rehydration on app startup
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import jobsReducer from './slices/jobsSlice';
import shiftsReducer from './slices/shiftsSlice';
import offlineReducer from './slices/offlineSlice';
import notificationsReducer from './slices/notificationsSlice';
import documentsReducer from './slices/documentsSlice';
import timeTrackingReducer from './slices/timeTrackingSlice';
import inventoryReducer from './slices/inventorySlice';
import messagesReducer from './slices/messagesSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'jobs', 'shifts', 'offline', 'timeTracking', 'inventory', 'messages'], // Only persist these reducers
  blacklist: ['notifications'], // Don't persist notifications
};

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  jobs: jobsReducer,
  shifts: shiftsReducer,
  offline: offlineReducer,
  notifications: notificationsReducer,
  documents: documentsReducer,
  timeTracking: timeTrackingReducer,
  inventory: inventoryReducer,
  messages: messagesReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
