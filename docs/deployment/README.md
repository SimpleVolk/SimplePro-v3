# Deployment Documentation

This directory contains comprehensive guides for deploying SimplePro-v3 to staging and production environments.

## Quick Links

- **[Environment Configuration Guide](./ENVIRONMENT_CONFIGURATION_GUIDE.md)** - Complete reference for all environment variables
- **[GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)** - Step-by-step guide for CI/CD secrets

## Getting Started

### 1. Local Development Setup

```bash
# Copy environment templates
cp apps/api/.env.local.example apps/api/.env.local
cp apps/web/.env.local.example apps/web/.env.local

# Start Docker infrastructure
npm run docker:dev

# Start development servers
npm run dev
```

### 2. Staging Deployment

```bash
# Generate staging secrets
npm run generate:secrets:staging

# Copy secrets to staging environment files
cp apps/api/.env.staging.example apps/api/.env.staging
# Edit .env.staging with generated secrets

# Validate configuration
npm run validate:env:staging

# Build and deploy
npm run build
npm run deploy:staging
```

### 3. Production Deployment

```bash
# Generate production secrets
npm run generate:secrets:production

# Store secrets in GitHub Secrets or AWS Secrets Manager
# See: GITHUB_SECRETS_SETUP.md

# Validate configuration
npm run validate:env:production

# Deploy via CI/CD
git push origin main
```

## Available Scripts

### Secret Management

```bash
npm run generate:secrets              # Generate secrets for development
npm run generate:secrets:staging      # Generate secrets for staging
npm run generate:secrets:production   # Generate secrets for production
```

### Environment Validation

```bash
npm run validate:env                  # Validate development environment
npm run validate:env:staging          # Validate staging environment
npm run validate:env:production       # Validate production environment
```

## Documentation Files

### ENVIRONMENT_CONFIGURATION_GUIDE.md

Complete reference documentation covering:

- All environment variables with descriptions
- Required vs optional variables
- Security requirements and best practices
- Environment-specific settings
- Troubleshooting common issues

### GITHUB_SECRETS_SETUP.md

Step-by-step guide for CI/CD setup:

- Creating GitHub environments
- Adding secrets for staging and production
- Secret rotation procedures
- Security best practices
- Troubleshooting deployment issues

## Security Checklist

Before deploying to production, ensure:

- [ ] All secrets are generated using cryptographically secure methods
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are different and 64+ characters
- [ ] Database credentials use strong passwords (32+ characters)
- [ ] CORS origins are explicitly set (no wildcards)
- [ ] SSL/TLS is enabled for all external connections
- [ ] Debug mode and data seeding are disabled
- [ ] SESSION_COOKIE_SECURE is set to true
- [ ] All URLs use HTTPS
- [ ] Secrets are stored in a secure secret manager
- [ ] Environment validation passes without errors

## Common Commands

### Generate Secrets

```bash
# Generate all secrets for production
npm run generate:secrets:production

# Output is saved to .secrets/production-secrets.txt
# Store securely and delete after copying to secret manager
```

### Validate Environment

```bash
# Validate production environment file
npm run validate:env:production

# Validate specific file
npm run validate:env -- --file=apps/api/.env.production
```

### Test Configuration

```bash
# Run environment validation tests
npm run test:api -- src/config/env.validation.spec.ts

# Test with coverage
npm run test:api -- --coverage src/config/env.validation.spec.ts
```

## Environment Variables by Category

### Always Required

- NODE_ENV
- MONGODB_URI
- REDIS_HOST
- REDIS_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET

### Production Required

- API_BASE_URL
- WEB_APP_URL
- ALLOWED_ORIGINS
- SESSION_SECRET

### Optional (Feature-Dependent)

- SMTP\_\* (for email notifications)
- TWILIO\_\* (for SMS notifications)
- FIREBASE\_\* (for push notifications)
- STRIPE\_\* (for payments)
- GOOGLE_MAPS_API_KEY (for geocoding)

See [ENVIRONMENT_CONFIGURATION_GUIDE.md](./ENVIRONMENT_CONFIGURATION_GUIDE.md) for complete details.

## Deployment Workflow

### Development → Staging → Production

1. **Development**
   - Use `.env.local` files
   - Docker infrastructure on localhost
   - Debug logging enabled
   - Data seeding enabled

2. **Staging**
   - Use `.env.staging` files
   - Separate infrastructure from production
   - Similar to production but more permissive
   - Can enable Swagger and debug features for testing

3. **Production**
   - Use environment variables from secret manager
   - Strict security settings enforced
   - HTTPS required for all URLs
   - Debug features disabled
   - Automated validation in CI/CD pipeline

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy-production.yml
jobs:
  deploy:
    environment: production
    steps:
      - name: Validate Environment
        run: npm run validate:env:production
        env:
          # Secrets injected from GitHub Secrets
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          # ... etc
```

### Pre-Deployment Validation

```bash
# Run before deploying to catch issues early
npm run validate:env:production
```

If validation fails, fix issues before deploying.

## Troubleshooting

### Validation Fails

**Error**: "JWT_SECRET must be at least 64 characters long in production"

**Solution**: Generate a new secret using `npm run generate:secrets:production`

### Missing Required Variables

**Error**: "Missing required variable: MONGODB_URI"

**Solution**: Check that all required variables are set. See ENVIRONMENT_CONFIGURATION_GUIDE.md for the complete list.

### CORS Errors

**Error**: "CORS policy blocked the request"

**Solution**: Add your frontend domain to ALLOWED_ORIGINS in production environment

### MongoDB Connection Failed

**Error**: "MongoServerError: Authentication failed"

**Solution**:

1. Verify credentials in MONGODB_URI
2. Check database name and authSource
3. Ensure IP is whitelisted (MongoDB Atlas)

## Additional Resources

- [SimplePro Developer Guide](../../CLAUDE.md)
- [MongoDB Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)
- [Redis Configuration](https://redis.io/docs/manual/config/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Support

For deployment issues:

1. Check this documentation first
2. Run validation: `npm run validate:env:production`
3. Review error logs
4. Contact DevOps team

---

**Last Updated**: 2025-10-02
**Maintained By**: DevOps Team
