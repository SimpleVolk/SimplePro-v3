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
import { JobDetailScreen } from '../screens/jobs/JobDetailScreen';
import { CheckInScreen } from '../screens/jobs/CheckInScreen';
import { PhotoCaptureScreen } from '../screens/jobs/PhotoCaptureScreen';
import { SignatureCaptureScreen } from '../screens/jobs/SignatureCaptureScreen';
import { InventoryChecklistScreen } from '../screens/jobs/InventoryChecklistScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';

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
              name="Messages"
              component={MessagesScreen}
              options={{ title: 'Messages' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="JobDetails"
              component={JobDetailScreen}
              options={{ title: 'Job Details' }}
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
            <Stack.Screen
              name="InventoryChecklist"
              component={InventoryChecklistScreen}
              options={{ title: 'Inventory Checklist' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{
                title: 'Change Password',
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
