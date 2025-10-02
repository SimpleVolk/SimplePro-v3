/**
 * SimplePro Mobile Crew App
 *
 * Production-ready React Native application with:
 * - Offline-first architecture with Redux Persist
 * - GPS check-in/check-out with location verification
 * - Photo capture and signature with offline queueing
 * - Real-time WebSocket updates
 * - Push notifications
 * - Background sync when connection restored
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store/store';
import { AppNavigator } from '../navigation/AppNavigator';
import { initializeNetworkListener } from '../store/slices/offlineSlice';
import WebSocketService from '../services/websocket.service';
import NotificationService from '../services/notification.service';
import { useAppSelector } from '../store/hooks';

const AppContent = () => {
  const { isAuthenticated, accessToken } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Initialize network listener for offline detection
    store.dispatch(initializeNetworkListener());

    // Configure push notifications
    NotificationService.configure();
    NotificationService.requestPermissions();

    return () => {
      // Cleanup on unmount
      WebSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    // Connect WebSocket when authenticated
    if (isAuthenticated && accessToken) {
      WebSocketService.connect(accessToken);
    } else {
      WebSocketService.disconnect();
    }
  }, [isAuthenticated, accessToken]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <AppNavigator />
    </>
  );
};

export const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
};

export default App;