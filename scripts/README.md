# SimplePro-v3 Scripts Directory

This directory contains operational scripts for SimplePro-v3 deployment, maintenance, and administration.

## Scripts Overview

### Deployment Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy-prod.sh` | Production deployment with validation | `./deploy-prod.sh [deploy|health|help]` |
| `deploy-dev.sh` | Development environment setup | `./deploy-dev.sh` |
| `validate-environment.sh` | Environment validation and checks | `./validate-environment.sh` |

### Security and Secrets Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `secrets-management.sh` | Production secrets management | `./secrets-management.sh [setup|validate|rotate|cleanup]` |

### Backup and Recovery

| Script | Purpose | Usage |
|--------|---------|-------|
| `backup-restore.sh` | Backup and disaster recovery | `./backup-restore.sh [backup|restore-mongodb|restore-redis|cleanup|health]` |

### Database Operations

| Script | Purpose | Usage |
|--------|---------|-------|
| `seed-database.js` | Database seeding with test data | `node seed-database.js` |
| `validate-seed-data.js` | Validate seeded data integrity | `node validate-seed-data.js` |

## Detailed Script Documentation

### Production Deployment (`deploy-prod.sh`)

Comprehensive production deployment script with validation, monitoring, and rollback capabilities.

**Features:**
- Pre-deployment environment validation
- Automated secrets and SSL setup
- Service health monitoring
- Comprehensive health checks
- Post-deployment backup creation
- Detailed deployment reporting

**Usage Examples:**
```bash
# Full production deployment
./scripts/deploy-prod.sh

# Health checks only
./scripts/deploy-prod.sh health

# Custom configuration
HEALTH_CHECK_TIMEOUT=600 ./scripts/deploy-prod.sh
```

**Environment Variables:**
- `ENVIRONMENT`: Deployment environment (default: production)
- `BACKUP_BEFORE_DEPLOY`: Create backup before deploy (default: true)
- `HEALTH_CHECK_TIMEOUT`: Health check timeout in seconds (default: 300)
- `ROLLBACK_ON_FAILURE`: Rollback on deployment failure (default: true)

### Environment Validation (`validate-environment.sh`)

Validates deployment environment for production readiness.

**Validation Checks:**
- Docker installation and daemon status
- Node.js and npm versions
- System resources (memory, disk space)
- Network connectivity
- Port availability
- Configuration file presence
- SSL certificate validation
- Secrets management setup

**Usage:**
```bash
./scripts/validate-environment.sh
```

**Output:**
- Pass/fail status for each check
- Detailed warnings and recommendations
- Summary report with remediation steps

### Secrets Management (`secrets-management.sh`)

Secure management of production secrets and credentials.

**Features:**
- Automated secret generation
- Secure storage with proper permissions
- Secret validation and health checks
- Periodic secret rotation
- Backup cleanup and management

**Commands:**
```bash
# Initial setup (first time)
./scripts/secrets-management.sh setup

# Validate existing secrets
./scripts/secrets-management.sh validate

# Rotate all secrets (creates backup)
./scripts/secrets-management.sh rotate

# Clean old secret backups
./scripts/secrets-management.sh cleanup
```

**Generated Secrets:**
- MongoDB admin password (24 characters)
- Redis password (24 characters)
- JWT secret (64-character hex)
- JWT refresh secret (64-character hex)
- MinIO admin password (24 characters)
- Grafana admin password (16 characters)

**Security Features:**
- 600 permissions on secret files
- Secure random generation using OpenSSL
- Automatic backup before rotation
- Validation of secret strength and format

### Backup and Recovery (`backup-restore.sh`)

Comprehensive backup and disaster recovery system.

**Backup Components:**
- MongoDB database (compressed archive)
- Redis cache (RDB and AOF files)
- Application and Docker logs
- Configuration files
- Docker volumes
- Backup manifest with checksums

**Features:**
- Automated full system backups
- Individual component backup/restore
- Backup verification and integrity checks
- Automated cleanup of old backups
- Health checks after restore operations

