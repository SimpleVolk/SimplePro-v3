import { faker } from '@faker-js/faker';

/**
 * Seed notifications for various events
 */
export async function seedNotifications(
  NotificationModel: any,
  users: any[],
  jobs: any[]
): Promise<number> {
  let totalNotifications = 0;

  const notificationTypes = [
    'job_assigned',
    'shift_reminder',
    'customer_inquiry',
    'quote_request',
    'job_completed',
    'payment_received',
    'system_alert',
    'message_received',
    'time_off_approved',
    'time_off_denied',
    'schedule_change',
    'document_uploaded',
  ];

  // Create 3-8 notifications per user
  for (const user of users) {
    const notificationCount = faker.number.int({ min: 3, max: 8 });

    for (let i = 0; i < notificationCount; i++) {
      const type = faker.helpers.arrayElement(notificationTypes);
      const priority = faker.helpers.weightedArrayElement([
        { value: 'low', weight: 1 },
        { value: 'normal', weight: 6 },
        { value: 'high', weight: 2 },
        { value: 'urgent', weight: 1 },
      ]);

      // Determine related entity
      let relatedEntityType: string | undefined;
      let relatedEntityId: any | undefined;

      if (type.includes('job') || type === 'shift_reminder' || type === 'schedule_change') {
        relatedEntityType = 'job';
        relatedEntityId = jobs.length > 0 ? faker.helpers.arrayElement(jobs)._id : undefined;
      } else if (type.includes('customer')) {
        relatedEntityType = 'customer';
      } else if (type === 'message_received') {
        relatedEntityType = 'message';
      }

      // Generate notification content based on type
      let title: string;
      let message: string;

      switch (type) {
        case 'job_assigned':
          title = 'New Job Assignment';
          message = `You have been assigned to job #${faker.string.alphanumeric(6).toUpperCase()}`;
          break;
        case 'shift_reminder':
          title = 'Shift Reminder';
          message = 'Your shift starts in 2 hours';
          break;
        case 'customer_inquiry':
          title = 'New Customer Inquiry';
          message = 'A customer has submitted a new inquiry';
          break;
        case 'quote_request':
          title = 'Quote Request';
          message = 'New quote request requires your attention';
          break;
        case 'job_completed':
          title = 'Job Completed';
          message = 'Job has been successfully completed';
          break;
        case 'payment_received':
          title = 'Payment Received';
          message = `Payment of $${faker.number.int({ min: 500, max: 3000 })} received`;
          break;
        case 'system_alert':
          title = 'System Alert';
          message = faker.helpers.arrayElement([
            'System maintenance scheduled for tonight',
            'New features available',
            'Your password will expire in 7 days',
          ]);
          break;
        case 'message_received':
          title = 'New Message';
          message = `${faker.person.firstName()} sent you a message`;
          break;
        case 'time_off_approved':
          title = 'Time Off Approved';
          message = 'Your time off request has been approved';
          break;
        case 'time_off_denied':
          title = 'Time Off Denied';
          message = 'Your time off request has been denied';
          break;
        case 'schedule_change':
          title = 'Schedule Change';
          message = 'Your schedule has been updated';
          break;
        case 'document_uploaded':
          title = 'Document Uploaded';
          message = 'A new document has been uploaded';
          break;
        default:
          title = 'Notification';
          message = 'You have a new notification';
      }

      // Determine delivery channels based on priority and type
      const deliveryChannels = {
        inApp: true,
        email: priority === 'high' || priority === 'urgent' || type.includes('job'),
        sms: priority === 'urgent' || type === 'shift_reminder',
        push: priority !== 'low',
      };

      // Delivery status (simulate some sent notifications)
      const deliveryStatus: any = {};
      const notificationDate = faker.date.recent({ days: 14 });

      if (deliveryChannels.inApp) {
        deliveryStatus.inApp = {
          sent: true,
          sentAt: notificationDate,
        };
      }

      if (deliveryChannels.email) {
        deliveryStatus.email = {
          sent: faker.datatype.boolean(0.9),
          sentAt: faker.datatype.boolean(0.9) ? notificationDate : undefined,
          error: faker.datatype.boolean(0.1) ? 'SMTP connection failed' : undefined,
        };
      }

      if (deliveryChannels.sms) {
        deliveryStatus.sms = {
          sent: faker.datatype.boolean(0.85),
          sentAt: faker.datatype.boolean(0.85) ? notificationDate : undefined,
          error: faker.datatype.boolean(0.15) ? 'Invalid phone number' : undefined,
        };
      }

      if (deliveryChannels.push) {
        deliveryStatus.push = {
          sent: faker.datatype.boolean(0.95),
          sentAt: faker.datatype.boolean(0.95) ? notificationDate : undefined,
          error: faker.datatype.boolean(0.05) ? 'Invalid FCM token' : undefined,
        };
      }

      // Determine if notification has been read
      const isRead = faker.datatype.boolean(0.6);
      const readAt = isRead
        ? new Date(notificationDate.getTime() + faker.number.int({ min: 300000, max: 86400000 }))
        : undefined;

      await NotificationModel.create({
        recipientId: user._id,
        title,
        message,
        type,
        priority,
        relatedEntityType,
        relatedEntityId,
        actionData: relatedEntityType
          ? {
              type: 'navigate',
              route: `/${relatedEntityType}s/${relatedEntityId}`,
            }
          : undefined,
        deliveryChannels,
        deliveryStatus,
        isRead,
        readAt,
        isArchived: faker.datatype.boolean(0.2),
        archivedAt: faker.datatype.boolean(0.2) ? faker.date.recent({ days: 7 }) : undefined,
        metadata: {},
      });

      totalNotifications++;
    }
  }

  return totalNotifications;
}
