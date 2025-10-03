# Environment Configuration Guide

Complete reference for configuring SimplePro-v3 environments (development, staging, production).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Files](#environment-files)
- [Configuration Categories](#configuration-categories)
- [Required vs Optional Variables](#required-vs-optional-variables)
- [Environment-Specific Settings](#environment-specific-settings)
- [Security Considerations](#security-considerations)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Overview

SimplePro-v3 uses environment variables for configuration across different deployment environments. This guide provides comprehensive documentation for all configuration options.

### Configuration Principles

1. **Environment Separation**: Separate configs for dev, staging, and production
2. **Security First**: Never commit secrets to version control
3. **Fail Fast**: Application validates environment on startup
4. **Explicit Configuration**: No implicit defaults for sensitive values
5. **Documentation**: Every variable is documented with purpose and requirements

## Quick Start

### Development Setup

```bash
# 1. Copy example files
cp apps/api/.env.local.example apps/api/.env.local
cp apps/web/.env.local.example apps/web/.env.local

# 2. Start infrastructure
npm run docker:dev

# 3. Update MongoDB URI in apps/api/.env.local
# MONGODB_URI=mongodb://admin:password123@localhost:27017/simplepro?authSource=admin

# 4. Start application
npm run dev
```

### Staging Setup

```bash
# 1. Copy staging templates
cp apps/api/.env.staging.example apps/api/.env.staging
cp apps/web/.env.staging.example apps/web/.env.staging

# 2. Generate secrets
npm run generate:secrets

# 3. Update .env.staging files with generated secrets and staging infrastructure details

# 4. Validate configuration
npm run validate:env -- --env=staging

# 5. Build and deploy
npm run build
npm run deploy:staging
```

### Production Setup

```bash
# 1. Generate production secrets
npm run generate:secrets -- --env=production

# 2. Store secrets in secure secret manager (AWS Secrets Manager, etc.)

# 3. Configure GitHub Secrets for CI/CD
# See: docs/deployment/GITHUB_SECRETS_SETUP.md

# 4. Validate configuration
npm run validate:env -- --env=production

# 5. Deploy via CI/CD pipeline
git push origin main
```

## Environment Files

### File Locations

```
SimplePro-v3/
├── apps/
│   ├── api/
│   │   ├── .env.local           # Local development (gitignored)
│   │   ├── .env.staging         # Staging (gitignored)
│   │   ├── .env.production      # Production (gitignored)
│   │   ├── .env.local.example   # Development template
│   │   ├── .env.staging.example # Staging template
│   │   └── .env.production.example # Production template
│   └── web/
│       ├── .env.local           # Local development (gitignored)
│       ├── .env.staging         # Staging (gitignored)
│       ├── .env.production      # Production (gitignored)
│       ├── .env.local.example   # Development template
│       ├── .env.staging.example # Staging template
│       └── .env.production.example # Production template
└── .secrets/
    └── generated-secrets.txt    # Generated secrets (gitignored)
```

### File Naming Convention

- `.env.local` - Local development (not committed)
- `.env.staging` - Staging environment (not committed)
- `.env.production` - Production environment (not committed)
- `.env.*.example` - Template files (committed, no secrets)

## Configuration Categories

### 1. Application Configuration

Basic application settings.

#### PORT
- **Type**: Number
- **Default**: `3001` (API), `3009` (Web)
- **Required**: No
- **Description**: Server port number
- **Example**: `PORT=3001`

#### NODE_ENV
- **Type**: Enum (`development`, `staging`, `production`, `test`)
- **Default**: None
- **Required**: Yes
- **Description**: Application environment
- **Example**: `NODE_ENV=production`
- **Production Value**: `production`

#### APP_NAME
- **Type**: String
- **Default**: `SimplePro-v3`
- **Required**: No
- **Description**: Application name (used in logs, emails)
- **Example**: `APP_NAME=SimplePro-v3`

#### API_BASE_URL
- **Type**: URL
- **Default**: None
- **Required**: Yes (staging/production)
- **Description**: Base URL for API (used in emails, webhooks)
- **Example**: `API_BASE_URL=https://api.yourdomain.com`
- **Production Requirements**: Must use HTTPS

#### WEB_APP_URL
- **Type**: URL
- **Default**: None
- **Required**: Yes (staging/production)
- **Description**: Base URL for web application
- **Example**: `WEB_APP_URL=https://app.yourdomain.com`
- **Production Requirements**: Must use HTTPS

### 2. Database Configuration (MongoDB)

#### MONGODB_URI
- **Type**: Connection String
- **Default**: None
- **Required**: Yes
- **Description**: MongoDB connection string
- **Format**: `mongodb+srv://USER:PASS@HOST/DB?OPTIONS`
- **Example**:
  ```
  MONGODB_URI=mongodb+srv://prod_user:STRONG_PASSWORD@cluster.mongodb.net/simplepro_prod?retryWrites=true&w=majority&ssl=true
  ```
- **Security Requirements**:
  - Use strong username (not 'admin', 'root', 'test')
  - Password must be 32+ characters with special chars
  - Enable SSL/TLS (`ssl=true`)
  - Use connection pooling
  - Set write concern (`w=majority`)

#### MONGODB_POOL_SIZE
- **Type**: Number
- **Default**: `50`
- **Required**: No
- **Description**: Maximum connection pool size
- **Recommendations**:
  - Development: 10-20
  - Staging: 20-30
  - Production: 50-100

### 3. Redis Cache Configuration

#### REDIS_HOST
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: Redis server hostname
- **Example**: `REDIS_HOST=redis.yourdomain.com`

#### REDIS_PORT
- **Type**: Number
- **Default**: `6379`
- **Required**: No
- **Description**: Redis server port
- **Example**: `REDIS_PORT=6379`

#### REDIS_PASSWORD
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: Redis authentication password
- **Security Requirements**:
  - Minimum 32 characters
  - No common patterns (admin, password, 123)
  - Cryptographically random
- **Generate**: `openssl rand -base64 32 | tr -d '\n'`

#### REDIS_TLS_ENABLED
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Enable TLS for Redis connection
- **Production Value**: `true` (for non-localhost)

#### Cache TTL Settings

| Variable | Default | Description |
|----------|---------|-------------|
| REDIS_TTL | 300 | Default cache TTL (5 minutes) |
| REDIS_SHORT_TTL | 60 | Short-lived cache (1 minute) |
| REDIS_MEDIUM_TTL | 300 | Medium-lived cache (5 minutes) |
| REDIS_LONG_TTL | 3600 | Long-lived cache (1 hour) |
| REDIS_EXTRA_LONG_TTL | 86400 | Extra long cache (24 hours) |

### 4. JWT Authentication

#### JWT_SECRET
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: Secret key for signing JWT access tokens
- **Security Requirements**:
  - Minimum 32 characters (development)
  - Minimum 64 characters (production)
  - Cryptographically random
  - No development patterns (dev, test, example)
- **Generate**: `openssl rand -base64 64 | tr -d '\n'`

#### JWT_REFRESH_SECRET
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: Secret key for signing JWT refresh tokens
- **Security Requirements**:
  - Same as JWT_SECRET
  - **MUST be different from JWT_SECRET**
- **Generate**: `openssl rand -base64 64 | tr -d '\n'`

#### JWT_EXPIRES_IN
- **Type**: Duration String
- **Default**: `1h`
- **Required**: No
- **Description**: Access token expiration time
- **Format**: Examples: `15m`, `1h`, `2h`, `1d`
- **Recommendations**:
  - Development: `2h` - `8h`
  - Staging: `1h` - `2h`
  - Production: `15m` - `1h`

#### JWT_REFRESH_EXPIRES_IN
- **Type**: Duration String
- **Default**: `7d`
- **Required**: No
- **Description**: Refresh token expiration time
- **Format**: Examples: `7d`, `14d`, `30d`
- **Recommendations**:
  - Development: `30d`
  - Staging: `14d`
  - Production: `7d`

### 5. CORS Configuration

#### ALLOWED_ORIGINS
- **Type**: Comma-separated URLs
- **Default**: All origins (development only)
- **Required**: Yes (production)
- **Description**: List of allowed origins for CORS
- **Example**: `ALLOWED_ORIGINS=https://app.yourdomain.com,https://mobile.yourdomain.com`
- **Production Requirements**:
  - Must be explicitly set
  - No wildcards (`*`)
  - Use HTTPS
  - Include all frontend domains

### 6. Object Storage (S3/MinIO)

#### STORAGE_PROVIDER
- **Type**: Enum (`s3`, `minio`, `spaces`)
- **Default**: `s3`
- **Required**: No
- **Description**: Storage provider type

#### STORAGE_ENDPOINT
- **Type**: String
- **Default**: None
- **Required**: Yes (for MinIO/Spaces)
- **Description**: Storage endpoint URL
- **Examples**:
  - AWS S3: `s3.us-east-1.amazonaws.com`
  - DigitalOcean Spaces: `nyc3.digitaloceanspaces.com`
  - MinIO: `minio.yourdomain.com`

#### STORAGE_ACCESS_KEY
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: Storage access key / AWS Access Key ID

#### STORAGE_SECRET_KEY
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: Storage secret key / AWS Secret Access Key

#### STORAGE_BUCKET_NAME
- **Type**: String
- **Default**: `simplepro-storage`
- **Required**: No
- **Description**: Bucket name for file storage
- **Recommendations**:
  - Use environment-specific buckets
  - Example: `simplepro-prod-storage`, `simplepro-staging-storage`

#### STORAGE_USE_SSL
- **Type**: Boolean
- **Default**: `true`
- **Required**: No
- **Description**: Use SSL/TLS for storage connection
- **Production Value**: `true`

### 7. Email Configuration (SMTP)

#### SMTP_HOST
- **Type**: String
- **Default**: None
- **Required**: Yes (if email enabled)
- **Description**: SMTP server hostname
- **Examples**:
  - SendGrid: `smtp.sendgrid.net`
  - AWS SES: `email-smtp.us-east-1.amazonaws.com`
  - Mailgun: `smtp.mailgun.org`
  - Postmark: `smtp.postmarkapp.com`

#### SMTP_PORT
- **Type**: Number
- **Default**: `587`
- **Required**: No
- **Description**: SMTP server port
- **Options**:
  - `587` - STARTTLS (recommended)
  - `465` - SSL/TLS
  - `25` - Unencrypted (not recommended)

#### SMTP_SECURE
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Use SSL/TLS directly
- **Values**:
  - `true` - Use SSL (port 465)
  - `false` - Use STARTTLS (port 587)

#### SMTP_USER
- **Type**: String
- **Default**: None
- **Required**: Yes (if email enabled)
- **Description**: SMTP username or API key

#### SMTP_PASSWORD
- **Type**: String
- **Default**: None
- **Required**: Yes (if email enabled)
- **Description**: SMTP password or API key

#### SMTP_FROM_EMAIL
- **Type**: Email Address
- **Default**: None
- **Required**: Yes (if email enabled)
- **Description**: From email address
- **Requirements**: Must be verified with provider
- **Example**: `noreply@yourdomain.com`

#### EMAIL_NOTIFICATIONS_ENABLED
- **Type**: Boolean
- **Default**: `true`
- **Required**: No
- **Description**: Enable/disable email notifications globally

### 8. SMS Configuration (Twilio)

#### TWILIO_ACCOUNT_SID
- **Type**: String (starts with AC)
- **Default**: None
- **Required**: Yes (if SMS enabled)
- **Description**: Twilio account SID

#### TWILIO_AUTH_TOKEN
- **Type**: String
- **Default**: None
- **Required**: Yes (if SMS enabled)
- **Description**: Twilio authentication token

#### TWILIO_PHONE_NUMBER
- **Type**: Phone Number (E.164 format)
- **Default**: None
- **Required**: Yes (if SMS enabled)
- **Description**: Twilio phone number for sending SMS
- **Format**: `+15555551234`

#### SMS_NOTIFICATIONS_ENABLED
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Enable/disable SMS notifications globally

### 9. Push Notifications (Firebase)

#### FIREBASE_PROJECT_ID
- **Type**: String
- **Default**: None
- **Required**: Yes (if push enabled)
- **Description**: Firebase project ID

#### FIREBASE_PRIVATE_KEY
- **Type**: String (multiline)
- **Default**: None
- **Required**: Yes (if push enabled)
- **Description**: Firebase service account private key
- **Format**: Keep `\n` characters for line breaks

#### FIREBASE_CLIENT_EMAIL
- **Type**: Email Address
- **Default**: None
- **Required**: Yes (if push enabled)
- **Description**: Firebase service account email

#### PUSH_NOTIFICATIONS_ENABLED
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Enable/disable push notifications globally

### 10. Rate Limiting

| Variable | Default | Dev | Staging | Production |
|----------|---------|-----|---------|------------|
| RATE_LIMIT_GLOBAL | 1000 | 2000 | 2000 | 1000 |
| RATE_LIMIT_AUTH | 10 | 20 | 20 | 10 |
| RATE_LIMIT_LOGIN | 5 | 10 | 10 | 5 |
| RATE_LIMIT_TIER1 | 20 | 50 | 50 | 20 |
| RATE_LIMIT_TIER2 | 100 | 200 | 200 | 100 |
| RATE_LIMIT_TIER3 | 500 | 1000 | 1000 | 500 |

All values are requests per time window.

### 11. Logging Configuration

#### LOG_LEVEL
- **Type**: Enum (`error`, `warn`, `info`, `debug`, `verbose`)
- **Default**: `info`
- **Required**: No
- **Description**: Logging verbosity level
- **Recommendations**:
  - Development: `debug`
  - Staging: `debug` or `info`
  - Production: `warn` or `error`

#### LOG_FORMAT
- **Type**: Enum (`json`, `simple`)
- **Default**: `json`
- **Required**: No
- **Description**: Log output format
- **Recommendations**:
  - Development: `simple` (human-readable)
  - Staging/Production: `json` (for log aggregation)

### 12. Security Configuration

#### BCRYPT_ROUNDS
- **Type**: Number
- **Default**: `12`
- **Required**: No
- **Description**: Bcrypt hashing rounds
- **Recommendations**:
  - Development: `10`
  - Staging: `10`
  - Production: `12` (higher = more secure but slower)

#### PASSWORD_MIN_LENGTH
- **Type**: Number
- **Default**: `8`
- **Required**: No
- **Description**: Minimum password length
- **Recommendations**:
  - Development: `8`
  - Staging: `8`
  - Production: `12`

#### ACCOUNT_LOCKOUT_ENABLED
- **Type**: Boolean
- **Default**: `true`
- **Required**: No
- **Description**: Enable account lockout after failed attempts

#### ACCOUNT_LOCKOUT_ATTEMPTS
- **Type**: Number
- **Default**: `5`
- **Required**: No
- **Description**: Failed login attempts before lockout
- **Recommendations**:
  - Development: `10`
  - Staging: `10`
  - Production: `5`

### 13. Feature Flags

#### ENABLE_SWAGGER
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Enable Swagger API documentation
- **Production Value**: `false` (or require authentication)

#### DEBUG_MODE
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Enable debug mode (verbose logging, stack traces)
- **Production Value**: `false`

#### SEED_DATA
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Description**: Enable database seeding on startup
- **Production Value**: `false`

## Required vs Optional Variables

### Absolutely Required (All Environments)

```bash
NODE_ENV
MONGODB_URI
REDIS_HOST
REDIS_PASSWORD
JWT_SECRET
JWT_REFRESH_SECRET
```

### Required for Production

```bash
API_BASE_URL
WEB_APP_URL
ALLOWED_ORIGINS
SESSION_SECRET
```

### Optional (Feature-Dependent)

```bash
# Email (if EMAIL_NOTIFICATIONS_ENABLED=true)
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL

# SMS (if SMS_NOTIFICATIONS_ENABLED=true)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER

# Push (if PUSH_NOTIFICATIONS_ENABLED=true)
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL

# Monitoring (optional)
DATADOG_API_KEY
CLOUDWATCH_LOG_GROUP
APM_API_KEY

# Third-party (optional)
GOOGLE_MAPS_API_KEY
STRIPE_SECRET_KEY
GOOGLE_ANALYTICS_ID
```

## Environment-Specific Settings

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=simple
ENABLE_SWAGGER=true
DEBUG_MODE=true
SEED_DATA=true
BCRYPT_ROUNDS=10
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=debug
LOG_FORMAT=json
ENABLE_SWAGGER=true
DEBUG_MODE=false
SEED_DATA=true
BCRYPT_ROUNDS=10
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
ENABLE_SWAGGER=false
DEBUG_MODE=false
SEED_DATA=false
BCRYPT_ROUNDS=12
SESSION_COOKIE_SECURE=true
REDIS_TLS_ENABLED=true
STORAGE_USE_SSL=true
```

## Security Considerations

### Secret Strength Requirements

| Secret Type | Min Length (Dev) | Min Length (Prod) | Pattern Requirements |
|------------|------------------|-------------------|---------------------|
| JWT_SECRET | 32 | 64 | Base64, no dev patterns |
| JWT_REFRESH_SECRET | 32 | 64 | Base64, different from JWT_SECRET |
| SESSION_SECRET | 32 | 64 | Base64, no dev patterns |
| Database Password | 12 | 32 | Alphanumeric + special chars |
| Redis Password | 12 | 32 | Alphanumeric + special chars |

### Prohibited Patterns

Production secrets must NOT contain:
- `dev`, `test`, `development`, `example`
- `admin`, `password`, `123`, `root`
- `changeme`, `default`, `demo`

### HTTPS Requirements

Production must use HTTPS for:
- API_BASE_URL
- WEB_APP_URL
- All external service connections (when available)

### Cookie Security

Production requirements:
```bash
SESSION_COOKIE_SECURE=true      # Only send over HTTPS
SESSION_COOKIE_HTTP_ONLY=true   # Not accessible via JavaScript
SESSION_COOKIE_SAME_SITE=lax    # CSRF protection
```

## Validation

### Automatic Validation

The application validates environment variables on startup:

```bash
# Validate current environment
npm run dev  # Validates on startup

# Explicitly validate
npm run validate:env

# Validate specific environment
npm run validate:env -- --env=production
```

### Validation Failures

If validation fails, you'll see detailed error messages:

```
❌ Environment validation failed
Please fix the following issues:

  1. JWT_SECRET: Secret must be at least 64 characters long in production
  2. MONGODB_PASSWORD: contains unsafe pattern: "123"
  3. ALLOWED_ORIGINS: must be explicitly set in production (no wildcards)

Refer to .env.production.example for guidance
```

### Manual Validation

Check specific variables:

```bash
# Check JWT secret length
echo -n "$JWT_SECRET" | wc -c

# Check MongoDB connection
node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI, (err) => { if (err) console.error(err); else console.log('Connected'); process.exit(); })"

# Check Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

## Troubleshooting

### MongoDB Connection Failed

**Error**: `MongoServerError: Authentication failed`

**Solutions**:
1. Check username/password are correct
2. Verify database name in URI
3. Check `authSource` parameter (usually `admin`)
4. Ensure IP is whitelisted (MongoDB Atlas)
5. Test connection: `mongosh "mongodb+srv://..."`

### Redis Connection Failed

**Error**: `Error: connect ECONNREFUSED`

**Solutions**:
1. Verify Redis is running: `redis-cli ping`
2. Check host and port are correct
3. Test password: `redis-cli -h HOST -p PORT -a PASSWORD ping`
4. Check firewall rules

### JWT Token Invalid

**Error**: `JsonWebTokenError: invalid signature`

**Solutions**:
1. Ensure JWT_SECRET matches across all instances
2. Check secret hasn't been changed mid-session
3. Verify no trailing spaces or newlines in secret
4. Regenerate tokens after secret change

### CORS Error

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Solutions**:
1. Add frontend URL to ALLOWED_ORIGINS
2. Ensure protocol matches (http vs https)
3. Include port if non-standard
4. Check for trailing slashes
5. Verify CORS_CREDENTIALS setting

### Rate Limit Exceeded

**Error**: `Too Many Requests`

**Solutions**:
1. Increase rate limits for your environment
2. Implement retry logic with exponential backoff
3. Use authentication to get higher limits
4. Check for infinite loops in your code

### File Upload Failed

**Error**: `Error uploading file`

**Solutions**:
1. Check MAX_FILE_SIZE setting
2. Verify ALLOWED_FILE_TYPES includes your file type
3. Test storage credentials
4. Check bucket exists and is accessible
5. Verify bucket permissions

### Email Not Sending

**Error**: `Error sending email`

**Solutions**:
1. Verify SMTP credentials
2. Check from address is verified
3. Test SMTP connection: `telnet smtp.host 587`
4. Check spam filters
5. Review provider's sending limits

## Additional Resources

- [GitHub Secrets Setup Guide](./GITHUB_SECRETS_SETUP.md)
- [MongoDB Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)
- [Redis Configuration Guide](https://redis.io/docs/manual/config/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: 2025-10-02
**Maintainer**: DevOps Team
**Review Schedule**: Quarterly with each major release