**Usage Examples:**
```bash
# Full system backup
./scripts/backup-restore.sh backup

# Restore MongoDB from specific backup
./scripts/backup-restore.sh restore-mongodb /path/to/backup.archive

# Restore Redis from backup
./scripts/backup-restore.sh restore-redis /path/to/dump.rdb

# Clean backups older than 30 days
./scripts/backup-restore.sh cleanup

# System health check
./scripts/backup-restore.sh health
```

**Backup Schedule Recommendations:**
- Daily: Full system backup (automated via cron)
- Hourly: Database incremental backup during business hours
- Weekly: Complete volume backup for disaster recovery

### Database Seeding (`seed-database.js`)

Populates the database with comprehensive test data for development and testing.

**Seeded Data:**
- User accounts with different roles
- Customer records (residential and commercial)
- Job records with various statuses
- Sample estimates and pricing data
- Historical data for analytics testing

**Usage:**
```bash
# Seed development database
NODE_ENV=development node scripts/seed-database.js

# Seed with custom configuration
DATABASE_URL=mongodb://localhost:27017/test node scripts/seed-database.js
```

### Data Validation (`validate-seed-data.js`)

Validates database integrity and data consistency after seeding.

**Validation Checks:**
- User account integrity
- Role and permission assignments
- Customer data consistency
- Job workflow state validation
- Pricing calculation accuracy

**Usage:**
```bash
node scripts/validate-seed-data.js
```

## SSL Certificate Management

The `docker/ssl/` directory contains SSL certificate management tools:

### Generate Certificates (`docker/ssl/generate-certs.sh`)

Creates self-signed certificates for development and testing.

**Usage:**
```bash
./docker/ssl/generate-certs.sh
```

**Output:**
- `cert.pem`: SSL certificate
- `key.pem`: Private key
- Certificate information display

**Security Notes:**
- Development/testing only - use CA certificates for production
- 2048-bit RSA keys
- 365-day validity period
- Proper file permissions (600 for private key)

## Script Dependencies

### Required System Tools

- `bash` (version 4.0+)
- `docker` and `docker-compose`
- `curl` for health checks
- `openssl` for certificate generation
- `mongosh` for MongoDB operations
- `redis-cli` for Redis operations

### Node.js Dependencies

Scripts use the following npm packages:
- `mongoose` for MongoDB operations
- `bcrypt` for password hashing
- Environment-specific packages as defined in package.json

## Security Considerations

### Script Security

- All scripts validate input parameters
- Secure handling of sensitive data
- Proper error handling and cleanup
- Logging of security-relevant operations

### File Permissions

Ensure proper permissions on executable scripts:
```bash
chmod +x scripts/*.sh
chmod +x docker/ssl/generate-certs.sh
```

### Secrets Protection

- Secrets are never logged or displayed
- Secure file permissions (600) on secret files
- Automatic cleanup of temporary files
- Validation of secret strength

## Error Handling and Logging

### Logging Features

- Color-coded output for different message types
- Structured logging with timestamps
- Detailed error messages with remediation steps
- Summary reports with actionable insights

### Error Recovery

- Graceful error handling with cleanup
- Rollback capabilities for failed operations
- Health checks after critical operations
- Detailed troubleshooting information

## Maintenance and Updates

### Regular Tasks

1. **Weekly**: Update script dependencies
2. **Monthly**: Review and rotate secrets
3. **Quarterly**: Update backup retention policies
4. **Annually**: Security audit of all scripts

### Version Control

- All scripts are version controlled
- Changes require code review
- Backward compatibility maintained
- Deployment tested in staging first

## Support and Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure scripts are executable (`chmod +x`)
2. **Docker Not Running**: Start Docker daemon before running scripts
3. **Missing Dependencies**: Run environment validation first
4. **Network Issues**: Check firewall and connectivity

### Getting Help

1. **Script Help**: Use `--help` flag on any script
2. **Logs**: Check script output and system logs
3. **Validation**: Run environment validation for diagnosis
4. **Documentation**: Refer to main deployment guide

For additional support, see the main project documentation and deployment guide.