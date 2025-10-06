/**
 * Notification Service
 *
 * Configure push notifications for job updates and messages
 */

import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

class NotificationService {
  /**
   * Configure push notifications on app startup
   */
  configure() {
    PushNotification.configure({
      // Called when a notification is received
      onNotification: function (notification: any) {
        console.log('Notification received:', notification);

        // Handle notification tap
        if (notification.userInteraction) {
          // User tapped notification
          handleNotificationTap(notification);
        }
      },

      // Android-specific options
      requestPermissions: Platform.OS === 'ios',
      popInitialNotification: true,
    });

    this.createChannels();
  }

  /**
   * Create notification channels (Android)
   */
  private createChannels() {
    PushNotification.createChannel(
      {
        channelId: 'job-updates',
        channelName: 'Job Updates',
        channelDescription: 'Notifications for job assignments and updates',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created: boolean) => console.log(`Channel 'job-updates' created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'messages',
        channelName: 'Messages',
        channelDescription: 'Messages from dispatcher',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created: boolean) => console.log(`Channel 'messages' created: ${created}`)
    );
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      // Android 13+ requires runtime permission
      if (Platform.Version >= 33) {
        const { PermissionsAndroid } = require('react-native');
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        } catch (error) {
          console.error('Failed to request notification permission:', error);
        }
      }
    }
  }

  /**
   * Show local notification
   */
  showNotification({
    title,
    message,
    channelId = 'job-updates',
    data = {},
  }: {
    title: string;
    message: string;
    channelId?: string;
    data?: any;
  }) {
    PushNotification.localNotification({
      channelId,
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  /**
   * Cancel all notifications
   */
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Get notification badge count (iOS)
   */
  getBadgeCount(callback: (count: number) => void) {
    if (Platform.OS === 'ios') {
      PushNotification.getApplicationIconBadgeNumber(callback);
    }
  }

  /**
   * Set notification badge count (iOS)
   */
  setBadgeCount(count: number) {
    if (Platform.OS === 'ios') {
      PushNotification.setApplicationIconBadgeNumber(count);
    }
  }
}

/**
 * Handle notification tap - navigate to relevant screen
 */
function handleNotificationTap(notification: any) {
  const { data } = notification;

  if (data && data.jobId) {
    // Navigate to job details
    // This requires navigation ref to be set up in App.tsx
    console.log('Navigate to job:', data.jobId);
  }
}

export default new NotificationService();
