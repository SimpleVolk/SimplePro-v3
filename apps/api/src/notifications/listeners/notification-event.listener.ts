import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('job.assigned')
  async handleJobAssigned(payload: {
    jobId: string;
    jobNumber: string;
    crewMemberId: string;
    crewName: string;
    jobDate: Date;
    jobAddress: string;
    customerName: string;
    assignedBy: string;
  }) {
    this.logger.log(`Job assigned event received for job ${payload.jobId}`);

    await this.notificationsService.createNotification({
      recipientId: payload.crewMemberId,
      type: 'job_assigned',
      data: {
        jobId: payload.jobId,
        jobNumber: payload.jobNumber,
        crewName: payload.crewName,
        jobDate: payload.jobDate,
        jobAddress: payload.jobAddress,
        customerName: payload.customerName,
        assignedBy: payload.assignedBy,
      },
      priority: 'high',
      relatedEntityType: 'job',
      relatedEntityId: payload.jobId,
      actionData: {
        type: 'navigate',
        route: `/jobs/${payload.jobId}`,
      },
    });
  }

  @OnEvent('shift.reminder')
  async handleShiftReminder(payload: {
    employeeId: string;
    employeeName: string;
    shiftStart: Date;
    shiftLocation: string;
    shiftDuration: number;
    reminderMinutes: number;
  }) {
    this.logger.log(
      `Shift reminder event received for employee ${payload.employeeId}`,
    );

    await this.notificationsService.createNotification({
      recipientId: payload.employeeId,
      type: 'shift_reminder',
      data: {
        employeeName: payload.employeeName,
        shiftStart: payload.shiftStart,
        shiftLocation: payload.shiftLocation,
        shiftDuration: payload.shiftDuration,
        reminderMinutes: payload.reminderMinutes,
      },
      priority: 'high',
    });
  }

  @OnEvent('customer.inquiry')
  async handleCustomerInquiry(payload: {
    salesRepId: string;
    customerName: string;
    customerId: string;
    customerPhone: string;
    customerEmail: string;
    inquiryType: string;
    inquiryMessage: string;
  }) {
    this.logger.log(
      `Customer inquiry event received for customer ${payload.customerId}`,
    );

    await this.notificationsService.createNotification({
      recipientId: payload.salesRepId,
      type: 'customer_inquiry',
      data: {
        customerName: payload.customerName,
        customerId: payload.customerId,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        inquiryType: payload.inquiryType,
        inquiryMessage: payload.inquiryMessage,
      },
      relatedEntityType: 'customer',
      relatedEntityId: payload.customerId,
      actionData: {
        type: 'navigate',
        route: `/customers/${payload.customerId}`,
      },
    });
  }

  @OnEvent('estimate.sent')
  async handleEstimateSent(payload: {
    estimateId: string;
    customerId: string;
    customerName: string;
    salesRepId: string;
    serviceType: string;
    moveDate: Date;
    originAddress: string;
    destinationAddress: string;
  }) {
    this.logger.log(
      `Estimate sent event received for estimate ${payload.estimateId}`,
    );

    await this.notificationsService.createNotification({
      recipientId: payload.salesRepId,
      type: 'quote_request',
      data: {
        estimateId: payload.estimateId,
        customerId: payload.customerId,
        customerName: payload.customerName,
        serviceType: payload.serviceType,
        moveDate: payload.moveDate,
        originAddress: payload.originAddress,
        destinationAddress: payload.destinationAddress,
      },
      relatedEntityType: 'estimate',
      relatedEntityId: payload.estimateId,
      actionData: {
        type: 'navigate',
        route: `/estimates/${payload.estimateId}`,
      },
    });
  }

  @OnEvent('job.completed')
  async handleJobCompleted(payload: {
    jobId: string;
    jobNumber: string;
    customerId: string;
    customerName: string;
    supervisorId: string;
    completionTime: Date;
    jobDuration: number;
  }) {
    this.logger.log(`Job completed event received for job ${payload.jobId}`);

    await this.notificationsService.createNotification({
      recipientId: payload.supervisorId,
      type: 'job_completed',
      data: {
        jobId: payload.jobId,
        jobNumber: payload.jobNumber,
        customerName: payload.customerName,
        completionTime: payload.completionTime,
        jobDuration: payload.jobDuration,
      },
      relatedEntityType: 'job',
      relatedEntityId: payload.jobId,
      actionData: {
        type: 'navigate',
        route: `/jobs/${payload.jobId}`,
      },
    });
  }

  @OnEvent('payment.received')
  async handlePaymentReceived(payload: {
    jobId: string;
    jobNumber: string;
    accountingId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
  }) {
    this.logger.log(`Payment received event for job ${payload.jobId}`);

    await this.notificationsService.createNotification({
      recipientId: payload.accountingId,
      type: 'payment_received',
      data: {
        jobId: payload.jobId,
        jobNumber: payload.jobNumber,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        paymentDate: payload.paymentDate,
      },
      relatedEntityType: 'job',
      relatedEntityId: payload.jobId,
    });
  }

  @OnEvent('system.alert')
  async handleSystemAlert(payload: {
    recipientIds: string[];
    alertType: string;
    alertMessage: string;
    alertTime: Date;
  }) {
    this.logger.log(`System alert event: ${payload.alertType}`);

    // Send to all specified recipients
    const notifications = payload.recipientIds.map((recipientId) =>
      this.notificationsService.createNotification({
        recipientId,
        type: 'system_alert',
        data: {
          alertType: payload.alertType,
          alertMessage: payload.alertMessage,
          alertTime: payload.alertTime,
        },
        priority: 'high',
      }),
    );

    await Promise.all(notifications);
  }

  @OnEvent('message.received')
  async handleMessageReceived(payload: {
    recipientId: string;
    senderId: string;
    senderName: string;
    messageContent: string;
    messageId: string;
  }) {
    this.logger.log(
      `Message received event for recipient ${payload.recipientId}`,
    );

    await this.notificationsService.createNotification({
      recipientId: payload.recipientId,
      type: 'message_received',
      data: {
        senderId: payload.senderId,
        senderName: payload.senderName,
        messageContent: payload.messageContent,
      },
      relatedEntityType: 'message',
      relatedEntityId: payload.messageId,
      actionData: {
        type: 'navigate',
        route: `/messages/${payload.messageId}`,
      },
    });
  }

  @OnEvent('timeoff.approved')
  async handleTimeOffApproved(payload: {
    employeeId: string;
    employeeName: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    approverName: string;
    requestId: string;
  }) {
    this.logger.log(
      `Time off approved event for employee ${payload.employeeId}`,
    );

    await this.notificationsService.createNotification({
      recipientId: payload.employeeId,
      type: 'time_off_approved',
      data: {
        employeeName: payload.employeeName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        reason: payload.reason,
        approverName: payload.approverName,
      },
      relatedEntityType: 'time_off',
      relatedEntityId: payload.requestId,
    });
  }

  @OnEvent('timeoff.denied')
  async handleTimeOffDenied(payload: {
    employeeId: string;
    employeeName: string;
    startDate: Date;
    endDate: Date;
    denialReason: string;
    approverName: string;
    requestId: string;
  }) {
    this.logger.log(`Time off denied event for employee ${payload.employeeId}`);

    await this.notificationsService.createNotification({
      recipientId: payload.employeeId,
      type: 'time_off_denied',
      data: {
        employeeName: payload.employeeName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        denialReason: payload.denialReason,
        approverName: payload.approverName,
      },
      relatedEntityType: 'time_off',
      relatedEntityId: payload.requestId,
    });
  }

  @OnEvent('schedule.changed')
  async handleScheduleChanged(payload: {
    employeeId: string;
    employeeName: string;
    scheduleDate: Date;
    newTime: string;
    location: string;
    changeNotes: string;
  }) {
    this.logger.log(
      `Schedule changed event for employee ${payload.employeeId}`,
    );

    await this.notificationsService.createNotification({
      recipientId: payload.employeeId,
      type: 'schedule_change',
      data: {
        employeeName: payload.employeeName,
        scheduleDate: payload.scheduleDate,
        newTime: payload.newTime,
        location: payload.location,
        changeNotes: payload.changeNotes,
      },
      priority: 'high',
    });
  }

  @OnEvent('document.uploaded')
  async handleDocumentUploaded(payload: {
    recipientId: string;
    documentName: string;
    documentType: string;
    uploaderId: string;
    uploaderName: string;
    uploadDate: Date;
    documentId: string;
  }) {
    this.logger.log(`Document uploaded event: ${payload.documentName}`);

    await this.notificationsService.createNotification({
      recipientId: payload.recipientId,
      type: 'document_uploaded',
      data: {
        documentName: payload.documentName,
        documentType: payload.documentType,
        uploaderName: payload.uploaderName,
        uploadDate: payload.uploadDate,
      },
      priority: 'low',
      relatedEntityType: 'document',
      relatedEntityId: payload.documentId,
      actionData: {
        type: 'navigate',
        route: `/documents/${payload.documentId}`,
      },
    });
  }
}
