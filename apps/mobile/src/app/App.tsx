import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { JobProvider } from './contexts/JobContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import ChecklistScreen from './screens/ChecklistScreen';
import SignatureScreen from './screens/SignatureScreen';
import PhotoScreen from './screens/PhotoScreen';
import OfflineScreen from './screens/OfflineScreen';
import { useAuth } from './hooks/useAuth';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { darkTheme } from '../theme/colors';

const Stack = createStackNavigator();

const AuthenticatedNavigator = () => {
  const { isOnline } = useNetworkStatus();

  if (!isOnline) {
    return <OfflineScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: darkTheme.primary,
        },
        headerTintColor: darkTheme.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'SimplePro Crew' }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: 'Job Details' }}
      />
      <Stack.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{ title: 'Job Checklist' }}
      />
      <Stack.Screen
        name="Signature"
        component={SignatureScreen}
        options={{ title: 'Customer Signature' }}
      />
      <Stack.Screen
        name="Photo"
        component={PhotoScreen}
        options={{ title: 'Photo Capture' }}
      />
    </Stack.Navigator>
  );
};

const UnauthenticatedNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show loading screen
  }

  return isAuthenticated ? <AuthenticatedNavigator /> : <UnauthenticatedNavigator />;
};

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <JobProvider>
          <NavigationContainer>
            <StatusBar
              barStyle="light-content"
              backgroundColor={darkTheme.primary}
            />
            <AppNavigator />
          </NavigationContainer>
        </JobProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;