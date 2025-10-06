export class EmailServiceMock {
  private sentEmails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    timestamp: Date;
    messageId: string;
  }> = [];

  async sendEmail(
    to: string,
    subject: string,
    html?: string,
    text?: string,
  ): Promise<{
    messageId: string;
    accepted: string[];
    rejected: string[];
  }> {
    const messageId = `mock_email_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.sentEmails.push({
      to,
      subject,
      html,
      text,
      timestamp: new Date(),
      messageId,
    });

    // Simulate successful email delivery
    return {
      messageId,
      accepted: [to],
      rejected: [],
    };
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html?: string,
    text?: string,
  ): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const recipient of recipients) {
      try {
        await this.sendEmail(recipient, subject, html, text);
        successful.push(recipient);
      } catch (error) {
        failed.push(recipient);
      }
    }

    return { successful, failed };
  }

  getSentEmails() {
    return this.sentEmails;
  }

  getEmailsSentTo(recipient: string) {
    return this.sentEmails.filter((email) => email.to === recipient);
  }

  getEmailsBySubject(subject: string) {
    return this.sentEmails.filter((email) => email.subject.includes(subject));
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  getEmailCount() {
    return this.sentEmails.length;
  }
}

export const emailServiceMock = new EmailServiceMock();
