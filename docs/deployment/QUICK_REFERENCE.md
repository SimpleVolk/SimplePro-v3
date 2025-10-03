# Environment Configuration - Quick Reference

## Quick Commands

```bash
# Generate secrets
npm run generate:secrets                    # Development
npm run generate:secrets:staging           # Staging
npm run generate:secrets:production        # Production

# Validate environment
npm run validate:env                       # Development
npm run validate:env:staging              # Staging
npm run validate:env:production           # Production

# Start application
npm run docker:dev                        # Start infrastructure
npm run dev                               # Start dev servers
```

## Required Variables (Minimum)

```bash
# Always Required
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@host/db
REDIS_HOST=redis.example.com
REDIS_PASSWORD=<32+ chars>
JWT_SECRET=<64+ chars in production>
JWT_REFRESH_SECRET=<64+ chars, different from JWT_SECRET>

# Production Only
API_BASE_URL=https://api.example.com
WEB_APP_URL=https://app.example.com
ALLOWED_ORIGINS=https://app.example.com
SESSION_SECRET=<64+ chars>
```

## Secret Generation

### Generate JWT Secret (64 chars)
```bash
openssl rand -base64 64 | tr -d '\n'
```

### Generate Password (32 chars)
```bash
openssl rand -base64 32 | tr -d '\n'
```

### Generate All Secrets
```bash
npm run generate:secrets:production
# Output: .secrets/production-secrets.txt
```

## Environment File Locations

```
apps/api/.env.local              # Local development (gitignored)
apps/api/.env.staging            # Staging (gitignored)
apps/api/.env.production         # Production (gitignored)
apps/api/.env.*.example          # Templates (committed)

apps/web/.env.local              # Web local (gitignored)
apps/web/.env.staging            # Web staging (gitignored)
apps/web/.env.production         # Web production (gitignored)
apps/web/.env.*.example          # Web templates (committed)

.secrets/                        # Generated secrets (gitignored)
```

## Security Checklist

### Before Production Deployment

- [ ] JWT_SECRET is 64+ characters
- [ ] JWT_REFRESH_SECRET is 64+ characters and different from JWT_SECRET
- [ ] SESSION_SECRET is 64+ characters
- [ ] Database password is 32+ characters
- [ ] All URLs use HTTPS
- [ ] ALLOWED_ORIGINS is explicitly set (no wildcards)
- [ ] SESSION_COOKIE_SECURE=true
- [ ] STORAGE_USE_SSL=true
- [ ] DEBUG_MODE=false
- [ ] SEED_DATA=false
- [ ] Validation passes: `npm run validate:env:production`

## Common Variables by Category

### Database (MongoDB)
```bash
MONGODB_URI=mongodb+srv://user:pass@host/db?ssl=true
MONGODB_POOL_SIZE=50
```

### Cache (Redis)
```bash
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<strong password>
REDIS_TLS_ENABLED=true
```

### Authentication
```bash
JWT_SECRET=<64+ chars>
JWT_REFRESH_SECRET=<64+ chars, different>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=<64+ chars>
```

### CORS
```bash
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
```

### Email (Optional)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=<api key>
SMTP_PASSWORD=<api key>
SMTP_FROM_EMAIL=noreply@example.com
EMAIL_NOTIFICATIONS_ENABLED=true
```

### Storage (S3/MinIO)
```bash
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=s3.us-east-1.amazonaws.com
STORAGE_ACCESS_KEY=<access key>
STORAGE_SECRET_KEY=<secret key>
STORAGE_BUCKET_NAME=simplepro-prod-storage
STORAGE_USE_SSL=true
```

### Feature Flags
```bash
ENABLE_SWAGGER=false          # false in production
DEBUG_MODE=false              # false in production
SEED_DATA=false               # false in production
WEBSOCKET_ENABLED=true
```

## Troubleshooting

### Validation Fails: JWT Secret Too Short
```bash
# Generate new secret (64+ chars)
openssl rand -base64 64 | tr -d '\n'

# Or use script
npm run generate:secrets:production
```

### Missing Required Variable
```bash
# Check which variables are missing
npm run validate:env:production

# Add missing variables to environment file
# See .env.production.example for format
```

### MongoDB Connection Failed
```bash
# Format: mongodb+srv://USER:PASS@HOST/DB?OPTIONS
MONGODB_URI=mongodb+srv://prod_user:password@cluster.mongodb.net/simplepro?retryWrites=true&w=majority&ssl=true

# Check:
# - Username is correct
# - Password is URL-encoded
# - Database name is correct
# - IP is whitelisted (MongoDB Atlas)
```

### CORS Error
```bash
# Add frontend domain to ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://app.example.com

# Multiple origins (comma-separated, no spaces)
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
```

### Redis Connection Failed
```bash
# Check Redis is accessible
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Should return: PONG
```

## Environment-Specific Settings

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_SWAGGER=true
DEBUG_MODE=true
SEED_DATA=true
BCRYPT_ROUNDS=10
```

### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=debug
ENABLE_SWAGGER=true
DEBUG_MODE=false
SEED_DATA=true
BCRYPT_ROUNDS=10
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_SWAGGER=false
DEBUG_MODE=false
SEED_DATA=false
BCRYPT_ROUNDS=12
SESSION_COOKIE_SECURE=true
REDIS_TLS_ENABLED=true
STORAGE_USE_SSL=true
```

## Documentation Links

- [Complete Configuration Guide](./ENVIRONMENT_CONFIGURATION_GUIDE.md)
- [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)
- [Deployment README](./README.md)
- [Setup Summary](./DEPLOYMENT_SETUP_SUMMARY.md)

## Support

1. Check validation output: `npm run validate:env:production`
2. Review error messages - they explain what's wrong
3. Consult documentation above
4. Contact DevOps team

---

**Print this page for quick reference during deployment!**
