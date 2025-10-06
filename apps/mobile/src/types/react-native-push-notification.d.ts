declare module 'react-native-push-notification' {
  export interface PushNotificationObject {
    id?: string;
    title?: string;
    message: string;
    userInfo?: any;
    playSound?: boolean;
    soundName?: string;
    number?: number;
    repeatType?: string;
    actions?: string[];
    userInteraction?: boolean;
    data?: any;
    channelId?: string;
  }

  export interface ChannelObject {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    playSound?: boolean;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  export interface PushNotificationOptions {
    onRegister?: (token: { os: string; token: string }) => void;
    onNotification?: (notification: PushNotificationObject) => void;
    onAction?: (notification: PushNotificationObject) => void;
    onRegistrationError?: (error: any) => void;
    permissions?: {
      alert?: boolean;
      badge?: boolean;
      sound?: boolean;
    };
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  const PushNotification: {
    configure(options: PushNotificationOptions): void;
    localNotification(notification: PushNotificationObject): void;
    createChannel(
      channel: ChannelObject,
      callback?: (created: boolean) => void,
    ): void;
    cancelAllLocalNotifications(): void;
    getApplicationIconBadgeNumber(callback: (count: number) => void): void;
    setApplicationIconBadgeNumber(count: number): void;
  };

  export default PushNotification;
}
