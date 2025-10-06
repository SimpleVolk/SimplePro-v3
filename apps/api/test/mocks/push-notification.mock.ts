export interface PushNotification {
  messageId: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp: Date;
  platform: 'ios' | 'android';
  failureReason?: string;
}

export class PushNotificationServiceMock {
  private sentNotifications: PushNotification[] = [];
  private deviceTokens: Map<string, { userId: string; platform: 'ios' | 'android' }> = new Map();

  registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android') {
    this.deviceTokens.set(token, { userId, platform });
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<PushNotification> {
    const messageId = `fcm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const deviceInfo = this.deviceTokens.get(token);
    if (!deviceInfo) {
      throw new Error('Invalid device token');
    }

    const notification: PushNotification = {
      messageId,
      token,
      title,
      body,
      data,
      status: 'sent',
      timestamp: new Date(),
      platform: deviceInfo.platform,
    };

    this.sentNotifications.push(notification);

    // Simulate async delivery
    setTimeout(() => {
      const notif = this.sentNotifications.find((n) => n.messageId === messageId);
      if (notif) {
        notif.status = 'delivered';
      }
    }, 50);

    return notification;
  }

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<PushNotification[]> {
    const userTokens = Array.from(this.deviceTokens.entries())
      .filter(([_, info]) => info.userId === userId)
      .map(([token]) => token);

    const notifications: PushNotification[] = [];

    for (const token of userTokens) {
      try {
        const notification = await this.sendPushNotification(token, title, body, data);
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send push notification to token ${token}:`, error);
      }
    }

    return notifications;
  }

  async sendBulkPush(
    recipients: Array<{ token: string; title: string; body: string; data?: Record<string, any> }>
  ): Promise<{
    successful: PushNotification[];
    failed: Array<{ token: string; error: string }>;
  }> {
    const successful: PushNotification[] = [];
    const failed: Array<{ token: string; error: string }> = [];

    for (const recipient of recipients) {
      try {
        const notification = await this.sendPushNotification(
          recipient.token,
          recipient.title,
          recipient.body,
          recipient.data
        );
        successful.push(notification);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({
          token: recipient.token,
          error: errorMessage || 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  async getNotificationStatus(messageId: string): Promise<PushNotification | null> {
    return this.sentNotifications.find((n) => n.messageId === messageId) || null;
  }

  getSentNotifications() {
    return this.sentNotifications;
  }

  getNotificationsSentToToken(token: string) {
    return this.sentNotifications.filter((n) => n.token === token);
  }

  getNotificationsSentToUser(userId: string) {
    const userTokens = Array.from(this.deviceTokens.entries())
      .filter(([_, info]) => info.userId === userId)
      .map(([token]) => token);

    return this.sentNotifications.filter((n) => userTokens.includes(n.token));
  }

  getNotificationsByStatus(status: PushNotification['status']) {
    return this.sentNotifications.filter((n) => n.status === status);
  }

  clearSentNotifications() {
    this.sentNotifications = [];
  }

  clearDeviceTokens() {
    this.deviceTokens.clear();
  }

  getNotificationCount() {
    return this.sentNotifications.length;
  }

  // Simulate failed delivery
  simulateFailure(token: string, failureReason: string) {
    const messageId = `fcm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const deviceInfo = this.deviceTokens.get(token);

    const notification: PushNotification = {
      messageId,
      token,
      title: 'Failed notification',
      body: 'This notification failed to deliver',
      status: 'failed',
      timestamp: new Date(),
      platform: deviceInfo?.platform || 'android',
      failureReason,
    };

    this.sentNotifications.push(notification);
    return notification;
  }
}

export const pushNotificationServiceMock = new PushNotificationServiceMock();
