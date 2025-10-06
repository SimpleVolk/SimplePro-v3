import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as Handlebars from 'handlebars';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '../schemas/notification-template.schema';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto';

export interface RenderedNotification {
  title: string;
  message: string;
  emailSubject?: string;
  emailBody?: string;
  smsMessage?: string;
  defaultChannels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  defaultPriority: string;
}

@Injectable()
export class NotificationTemplateService implements OnModuleInit {
  private readonly logger = new Logger(NotificationTemplateService.name);
  private templateCache = new Map<string, NotificationTemplateDocument>();

  constructor(
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplateDocument>,
  ) {
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  async onModuleInit() {
    await this.seedDefaultTemplates();
    await this.loadTemplatesIntoCache();
  }

  private registerHandlebarsHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      }
      return d.toLocaleString();
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      if (typeof amount !== 'number') return '$0.00';
      return `$${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });
  }

  private async loadTemplatesIntoCache() {
    const templates = await this.templateModel.find({ isActive: true }).exec();
    templates.forEach((template) => {
      this.templateCache.set(template.type, template);
    });
    this.logger.log(`Loaded ${templates.length} templates into cache`);
  }

  /**
   * Render a notification from a template
   */
  async renderNotification(
    type: string,
    data: any,
  ): Promise<RenderedNotification> {
    const template =
      this.templateCache.get(type) || (await this.getTemplate(type));

    if (!template) {
      throw new NotFoundException(
        `Notification template for type "${type}" not found`,
      );
    }

    try {
      const titleTemplate = Handlebars.compile(template.titleTemplate);
      const messageTemplate = Handlebars.compile(template.messageTemplate);

      const result: RenderedNotification = {
        title: titleTemplate(data),
        message: messageTemplate(data),
        defaultChannels: template.defaultChannels,
        defaultPriority: template.defaultPriority,
      };

      if (template.emailSubjectTemplate) {
        const emailSubjectTemplate = Handlebars.compile(
          template.emailSubjectTemplate,
        );
        result.emailSubject = emailSubjectTemplate(data);
      }

      if (template.emailBodyTemplate) {
        const emailBodyTemplate = Handlebars.compile(
          template.emailBodyTemplate,
        );
        result.emailBody = emailBodyTemplate(data);
      }

      if (template.smsTemplate) {
        const smsTemplate = Handlebars.compile(template.smsTemplate);
        result.smsMessage = smsTemplate(data);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to render template ${type}:`, error);
      throw error;
    }
  }

  /**
   * Get template by type
   */
  async getTemplate(type: string): Promise<NotificationTemplate> {
    const template = await this.templateModel.findOne({ type }).exec();

    if (!template) {
      throw new NotFoundException(`Template with type "${type}" not found`);
    }

    return template;
  }

  /**
   * Create a new template
   */
  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    const template = new this.templateModel(dto);
    await template.save();
    this.templateCache.set(template.type, template);
    return template;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    type: string,
    dto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    const template = await this.templateModel.findOneAndUpdate({ type }, dto, {
      new: true,
    });

    if (!template) {
      throw new NotFoundException(`Template with type "${type}" not found`);
    }

    this.templateCache.set(template.type, template);
    return template;
  }

  /**
   * Seed default templates on startup
   */
  async seedDefaultTemplates(): Promise<void> {
    const existingCount = await this.templateModel.countDocuments();

    if (existingCount > 0) {
      this.logger.log('Templates already exist, skipping seed');
      return;
    }

    const defaultTemplates: CreateTemplateDto[] = [
      {
        type: 'job_assigned',
        titleTemplate: 'New Job Assignment',
        messageTemplate:
          'You have been assigned to job #{{jobNumber}} on {{formatDate jobDate "short"}}',
        emailSubjectTemplate: 'New Job Assignment - #{{jobNumber}}',
        emailBodyTemplate: `
          <h2>New Job Assignment</h2>
          <p>Hi {{crewName}},</p>
          <p>You have been assigned to the following job:</p>
          <ul>
            <li><strong>Job Number:</strong> #{{jobNumber}}</li>
            <li><strong>Date:</strong> {{formatDate jobDate}}</li>
            <li><strong>Location:</strong> {{jobAddress}}</li>
            <li><strong>Customer:</strong> {{customerName}}</li>
          </ul>
          <p>Please review the job details in the app.</p>
        `,
        smsTemplate:
          'New job assigned: #{{jobNumber}} on {{formatDate jobDate "short"}}. Location: {{jobAddress}}',
        defaultChannels: { inApp: true, email: true, sms: false, push: true },
        defaultPriority: 'high',
      },
      {
        type: 'shift_reminder',
        titleTemplate: 'Shift Reminder',
        messageTemplate:
          'Your shift starts in {{reminderMinutes}} minutes at {{shiftLocation}}',
        emailSubjectTemplate: 'Shift Reminder - {{formatDate shiftStart}}',
        emailBodyTemplate: `
          <h2>Shift Reminder</h2>
          <p>Hi {{employeeName}},</p>
          <p>This is a reminder that your shift starts soon:</p>
          <ul>
            <li><strong>Start Time:</strong> {{formatDate shiftStart}}</li>
            <li><strong>Location:</strong> {{shiftLocation}}</li>
            <li><strong>Duration:</strong> {{shiftDuration}} hours</li>
          </ul>
        `,
        smsTemplate:
          'Shift reminder: Your shift starts in {{reminderMinutes}} minutes at {{shiftLocation}}',
        defaultChannels: { inApp: true, email: false, sms: true, push: true },
        defaultPriority: 'high',
      },
      {
        type: 'customer_inquiry',
        titleTemplate: 'New Customer Inquiry',
        messageTemplate: 'New inquiry from {{customerName}} - {{inquiryType}}',
        emailSubjectTemplate: 'New Customer Inquiry - {{customerName}}',
        emailBodyTemplate: `
          <h2>New Customer Inquiry</h2>
          <p>You have received a new inquiry:</p>
          <ul>
            <li><strong>Customer:</strong> {{customerName}}</li>
            <li><strong>Type:</strong> {{inquiryType}}</li>
            <li><strong>Phone:</strong> {{customerPhone}}</li>
            <li><strong>Email:</strong> {{customerEmail}}</li>
            <li><strong>Message:</strong> {{inquiryMessage}}</li>
          </ul>
        `,
        smsTemplate:
          'New inquiry from {{customerName}}. Check your dashboard for details.',
        defaultChannels: { inApp: true, email: true, sms: false, push: true },
        defaultPriority: 'normal',
      },
      {
        type: 'quote_request',
        titleTemplate: 'New Quote Request',
        messageTemplate:
          'Quote request from {{customerName}} for {{serviceType}}',
        emailSubjectTemplate: 'New Quote Request - {{customerName}}',
        emailBodyTemplate: `
          <h2>New Quote Request</h2>
          <p>A customer has requested a quote:</p>
          <ul>
            <li><strong>Customer:</strong> {{customerName}}</li>
            <li><strong>Service:</strong> {{serviceType}}</li>
            <li><strong>Move Date:</strong> {{formatDate moveDate "short"}}</li>
            <li><strong>From:</strong> {{originAddress}}</li>
            <li><strong>To:</strong> {{destinationAddress}}</li>
          </ul>
        `,
        defaultChannels: { inApp: true, email: true, sms: false, push: true },
        defaultPriority: 'normal',
      },
      {
        type: 'job_completed',
        titleTemplate: 'Job Completed',
        messageTemplate: 'Job #{{jobNumber}} has been marked as completed',
        emailSubjectTemplate: 'Job Completion - #{{jobNumber}}',
        emailBodyTemplate: `
          <h2>Job Completed</h2>
          <p>The following job has been completed:</p>
          <ul>
            <li><strong>Job Number:</strong> #{{jobNumber}}</li>
            <li><strong>Customer:</strong> {{customerName}}</li>
            <li><strong>Completion Time:</strong> {{formatDate completionTime}}</li>
            <li><strong>Duration:</strong> {{jobDuration}} hours</li>
          </ul>
        `,
        defaultChannels: { inApp: true, email: true, sms: false, push: false },
        defaultPriority: 'normal',
      },
      {
        type: 'payment_received',
        titleTemplate: 'Payment Received',
        messageTemplate:
          'Payment of {{formatCurrency amount}} received for job #{{jobNumber}}',
        emailSubjectTemplate: 'Payment Received - {{formatCurrency amount}}',
        emailBodyTemplate: `
          <h2>Payment Received</h2>
          <p>A payment has been received:</p>
          <ul>
            <li><strong>Amount:</strong> {{formatCurrency amount}}</li>
            <li><strong>Job Number:</strong> #{{jobNumber}}</li>
            <li><strong>Payment Method:</strong> {{paymentMethod}}</li>
            <li><strong>Date:</strong> {{formatDate paymentDate}}</li>
          </ul>
        `,
        defaultChannels: { inApp: true, email: true, sms: false, push: false },
        defaultPriority: 'normal',
      },
      {
        type: 'system_alert',
        titleTemplate: 'System Alert',
        messageTemplate: '{{alertMessage}}',
        emailSubjectTemplate: 'System Alert - {{alertType}}',
        emailBodyTemplate: `
          <h2>System Alert</h2>
          <p><strong>Type:</strong> {{alertType}}</p>
          <p><strong>Message:</strong> {{alertMessage}}</p>
          <p><strong>Time:</strong> {{formatDate alertTime}}</p>
        `,
        defaultChannels: { inApp: true, email: true, sms: false, push: true },
        defaultPriority: 'high',
      },
      {
        type: 'message_received',
        titleTemplate: 'New Message',
        messageTemplate: 'New message from {{senderName}}',
        emailSubjectTemplate: 'New Message from {{senderName}}',
        emailBodyTemplate: `
          <h2>New Message</h2>
          <p><strong>From:</strong> {{senderName}}</p>
          <p><strong>Message:</strong></p>
          <p>{{messageContent}}</p>
        `,
        smsTemplate: 'New message from {{senderName}}. Check your app.',
        defaultChannels: { inApp: true, email: false, sms: false, push: true },
        defaultPriority: 'normal',
      },
      {
        type: 'time_off_approved',
        titleTemplate: 'Time Off Approved',
        messageTemplate:
          'Your time off request from {{formatDate startDate "short"}} to {{formatDate endDate "short"}} has been approved',
        emailSubjectTemplate: 'Time Off Request Approved',
        emailBodyTemplate: `
          <h2>Time Off Request Approved</h2>
          <p>Hi {{employeeName}},</p>
          <p>Your time off request has been approved:</p>
          <ul>
            <li><strong>From:</strong> {{formatDate startDate}}</li>
            <li><strong>To:</strong> {{formatDate endDate}}</li>
            <li><strong>Reason:</strong> {{reason}}</li>
            <li><strong>Approved By:</strong> {{approverName}}</li>
          </ul>
        `,
        defaultChannels: { inApp: true, email: true, sms: false, push: true },
        defaultPriority: 'normal',
      },
      {
        type: 'time_off_denied',
        titleTemplate: 'Time Off Request Denied',
        messageTemplate:
          'Your time off request from {{formatDate startDate "short"}} to {{formatDate endDate "short"}} has been denied',
        emailSubjectTemplate: 'Time Off Request Denied',
        emailBodyTemplate: `
          <h2>Time Off Request Denied</h2>
          <p>Hi {{employeeName}},</p>
          <p>Unfortunately, your time off request has been denied:</p>
          <ul>
            <li><strong>From:</strong> {{formatDate startDate}}</li>
            <li><strong>To:</strong> {{formatDate endDate}}</li>
            <li><strong>Reason:</strong> {{denialReason}}</li>
            <li><strong>Denied By:</strong> {{approverName}}</li>
          </ul>
          <p>Please contact your supervisor if you have questions.</p>
        `,
        defaultChannels: { inApp: true, email: true, sms: false, push: true },
        defaultPriority: 'normal',
      },
      {
        type: 'schedule_change',
        titleTemplate: 'Schedule Change',
        messageTemplate:
          'Your schedule has been updated for {{formatDate scheduleDate "short"}}',
        emailSubjectTemplate: 'Schedule Change - {{formatDate scheduleDate}}',
        emailBodyTemplate: `
          <h2>Schedule Change</h2>
          <p>Hi {{employeeName}},</p>
          <p>Your schedule has been updated:</p>
          <ul>
            <li><strong>Date:</strong> {{formatDate scheduleDate}}</li>
            <li><strong>New Time:</strong> {{newTime}}</li>
            <li><strong>Location:</strong> {{location}}</li>
            <li><strong>Notes:</strong> {{changeNotes}}</li>
          </ul>
        `,
        smsTemplate:
          'Schedule change: {{formatDate scheduleDate "short"}} - {{newTime}}. Check app for details.',
        defaultChannels: { inApp: true, email: true, sms: true, push: true },
        defaultPriority: 'high',
      },
      {
        type: 'document_uploaded',
        titleTemplate: 'New Document Uploaded',
        messageTemplate: 'A new document "{{documentName}}" has been uploaded',
        emailSubjectTemplate: 'New Document - {{documentName}}',
        emailBodyTemplate: `
          <h2>New Document Uploaded</h2>
          <p>A new document has been uploaded:</p>
          <ul>
            <li><strong>Document:</strong> {{documentName}}</li>
            <li><strong>Type:</strong> {{documentType}}</li>
            <li><strong>Uploaded By:</strong> {{uploaderName}}</li>
            <li><strong>Date:</strong> {{formatDate uploadDate}}</li>
          </ul>
        `,
        defaultChannels: { inApp: true, email: false, sms: false, push: false },
        defaultPriority: 'low',
      },
    ];

    await this.templateModel.insertMany(defaultTemplates);
    this.logger.log(
      `Seeded ${defaultTemplates.length} default notification templates`,
    );
  }
}
