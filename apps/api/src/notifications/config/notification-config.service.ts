import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import twilio from 'twilio';

export interface NotificationConfig {
  email: {
    enabled: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  };
  sms: {
    enabled: boolean;
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  };
  push: {
    enabled: boolean;
    projectId?: string;
    privateKey?: string;
    clientEmail?: string;
  };
}

@Injectable()
export class NotificationConfigService implements OnModuleInit {
  private readonly logger = new Logger(NotificationConfigService.name);
  private config: NotificationConfig;
  private emailTransporter: Transporter | null = null;
  private twilioClient: ReturnType<typeof twilio> | null = null;
  private firebaseInitialized = false;

  constructor() {
    this.config = this.loadConfiguration();
  }

  async onModuleInit() {
    this.validateConfiguration();
    await this.initializeServices();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): NotificationConfig {
    return {
      email: {
        enabled:
          !!process.env.SMTP_HOST &&
          !!process.env.SMTP_USER &&
          !!process.env.SMTP_PASS,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'SimplePro <noreply@simplepro.com>',
      },
      sms: {
        enabled:
          !!process.env.TWILIO_ACCOUNT_SID &&
          !!process.env.TWILIO_AUTH_TOKEN &&
          !!process.env.TWILIO_PHONE_NUMBER,
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      push: {
        enabled:
          !!process.env.FIREBASE_PROJECT_ID &&
          !!process.env.FIREBASE_PRIVATE_KEY &&
          !!process.env.FIREBASE_CLIENT_EMAIL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      },
    };
  }

  /**
   * Validate configuration and log warnings for missing credentials
   */
  private validateConfiguration(): void {
    if (!this.config.email.enabled) {
      this.logger.warn(
        'Email notifications are disabled. Missing SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS).',
      );
    } else {
      this.logger.log('Email notifications enabled via SMTP');
    }

    if (!this.config.sms.enabled) {
      this.logger.warn(
        'SMS notifications are disabled. Missing Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).',
      );
    } else {
      this.logger.log('SMS notifications enabled via Twilio');
    }

    if (!this.config.push.enabled) {
      this.logger.warn(
        'Push notifications are disabled. Missing Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL).',
      );
    } else {
      this.logger.log('Push notifications enabled via Firebase FCM');
    }

    // Log warning if all channels are disabled
    if (
      !this.config.email.enabled &&
      !this.config.sms.enabled &&
      !this.config.push.enabled
    ) {
      this.logger.warn(
        'All external notification channels are disabled. Only in-app notifications will work.',
      );
    }
  }

  /**
   * Initialize notification services
   */
  private async initializeServices(): Promise<void> {
    // Initialize email transporter
    if (this.config.email.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: this.config.email.host,
          port: this.config.email.port,
          secure: this.config.email.secure,
          auth: {
            user: this.config.email.user,
            pass: this.config.email.pass,
          },
        });

        // Verify SMTP connection
        await this.emailTransporter.verify();
        this.logger.log(
          'Email transporter initialized and verified successfully',
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          'Failed to initialize email transporter:',
          errorMessage,
        );
        this.config.email.enabled = false;
        this.emailTransporter = null;
      }
    }

    // Initialize Twilio client
    if (this.config.sms.enabled) {
      try {
        this.twilioClient = twilio(
          this.config.sms.accountSid!,
          this.config.sms.authToken!,
        );
        this.logger.log('Twilio client initialized successfully');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to initialize Twilio client:', errorMessage);
        this.config.sms.enabled = false;
        this.twilioClient = null;
      }
    }

    // Initialize Firebase Admin
    if (this.config.push.enabled) {
      try {
        // Check if Firebase is already initialized
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: this.config.push.projectId!,
              privateKey: this.config.push.privateKey!,
              clientEmail: this.config.push.clientEmail!,
            }),
          });
          this.firebaseInitialized = true;
          this.logger.log('Firebase Admin SDK initialized successfully');
        } else {
          this.firebaseInitialized = true;
          this.logger.log('Firebase Admin SDK already initialized');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          'Failed to initialize Firebase Admin SDK:',
          errorMessage,
        );
        this.config.push.enabled = false;
        this.firebaseInitialized = false;
      }
    }
  }

  /**
   * Get notification configuration
   */
  getConfig(): NotificationConfig {
    return this.config;
  }

  /**
   * Check if email notifications are enabled
   */
  isEmailEnabled(): boolean {
    return this.config.email.enabled;
  }

  /**
   * Check if SMS notifications are enabled
   */
  isSmsEnabled(): boolean {
    return this.config.sms.enabled;
  }

  /**
   * Check if push notifications are enabled
   */
  isPushEnabled(): boolean {
    return this.config.push.enabled;
  }

  /**
   * Get email transporter
   */
  getEmailTransporter(): Transporter | null {
    return this.emailTransporter;
  }

  /**
   * Get Twilio client
   */
  getTwilioClient(): ReturnType<typeof twilio> | null {
    return this.twilioClient;
  }

  /**
   * Get Firebase Admin instance
   */
  getFirebaseAdmin(): typeof admin | null {
    return this.firebaseInitialized ? admin : null;
  }

  /**
   * Get email 'from' address
   */
  getEmailFrom(): string {
    return this.config.email.from || 'SimplePro <noreply@simplepro.com>';
  }

  /**
   * Get Twilio phone number
   */
  getTwilioPhoneNumber(): string | undefined {
    return this.config.sms.phoneNumber;
  }
}
