import { z } from 'zod';
import { Logger } from '@nestjs/common';

/**
 * Environment Variable Validation Schema
 *
 * This module provides comprehensive validation for all environment variables
 * required by the SimplePro API. It ensures that:
 *
 * 1. All required variables are present
 * 2. Values are in the correct format
 * 3. Security requirements are met (e.g., strong secrets)
 * 4. Dependencies between variables are satisfied
 *
 * The application will fail fast on startup if validation fails,
 * providing clear error messages about what needs to be fixed.
 */

const logger = new Logger('EnvironmentValidation');

// Custom validators
const isStrongSecret = (
  value: string,
  context: z.RefinementCtx,
  minLength = 32,
): void => {
  if (value.length < minLength) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Secret must be at least ${minLength} characters long`,
    });
  }
};

const isProductionSecret = (
  value: string,
  context: z.RefinementCtx,
  secretName: string,
): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) return;

  // Production-specific requirements
  if (value.length < 64) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${secretName} must be at least 64 characters long in production`,
    });
    return;
  }

  // Check for development patterns
  const devPatterns = [
    'dev',
    'test',
    'development',
    'example',
    'demo',
    'changeme',
  ];
  const lowerValue = value.toLowerCase();

  for (const pattern of devPatterns) {
    if (lowerValue.includes(pattern)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${secretName} appears to contain development placeholder text: "${pattern}"`,
      });
      return;
    }
  }
};

const isSecurePassword = (
  value: string,
  context: z.RefinementCtx,
  fieldName: string,
): void => {
  // Skip strict password validation in test/development environments
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production';
  if (!isProduction) return;

  const unsafePatterns = [
    'admin',
    'password',
    '123',
    'test',
    'root',
    'default',
    'changeme',
  ];
  const lowerValue = value.toLowerCase();

  for (const pattern of unsafePatterns) {
    if (lowerValue.includes(pattern)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldName} contains unsafe pattern: "${pattern}". Use a strong, randomly generated password.`,
      });
      return;
    }
  }

  if (value.length < 12) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must be at least 12 characters long`,
    });
  }
};

// Base environment schema - common to all environments
const baseEnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']),
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10)),
  APP_NAME: z.string().default('SimplePro-v3'),
  APP_VERSION: z.string().default('3.0.0'),
  API_BASE_URL: z.string().url().optional(),
  WEB_APP_URL: z.string().url().optional(),

  // Database - MongoDB
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  MONGODB_POOL_SIZE: z
    .string()
    .default('50')
    .transform((val: string) => parseInt(val, 10)),
  MONGODB_MAX_IDLE_TIME_MS: z
    .string()
    .default('60000')
    .transform((val: string) => parseInt(val, 10)),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform((val: string) => parseInt(val, 10)),

  // Redis Cache
  REDIS_HOST: z.string().min(1, 'Redis host is required'),
  REDIS_PORT: z
    .string()
    .default('6379')
    .transform((val: string) => parseInt(val, 10)),
  REDIS_PASSWORD: z
    .string()
    .min(1, 'Redis password is required')
    .superRefine((val: string, ctx: any) =>
      isSecurePassword(val, ctx, 'Redis password'),
    ),
  REDIS_DB: z
    .string()
    .default('0')
    .transform((val: string) => parseInt(val, 10)),
  REDIS_CONNECT_TIMEOUT: z
    .string()
    .default('10000')
    .transform((val: string) => parseInt(val, 10)),
  REDIS_TTL: z
    .string()
    .default('300')
    .transform((val: string) => parseInt(val, 10)),
  REDIS_SHORT_TTL: z
    .string()
    .default('60')
    .transform((val: string) => parseInt(val, 10)),
  REDIS_MEDIUM_TTL: z
    .string()
    .default('300')
    .transform((val: string) => parseInt(val, 10)),
  REDIS_LONG_TTL: z
    .string()
    .default('3600')
    .transform((val) => parseInt(val, 10)),
  REDIS_EXTRA_LONG_TTL: z
    .string()
    .default('86400')
    .transform((val) => parseInt(val, 10)),
  REDIS_MAX_ITEMS: z
    .string()
    .default('100000')
    .transform((val) => parseInt(val, 10)),
  REDIS_TLS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  REDIS_CLUSTER_MODE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // JWT Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .superRefine((val, ctx) => isStrongSecret(val, ctx, 32))
    .superRefine((val, ctx) => isProductionSecret(val, ctx, 'JWT_SECRET')),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .superRefine((val, ctx) => isStrongSecret(val, ctx, 32))
    .superRefine((val, ctx) =>
      isProductionSecret(val, ctx, 'JWT_REFRESH_SECRET'),
    ),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),
  CORS_CREDENTIALS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Object Storage (MinIO/S3)
  STORAGE_PROVIDER: z.enum(['s3', 'minio', 'spaces']).default('s3'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_PORT: z
    .string()
    .default('443')
    .transform((val) => parseInt(val, 10)),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_USE_SSL: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  STORAGE_BUCKET_NAME: z.string().default('simplepro-storage'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_PUBLIC_URL: z.string().url().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .default('587')
    .transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default('SimplePro'),
  SMTP_REPLY_TO: z.string().email().optional(),
  EMAIL_PROVIDER: z
    .enum(['sendgrid', 'ses', 'mailgun', 'postmark', 'other'])
    .default('sendgrid'),
  EMAIL_NOTIFICATIONS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  SMS_NOTIFICATIONS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Push Notifications (Firebase)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_DATABASE_URL: z.string().url().optional(),
  PUSH_NOTIFICATIONS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Rate Limiting
  RATE_LIMIT_GLOBAL: z
    .string()
    .default('1000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_AUTH: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_LOGIN: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_TIER1: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_TIER2: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_TIER3: z
    .string()
    .default('500')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_BLOCK_DURATION_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10)),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'verbose'])
    .default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  LOG_CONSOLE_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  LOG_FILE_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  LOG_FILE_PATH: z.string().default('/var/log/simplepro/api.log'),
  LOG_FILE_MAX_SIZE: z
    .string()
    .default('10485760')
    .transform((val) => parseInt(val, 10)),
  LOG_FILE_MAX_FILES: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  CLOUDWATCH_LOGS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  CLOUDWATCH_LOG_GROUP: z.string().optional(),
  CLOUDWATCH_LOG_STREAM: z.string().optional(),
  DATADOG_LOGS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  DATADOG_API_KEY: z.string().optional(),

  // Monitoring & Metrics
  PROMETHEUS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  PROMETHEUS_METRICS_PATH: z.string().default('/metrics'),
  PROMETHEUS_PORT: z
    .string()
    .default('9090')
    .transform((val) => parseInt(val, 10)),
  HEALTH_CHECK_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  HEALTH_CHECK_PATH: z.string().default('/health'),
  APM_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  APM_PROVIDER: z.enum(['newrelic', 'datadog', 'elastic']).optional(),
  APM_API_KEY: z.string().optional(),
  APM_APP_NAME: z.string().optional(),

  // Session
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .optional(),
  SESSION_TTL: z
    .string()
    .default('604800')
    .transform((val) => parseInt(val, 10)),
  SESSION_COOKIE_NAME: z.string().default('simplepro_session'),
  SESSION_COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  SESSION_COOKIE_HTTP_ONLY: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  SESSION_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  SESSION_COOKIE_DOMAIN: z.string().optional(),

  // File Upload
  MAX_FILE_SIZE: z
    .string()
    .default('52428800')
    .transform((val) => parseInt(val, 10)),
  ALLOWED_FILE_TYPES: z
    .string()
    .default('image/jpeg,image/png,image/gif,application/pdf'),
  MAX_FILES_PER_UPLOAD: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),

  // Security
  HELMET_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  CSP_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  HSTS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  HSTS_MAX_AGE: z
    .string()
    .default('31536000')
    .transform((val) => parseInt(val, 10)),
  CSRF_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  BCRYPT_ROUNDS: z
    .string()
    .default('12')
    .transform((val) => parseInt(val, 10)),
  PASSWORD_MIN_LENGTH: z
    .string()
    .default('8')
    .transform((val) => parseInt(val, 10)),
  PASSWORD_REQUIRE_UPPERCASE: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  PASSWORD_REQUIRE_LOWERCASE: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  PASSWORD_REQUIRE_NUMBER: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  PASSWORD_REQUIRE_SPECIAL_CHAR: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  ACCOUNT_LOCKOUT_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  ACCOUNT_LOCKOUT_ATTEMPTS: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10)),
  ACCOUNT_LOCKOUT_DURATION: z
    .string()
    .default('900')
    .transform((val) => parseInt(val, 10)),

  // Feature Flags
  ENABLE_SWAGGER: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  ENABLE_GRAPHQL_PLAYGROUND: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  DEBUG_MODE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  SEED_DATA: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  WEBSOCKET_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  CREW_AUTO_ASSIGNMENT_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  AUTO_JOB_STATUS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  NOTIFICATION_RETRY_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  NOTIFICATION_MAX_RETRIES: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10)),

  // Webhooks
  WEBHOOK_SECRET: z.string().optional(),
  WEBHOOK_TIMEOUT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),

  // Third-party Integrations
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  MIXPANEL_TOKEN: z.string().optional(),

  // Backup & Disaster Recovery
  BACKUP_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  BACKUP_SCHEDULE: z.string().optional(),
  BACKUP_RETENTION_DAYS: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10)),
  BACKUP_STORAGE_LOCATION: z.string().optional(),

  // Timezone & Localization
  TZ: z.string().default('UTC'),
  DEFAULT_LOCALE: z.string().default('en-US'),
  SUPPORTED_LOCALES: z.string().default('en-US,es-ES,fr-FR'),

  // Advanced Configuration
  CLUSTER_MODE_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  CLUSTER_WORKERS: z
    .string()
    .default('0')
    .transform((val) => parseInt(val, 10)),
  SHUTDOWN_TIMEOUT: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10)),
  DNS_CACHE_TTL: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),
});

// Production-specific validations
const productionEnvSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production') return;

  // Enforce HTTPS for production
  if (data.API_BASE_URL && !data.API_BASE_URL.startsWith('https://')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['API_BASE_URL'],
      message: 'Production API_BASE_URL must use HTTPS',
    });
  }

  if (data.WEB_APP_URL && !data.WEB_APP_URL.startsWith('https://')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['WEB_APP_URL'],
      message: 'Production WEB_APP_URL must use HTTPS',
    });
  }

  // Enforce secure cookies in production
  if (!data.SESSION_COOKIE_SECURE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SESSION_COOKIE_SECURE'],
      message: 'SESSION_COOKIE_SECURE must be true in production',
    });
  }

  // Ensure CORS origins are explicitly set
  if (!data.ALLOWED_ORIGINS || data.ALLOWED_ORIGINS.includes('*')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ALLOWED_ORIGINS'],
      message:
        'ALLOWED_ORIGINS must be explicitly set in production (no wildcards)',
    });
  }

  // Ensure debug features are disabled
  if (data.DEBUG_MODE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DEBUG_MODE'],
      message: 'DEBUG_MODE must be false in production',
    });
  }

  if (data.SEED_DATA) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SEED_DATA'],
      message: 'SEED_DATA must be false in production',
    });
  }

  // Verify JWT secrets are different
  if (data.JWT_SECRET === data.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must be different from JWT_SECRET',
    });
  }

  // Ensure Redis TLS in production
  if (!data.REDIS_TLS_ENABLED && !data.REDIS_HOST.includes('localhost')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_TLS_ENABLED'],
      message:
        'REDIS_TLS_ENABLED should be true for non-localhost connections in production',
    });
  }

  // Ensure storage uses SSL
  if (!data.STORAGE_USE_SSL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STORAGE_USE_SSL'],
      message: 'STORAGE_USE_SSL must be true in production',
    });
  }
});

/**
 * Validate environment variables
 *
 * @param env - Environment variables to validate (defaults to process.env)
 * @returns Validated and typed environment configuration
 * @throws Error if validation fails
 */
export function validateEnvironment(env: Record<string, any> = process.env) {
  try {
    logger.log('Validating environment configuration...');

    const validatedEnv = productionEnvSchema.parse(env);

    logger.log('✓ Environment validation successful');

    // Log configuration summary (without sensitive values)
    logConfigurationSummary(validatedEnv);

    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Environment validation failed');
      logger.error('Please fix the following issues:\n');

      const issues = error.issues.map((issue, index) => {
        const path = issue.path.join('.');
        return `  ${index + 1}. ${path}: ${issue.message}`;
      });

      logger.error(issues.join('\n'));
      logger.error('\nRefer to .env.production.example for guidance');

      throw new Error(
        `Environment validation failed with ${error.issues.length} issue(s). Check logs for details.`,
      );
    }

    throw error;
  }
}

/**
 * Log configuration summary (without sensitive values)
 */
function logConfigurationSummary(config: any) {
  logger.log('Configuration Summary:');
  logger.log(`  Environment: ${config.NODE_ENV}`);
  logger.log(`  Port: ${config.PORT}`);
  logger.log(`  Database: ${maskConnectionString(config.MONGODB_URI)}`);
  logger.log(`  Redis: ${config.REDIS_HOST}:${config.REDIS_PORT}`);
  logger.log(
    `  Storage: ${config.STORAGE_PROVIDER} (${config.STORAGE_BUCKET_NAME})`,
  );
  logger.log(
    `  CORS Origins: ${config.ALLOWED_ORIGINS || 'all (development)'}`,
  );
  logger.log(`  Features:`);
  logger.log(`    - Swagger: ${config.ENABLE_SWAGGER}`);
  logger.log(`    - WebSocket: ${config.WEBSOCKET_ENABLED}`);
  logger.log(
    `    - Email Notifications: ${config.EMAIL_NOTIFICATIONS_ENABLED}`,
  );
  logger.log(`    - SMS Notifications: ${config.SMS_NOTIFICATIONS_ENABLED}`);
  logger.log(`    - Push Notifications: ${config.PUSH_NOTIFICATIONS_ENABLED}`);
}

/**
 * Mask sensitive connection string
 */
function maskConnectionString(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    return 'mongodb://****:****@****/****';
  }
}

/**
 * Export type for validated environment
 */
export type ValidatedEnvironment = z.infer<typeof productionEnvSchema>;
