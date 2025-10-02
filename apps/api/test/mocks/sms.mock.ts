export interface SMSMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
}

export class SMSServiceMock {
  private sentMessages: SMSMessage[] = [];
  private fromNumber: string = '+15551234567'; // Mock Twilio number

  async sendSMS(to: string, body: string): Promise<SMSMessage> {
    const sid = `SM${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

    const message: SMSMessage = {
      sid,
      to,
      from: this.fromNumber,
      body,
      status: 'sent',
      timestamp: new Date(),
    };

    this.sentMessages.push(message);

    // Simulate async delivery
    setTimeout(() => {
      const msg = this.sentMessages.find((m) => m.sid === sid);
      if (msg) {
        msg.status = 'delivered';
      }
    }, 100);

    return message;
  }

  async sendBulkSMS(recipients: string[], body: string): Promise<{
    successful: SMSMessage[];
    failed: Array<{ to: string; error: string }>;
  }> {
    const successful: SMSMessage[] = [];
    const failed: Array<{ to: string; error: string }> = [];

    for (const recipient of recipients) {
      try {
        const message = await this.sendSMS(recipient, body);
        successful.push(message);
      } catch (error) {
        failed.push({
          to: recipient,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  async getMessageStatus(sid: string): Promise<SMSMessage | null> {
    return this.sentMessages.find((msg) => msg.sid === sid) || null;
  }

  getSentMessages() {
    return this.sentMessages;
  }

  getMessagesSentTo(recipient: string) {
    return this.sentMessages.filter((msg) => msg.to === recipient);
  }

  getMessagesByStatus(status: SMSMessage['status']) {
    return this.sentMessages.filter((msg) => msg.status === status);
  }

  clearSentMessages() {
    this.sentMessages = [];
  }

  getMessageCount() {
    return this.sentMessages.length;
  }

  // Simulate failed delivery
  simulateFailure(to: string, errorCode: string, errorMessage: string) {
    const sid = `SM${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

    const message: SMSMessage = {
      sid,
      to,
      from: this.fromNumber,
      body: 'Failed message',
      status: 'failed',
      timestamp: new Date(),
      errorCode,
      errorMessage,
    };

    this.sentMessages.push(message);
    return message;
  }
}

export const smsServiceMock = new SMSServiceMock();
