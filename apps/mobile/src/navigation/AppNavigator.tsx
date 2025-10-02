/**
 * App Navigator
 *
 * Main navigation structure for the mobile app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ScheduleScreen } from '../screens/schedule/ScheduleScreen';
import { CheckInScreen } from '../screens/jobs/CheckInScreen';
import { PhotoCaptureScreen } from '../screens/jobs/PhotoCaptureScreen';
import { SignatureCaptureScreen } from '../screens/jobs/SignatureCaptureScreen';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2a2a2a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Schedule"
              component={ScheduleScreen}
              options={{ title: 'My Schedule' }}
            />
            <Stack.Screen
              name="CheckIn"
              component={CheckInScreen}
              options={{ title: 'Check In' }}
            />
            <Stack.Screen
              name="PhotoCapture"
              component={PhotoCaptureScreen}
              options={{ title: 'Capture Photos' }}
            />
            <Stack.Screen
              name="SignatureCapture"
              component={SignatureCaptureScreen}
              options={{ title: 'Customer Signature' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
