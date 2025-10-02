# SimplePro-v3 Security Guide

## Overview

This document outlines the security measures implemented in SimplePro-v3 and provides guidance for secure deployment and operation.

## Security Architecture

### 1. Credential Management

**❌ NEVER DO:**
- Commit `.env.production` or any files containing real credentials to version control
- Use default passwords or weak credentials in production
- Store credentials in environment variables for production deployment
- Reuse development credentials in production

**✅ SECURE APPROACH:**
- Use file-based secret storage in `.secrets/` directory with 600 permissions
- Generate cryptographically secure secrets using `npm run secrets:setup`
- Use Docker secrets for container deployment
- Rotate secrets regularly using `npm run secrets:rotate`

### 2. File-Based Secret Management

**Production Secrets Location:**
```
.secrets/
├── mongodb_password      # MongoDB admin password
├── redis_password        # Redis authentication password
├── jwt_secret           # JWT signing secret (128 chars)
├── jwt_refresh_secret   # JWT refresh token secret (128 chars)
├── minio_password       # MinIO root password
├── grafana_password     # Grafana admin password
└── vault.json          # Secret metadata and rotation history
```

**Security Features:**
- Directory permissions: `700` (owner read/write/execute only)
- File permissions: `600` (owner read/write only)
- Automatic secret strength validation
- Development environment fallback to environment variables
- Production enforcement of file-based secrets

### 3. Application Security

**Authentication & Authorization:**
- JWT tokens with configurable expiration (default: 1h access, 7d refresh)
- Role-based access control (RBAC) with granular permissions
- Password hashing with bcrypt (12 rounds)
- Session management with automatic cleanup
- Multi-device session tracking

**Input Validation:**
- Comprehensive input validation using class-validator
- SQL injection prevention through Mongoose ODM
- XSS protection via proper output encoding
- CORS configuration for frontend origins

**Database Security:**
- MongoDB connection with authentication
- Connection pooling with secure defaults
- Default credential validation and rejection
- Encrypted connections in production

## Security Commands

### Initial Setup

```bash
# Initialize production secrets (first time only)
npm run secrets:setup

# Validate secret strength and permissions
npm run secrets:validate

# Run comprehensive security checks
npm run security:check
```

### Production Deployment

```bash
# Secure production deployment (recommended)
npm run deploy:prod:secure

# Alternative: Traditional Docker Compose (less secure)
npm run docker:prod:secure
```

### Secret Management

```bash
# Generate new environment file from secrets
npm run secrets:generate-env

# Rotate a specific secret
npm run secrets:rotate mongodb_password

# Validate all secrets
npm run secrets:validate
```

## Deployment Security

### Secure Production Deployment

The recommended production deployment method uses Docker secrets and file-based credential management:

1. **Initialize Secrets:**
   ```bash
   npm run secrets:setup
   ```

2. **Run Security Checks:**
   ```bash
   npm run security:check
   ```

3. **Deploy Securely:**
   ```bash
   npm run deploy:prod:secure
   ```

### Security Validation

The `security:check` command validates:
- No credential files are tracked by git
- `.secrets/` directory exists with proper permissions
- All required secret files exist with correct permissions
- No credential patterns in tracked files
- Secure Docker configuration is available

## Development Security

### Development Environment Setup

1. **Copy Template:**
   ```bash
   cp .env.development.template .env
   ```

2. **Update Credentials:**
   Edit `.env` and replace all `your_*_password_here` placeholders with actual development passwords.

3. **Start Development:**
   ```bash
   npm run dev
   ```

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Secret Storage | Environment variables | File-based in `.secrets/` |
| Credential Strength | Moderate (32+ chars) | Strong (64+ chars) |
| Git Tracking | `.env` not tracked | `.secrets/` not tracked |
| JWT Secrets | Development patterns allowed | No dev patterns allowed |
| Database Validation | Basic validation | Enhanced security checks |

## Security Monitoring

### Log Security Events

The application logs security-relevant events:
- Authentication attempts (success/failure)
- Authorization failures
- Invalid token usage
- Secret loading failures
- Database connection issues

### Health Checks

Monitor security health via:
- `/api/health` endpoint for service status
- Docker container health checks
- Secret file validation during startup

## Incident Response

### Credential Compromise

If credentials are compromised:

1. **Immediate Actions:**
   ```bash
   # Rotate all affected secrets
   npm run secrets:rotate mongodb_password
   npm run secrets:rotate redis_password
   npm run secrets:rotate jwt_secret
   npm run secrets:rotate jwt_refresh_secret
   ```

2. **Update Production:**
   ```bash
   # Redeploy with new secrets
   npm run deploy:prod:secure
   ```

3. **Verify Security:**
   ```bash
   # Run comprehensive security checks
   npm run security:check
   ```

### Git History Cleanup

If credentials were accidentally committed:

1. **Remove from tracking:**
   ```bash
   git rm --cached .env.production
   git rm --cached .secrets/
   ```

2. **Clean git history** (if needed):
   ```bash
   # WARNING: This rewrites git history
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env.production' \
     --prune-empty --tag-name-filter cat -- --all
   ```

## Security Best Practices

### For Developers

1. **Never commit credentials** to version control
2. **Use template files** for sharing configuration structure
3. **Rotate secrets regularly** (at least every 90 days)
4. **Use strong, unique passwords** for all services
5. **Validate inputs** at all application boundaries
6. **Log security events** without exposing sensitive data

### For Operations

1. **Use secure deployment methods** (`deploy:prod:secure`)
2. **Monitor secret file permissions** regularly
3. **Implement backup strategies** for secret recovery
4. **Audit access logs** for unauthorized activity
5. **Keep dependencies updated** for security patches

### For Infrastructure

1. **Use Docker secrets** for container deployment
2. **Implement network segmentation** between services
3. **Enable TLS/SSL** for all external communications
4. **Use firewall rules** to restrict access
5. **Implement intrusion detection** systems

## Compliance Considerations

### Data Protection

- **PII Encryption:** Sensitive user data encrypted at rest
- **Data Masking:** PII masked in logs and non-production environments
- **Access Controls:** Role-based access to sensitive operations
- **Audit Trails:** Complete logging of data access and modifications

### Security Standards

- **OWASP Top 10:** Protection against common web vulnerabilities
- **NIST Guidelines:** Following cybersecurity framework recommendations
- **Industry Standards:** Compliance with moving industry security requirements

## Security Contact

For security issues or questions:
- Review this documentation first
- Check application logs for error details
- Use `npm run security:check` for validation
- Contact security team for incident response

---

**Remember:** Security is everyone's responsibility. When in doubt, choose the more secure option.