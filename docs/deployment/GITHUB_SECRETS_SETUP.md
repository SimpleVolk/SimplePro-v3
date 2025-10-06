# GitHub Secrets Setup Guide

This guide walks you through setting up GitHub Secrets for CI/CD deployment of SimplePro-v3.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Required Secrets by Environment](#required-secrets-by-environment)
- [Step-by-Step Setup](#step-by-step-setup)
- [Secret Generation](#secret-generation)
- [Secret Rotation](#secret-rotation)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

GitHub Secrets are encrypted environment variables that you can use in GitHub Actions workflows. They allow you to store sensitive information like API keys, passwords, and tokens securely without exposing them in your code.

### Types of Secrets

1. **Repository Secrets**: Available to all workflows in a repository
2. **Environment Secrets**: Scoped to specific environments (staging, production)
3. **Organization Secrets**: Shared across multiple repositories (optional)

For SimplePro-v3, we use **Environment Secrets** to maintain separate configurations for staging and production.

## Prerequisites

- Admin access to the GitHub repository
- Production and staging infrastructure already provisioned
- Secret values generated using the provided scripts

## Required Secrets by Environment

### Staging Environment

#### Database & Cache

```
MONGODB_URI                          # MongoDB connection string
REDIS_HOST                           # Redis hostname
REDIS_PORT                           # Redis port (default: 6379)
REDIS_PASSWORD                       # Redis password (32+ characters)
```

#### Authentication

```
JWT_SECRET                           # JWT access token secret (64+ characters)
JWT_REFRESH_SECRET                   # JWT refresh token secret (64+ characters)
SESSION_SECRET                       # Session cookie secret (64+ characters)
```

#### Storage (S3/MinIO)

```
STORAGE_ENDPOINT                     # S3/MinIO endpoint
STORAGE_ACCESS_KEY                   # S3/MinIO access key
STORAGE_SECRET_KEY                   # S3/MinIO secret key
STORAGE_BUCKET_NAME                  # Bucket name for file storage
STORAGE_REGION                       # AWS region (for S3)
```

#### Email (SMTP)

```
SMTP_HOST                            # SMTP server hostname
SMTP_PORT                            # SMTP port (587 or 465)
SMTP_USER                            # SMTP username/API key
SMTP_PASSWORD                        # SMTP password/API key
SMTP_FROM_EMAIL                      # From email address
```

#### SMS (Twilio) - Optional

```
TWILIO_ACCOUNT_SID                   # Twilio account SID
TWILIO_AUTH_TOKEN                    # Twilio auth token
TWILIO_PHONE_NUMBER                  # Twilio phone number (E.164 format)
```

#### Push Notifications (Firebase) - Optional

```
FIREBASE_PROJECT_ID                  # Firebase project ID
FIREBASE_PRIVATE_KEY                 # Firebase service account private key
FIREBASE_CLIENT_EMAIL                # Firebase service account email
```

#### Monitoring & Logging - Optional

```
DATADOG_API_KEY                      # Datadog API key
CLOUDWATCH_LOG_GROUP                 # AWS CloudWatch log group
APM_API_KEY                          # APM service API key
```

#### Third-Party Integrations - Optional

```
GOOGLE_MAPS_API_KEY                  # Google Maps API key
STRIPE_SECRET_KEY                    # Stripe secret key (test mode)
STRIPE_WEBHOOK_SECRET                # Stripe webhook secret
```

### Production Environment

Production requires **all the same secrets as staging**, but with production values:

- Different database credentials
- Different JWT secrets
- Production API keys (Stripe live mode, etc.)
- Production domain configurations
- Stricter security settings

### Additional Secrets for CI/CD

These secrets are used by GitHub Actions workflows:

```
DOCKER_USERNAME                      # Docker Hub username
DOCKER_PASSWORD                      # Docker Hub password/token
SSH_PRIVATE_KEY                      # SSH key for server deployment
SSH_HOST                             # Production server hostname
SSH_USERNAME                         # SSH username
AWS_ACCESS_KEY_ID                    # AWS access key (if using AWS)
AWS_SECRET_ACCESS_KEY                # AWS secret key (if using AWS)
```

## Step-by-Step Setup

### 1. Generate Secrets

Before adding secrets to GitHub, generate secure values:

```bash
# From project root
npm run generate:secrets

# This creates a file with randomly generated secrets
# Location: .secrets/generated-secrets.txt
```

**IMPORTANT**: The generated secrets file is gitignored. Store it securely (password manager, secret vault).

### 2. Access GitHub Secrets Settings

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. You'll see tabs for **Repository secrets** and **Environments**

### 3. Create Environments

If not already created:

1. In the left sidebar, click **Environments**
2. Click **New environment**
3. Create two environments:
   - `staging`
   - `production`

For production, configure **protection rules**:

- Required reviewers (at least 1-2 people)
- Wait timer (optional)
- Deployment branches (limit to `main` or `production` branch)

### 4. Add Staging Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **Environments** tab
3. Click on **staging** environment
4. Click **Add secret** for each required secret:

**Example - Adding MongoDB URI:**

```
Name: MONGODB_URI
Value: mongodb+srv://staging_user:STRONG_PASSWORD@cluster.mongodb.net/simplepro_staging?retryWrites=true&w=majority
```

5. Repeat for all staging secrets listed above

### 5. Add Production Secrets

1. Click on **production** environment
2. Click **Add secret** for each required secret
3. Use **production values** (different from staging)

**Example - Production MongoDB URI:**

```
Name: MONGODB_URI
Value: mongodb+srv://prod_user:DIFFERENT_STRONG_PASSWORD@cluster.mongodb.net/simplepro_prod?retryWrites=true&w=majority
```

### 6. Add CI/CD Secrets (Repository Level)

Some secrets are shared across all environments:

1. Go to **Repository secrets** tab
2. Add secrets used by all workflows:

```
DOCKER_USERNAME
DOCKER_PASSWORD
SSH_PRIVATE_KEY
SSH_HOST
SSH_USERNAME
```

### 7. Verify Secrets in Workflow

Update your GitHub Actions workflow to use these secrets:

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production # This references the environment

    steps:
      - uses: actions/checkout@v3

      - name: Set up environment variables
        run: |
          echo "MONGODB_URI=${{ secrets.MONGODB_URI }}" >> .env.production
          echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env.production
          # ... add all other secrets

      - name: Deploy to production
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SSH_HOST: ${{ secrets.SSH_HOST }}
        run: |
          # Your deployment script
```

## Secret Generation

### Generate JWT Secrets (64+ characters)

```bash
# Method 1: Using OpenSSL
openssl rand -base64 64 | tr -d '\n'

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Method 3: Using the provided script
npm run generate:secrets
```

### Generate Database Passwords (32+ characters)

```bash
# Using OpenSSL
openssl rand -base64 32 | tr -d '\n'

# Using Node.js with special characters
node -e "console.log(require('crypto').randomBytes(32).toString('base64').replace(/[+\/=]/g, ''))"
```

### Generate Session Secrets

```bash
openssl rand -base64 64 | tr -d '\n'
```

### Firebase Private Key

1. Go to Firebase Console → Project Settings
2. Navigate to **Service Accounts** tab
3. Click **Generate new private key**
4. Download JSON file
5. Extract the `private_key` field value
6. Add to GitHub Secrets (keep the `\n` characters)

## Secret Rotation

Secrets should be rotated regularly for security:

### Rotation Schedule

- **JWT Secrets**: Every 90 days (quarterly)
- **Database Passwords**: Every 90 days (quarterly)
- **Redis Passwords**: Every 90 days (quarterly)
- **API Keys**: Per provider recommendations (typically 90-180 days)
- **SSH Keys**: Annually or when compromised

### Rotation Process

1. **Generate new secret value** using the methods above
2. **Update infrastructure first** (database, Redis, etc.) to accept BOTH old and new secrets temporarily
3. **Update GitHub Secret** with new value
4. **Deploy application** with new secret
5. **Verify deployment** is working
6. **Remove old secret** from infrastructure
7. **Document rotation** in your security log

### Rotation Script Template

```bash
#!/bin/bash
# rotate-jwt-secret.sh

echo "Rotating JWT_SECRET..."

# Generate new secret
NEW_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo "New secret generated (first 10 chars): ${NEW_SECRET:0:10}..."

# Update GitHub Secret (requires gh CLI)
echo "$NEW_SECRET" | gh secret set JWT_SECRET --env production

echo "✓ JWT_SECRET rotated successfully"
echo "⚠ Remember to rotate JWT_REFRESH_SECRET separately"
```

## Security Best Practices

### 1. Principle of Least Privilege

- Only add secrets that are absolutely necessary
- Use environment-specific secrets (don't share between staging/production)
- Limit who has access to production secrets

### 2. Secret Strength Requirements

| Secret Type        | Minimum Length    | Requirements                     |
| ------------------ | ----------------- | -------------------------------- |
| JWT Secrets        | 64 characters     | Base64, cryptographically random |
| Database Passwords | 32 characters     | Alphanumeric + special chars     |
| Redis Passwords    | 32 characters     | Alphanumeric + special chars     |
| Session Secrets    | 64 characters     | Base64, cryptographically random |
| API Keys           | Provider-specific | Use provider-generated keys      |

### 3. Never Hardcode Secrets

❌ **Bad**:

```typescript
const jwtSecret = 'my-secret-key';
```

✅ **Good**:

```typescript
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}
```

### 4. Use Secret Scanning

Enable GitHub's secret scanning:

1. Go to **Settings** → **Code security and analysis**
2. Enable **Secret scanning**
3. Enable **Push protection**

### 5. Audit Secret Access

Regularly review who has access:

1. **Settings** → **Secrets and variables** → **Actions**
2. Check environment protection rules
3. Review audit logs for secret access

### 6. Use Secret Management Services

For production, consider using:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

Then store only the credentials to access these services in GitHub Secrets.

## Troubleshooting

### Secret Not Available in Workflow

**Problem**: Workflow can't access secret

**Solutions**:

1. Verify secret name matches exactly (case-sensitive)
2. Check environment name is correct in workflow
3. Ensure workflow has `environment:` key set
4. Verify branch is allowed to deploy to environment

### Deployment Fails Due to Invalid Secret

**Problem**: Application fails to start with "invalid secret" error

**Solutions**:

1. Check secret value doesn't have trailing newlines or spaces
2. For multiline secrets (like Firebase private key), ensure proper formatting
3. Verify secret meets minimum length requirements
4. Check for special characters that need escaping

### Can't Access Production Secrets

**Problem**: Can't view or edit production secrets

**Solutions**:

1. Verify you have admin access to repository
2. Check if environment protection rules are blocking access
3. Request access from repository owner

### Secret Rotation Causes Downtime

**Problem**: Rotating secrets causes application to fail

**Solutions**:

1. Use rolling deployment strategy
2. Configure application to accept both old and new secrets temporarily
3. Deploy new secret before removing old one from infrastructure
4. Use blue-green deployment

### Secrets Exposed in Logs

**Problem**: Secret values appear in workflow logs

**Solutions**:

1. Never echo secrets directly: `echo ${{ secrets.JWT_SECRET }}` ❌
2. GitHub automatically masks secrets, but avoid logging them
3. Use `::add-mask::` if you need to handle secrets in output
4. Review workflow logs before merging

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [SimplePro Environment Configuration Guide](./ENVIRONMENT_CONFIGURATION_GUIDE.md)

## Quick Reference Commands

```bash
# Generate JWT secret (64 characters)
openssl rand -base64 64 | tr -d '\n'

# Generate database password (32 characters)
openssl rand -base64 32 | tr -d '\n'

# Generate all secrets at once
npm run generate:secrets

# Set GitHub secret via CLI (requires gh CLI)
echo "secret-value" | gh secret set SECRET_NAME --env production

# List all secrets (names only, not values)
gh secret list

# Delete a secret
gh secret delete SECRET_NAME --env production

# Validate environment configuration
npm run validate:env -- --env=production
```

---

**Last Updated**: 2025-10-02
**Maintainer**: DevOps Team
**Review Schedule**: Quarterly
