# Backup Procedures

## Overview

SimplePro-v3 implements a comprehensive backup strategy to protect against data loss and ensure business continuity. This document outlines backup procedures, schedules, and retention policies.

## Table of Contents

1. [Backup Components](#backup-components)
2. [Backup Strategy](#backup-strategy)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Automated Backup Setup](#automated-backup-setup)
5. [Verification Procedures](#verification-procedures)
6. [Backup Storage](#backup-storage)
7. [Retention Policies](#retention-policies)

## Backup Components

SimplePro-v3 backups include:

| Component | Data Type | Criticality | Backup Frequency |
|-----------|-----------|-------------|------------------|
| **MongoDB** | Business data (customers, jobs, estimates) | CRITICAL | Hourly |
| **MinIO S3** | Documents, photos, signatures | HIGH | Daily |
| **Configuration** | Docker configs, environment files | MEDIUM | On change |
| **Application Logs** | System and audit logs | LOW | Weekly |

## Backup Strategy

### Recovery Time Objective (RTO)

- **Critical systems**: 15 minutes
- **Non-critical systems**: 2 hours

### Recovery Point Objective (RPO)

- **MongoDB**: 1 hour (hourly backups)
- **MinIO S3**: 24 hours (daily backups)
- **Configuration**: Last change

### Backup Locations

1. **Primary**: Local disk storage (`./backups/`)
2. **Secondary**: Cloud storage (AWS S3, Azure Blob, or GCP Cloud Storage)
3. **Tertiary**: Offsite backup location (optional)

## Manual Backup Procedures

### Complete System Backup

Backup all components with a single command:

```bash
# Create a complete backup with custom tag
./scripts/backup/backup-all.sh production-release-v1.0.0

# Or use default "scheduled" tag
./scripts/backup/backup-all.sh
```

This creates backups of:
- MongoDB database
- MinIO S3 buckets
- Configuration files

### MongoDB Backup

```bash
# Basic backup
./scripts/backup/backup-mongodb.sh

# Backup with custom name
./scripts/backup/backup-mongodb.sh pre-deployment

# Custom backup directory
BACKUP_DIR=/mnt/backups/mongodb ./scripts/backup/backup-mongodb.sh

# Custom retention period (days)
RETENTION_DAYS=60 ./scripts/backup/backup-mongodb.sh
```

**Environment Variables:**

- `BACKUP_DIR`: Backup destination (default: `./backups/mongodb`)
- `MONGODB_URI`: MongoDB connection string
- `DATABASE_NAME`: Database to backup (default: `simplepro`)
- `RETENTION_DAYS`: Days to keep backups (default: 30)

### MinIO S3 Backup

```bash
# Basic backup
./scripts/backup/backup-minio.sh

# Backup with custom name
./scripts/backup/backup-minio.sh weekly-backup

# Custom bucket
BUCKET_NAME=simplepro-documents ./scripts/backup/backup-minio.sh

# Custom retention
RETENTION_DAYS=90 ./scripts/backup/backup-minio.sh
```

**Environment Variables:**

- `BACKUP_DIR`: Backup destination (default: `./backups/minio`)
- `MINIO_ENDPOINT`: MinIO server URL
- `MINIO_ACCESS_KEY`: Access key
- `MINIO_SECRET_KEY`: Secret key
- `BUCKET_NAME`: Bucket to backup (default: `simplepro-documents`)
- `RETENTION_DAYS`: Days to keep backups (default: 30)

### Configuration Backup

Configuration files are automatically included in `backup-all.sh`. To backup manually:

```bash
# Create timestamped config backup
mkdir -p backups/config
timestamp=$(date +%Y%m%d_%H%M%S)
tar -czf backups/config/config-${timestamp}.tar.gz \
  docker-compose*.yml \
  .env.production \
  monitoring/
```

## Automated Backup Setup

### Cron Job Configuration

**Production Server (Recommended):**

```bash
# Edit crontab
crontab -e

# Add the following entries:

# Hourly MongoDB backup (every hour at :15)
15 * * * * cd /opt/simplepro && ./scripts/backup/backup-all.sh hourly >> /var/log/simplepro/backup.log 2>&1

# Daily full backup at 2 AM
0 2 * * * cd /opt/simplepro && ./scripts/backup/backup-all.sh daily >> /var/log/simplepro/backup.log 2>&1

# Weekly backup on Sunday at 3 AM with longer retention
0 3 * * 0 cd /opt/simplepro && RETENTION_DAYS=90 ./scripts/backup/backup-all.sh weekly >> /var/log/simplepro/backup.log 2>&1

# Monthly backup on 1st at 4 AM with extended retention
0 4 1 * * cd /opt/simplepro && RETENTION_DAYS=365 ./scripts/backup/backup-all.sh monthly >> /var/log/simplepro/backup.log 2>&1
```

### Systemd Timer (Alternative)

Create systemd service and timer for more robust scheduling:

**Service file: `/etc/systemd/system/simplepro-backup.service`**

```ini
[Unit]
Description=SimplePro Backup Service
After=docker.service

[Service]
Type=oneshot
User=simplepro
WorkingDirectory=/opt/simplepro
ExecStart=/opt/simplepro/scripts/backup/backup-all.sh scheduled
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Timer file: `/etc/systemd/system/simplepro-backup.timer`**

```ini
[Unit]
Description=SimplePro Backup Timer
Requires=simplepro-backup.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable and start:**

```bash
sudo systemctl enable simplepro-backup.timer
sudo systemctl start simplepro-backup.timer
sudo systemctl status simplepro-backup.timer
```

## Verification Procedures

### Verify Backup Integrity

Always verify backups after creation:

```bash
# Verify MongoDB backup checksum
sha256sum -c backups/mongodb/backup_20250101_120000.tar.gz.sha256

# Verify MinIO backup checksum
sha256sum -c backups/minio/backup_20250101_120000.tar.gz.sha256

# List backup contents
tar -tzf backups/mongodb/backup_20250101_120000.tar.gz | head -20
```

### Test Restore Procedure

**CRITICAL**: Test restore procedures regularly in a non-production environment.

```bash
# Restore to test environment
MONGODB_URI=mongodb://localhost:27018 ./scripts/backup/restore-mongodb.sh latest

# Verify restore
mongosh mongodb://localhost:27018/simplepro --eval "db.users.countDocuments()"
```

**Recommended Testing Schedule:**
- **Weekly**: Verify backup integrity (checksums)
- **Monthly**: Test MongoDB restore to staging
- **Quarterly**: Complete disaster recovery drill

## Backup Storage

### Local Storage Requirements

**Minimum Storage:**
- MongoDB: 5GB (typical database size: 1-2GB)
- MinIO: 50GB (document storage varies)
- Configuration: 100MB
- Logs: 10GB

**Total Recommended**: 100GB minimum

### Remote Storage Setup

#### AWS S3

```bash
# Install AWS CLI
sudo apt-get install awscli

# Configure credentials
aws configure

# Sync backups to S3
aws s3 sync ./backups/ s3://simplepro-backups-prod/ \
  --storage-class STANDARD_IA \
  --exclude "*.log"

# Add to backup script
echo 'aws s3 sync ./backups/ s3://simplepro-backups-prod/' >> scripts/backup/backup-all.sh
```

#### Azure Blob Storage

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create storage account and container
az storage account create --name simpleprobackups --resource-group simplepro-rg
az storage container create --name backups --account-name simpleprobackups

# Sync backups
az storage blob upload-batch \
  --destination backups \
  --source ./backups \
  --account-name simpleprobackups
```

#### Google Cloud Storage

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login

# Create bucket
gsutil mb gs://simplepro-backups-prod

# Sync backups
gsutil -m rsync -r -d ./backups gs://simplepro-backups-prod/
```

## Retention Policies

### Backup Retention Schedule

| Backup Type | Frequency | Retention Period | Storage Tier |
|-------------|-----------|------------------|--------------|
| Hourly | Every hour | 7 days | Local disk |
| Daily | 2 AM daily | 30 days | Local + Cloud |
| Weekly | Sunday 3 AM | 90 days | Cloud (Standard) |
| Monthly | 1st of month | 1 year | Cloud (Archive) |
| Yearly | Jan 1st | 7 years | Cold storage |

### Automatic Cleanup

Backup scripts automatically delete old backups based on `RETENTION_DAYS`:

```bash
# The scripts use this command internally
find ./backups -name "*.tar.gz" -type f -mtime +30 -delete
```

### Manual Cleanup

```bash
# List old backups (older than 60 days)
find ./backups -name "*.tar.gz" -type f -mtime +60 -ls

# Delete backups older than 60 days
find ./backups -name "*.tar.gz" -type f -mtime +60 -delete
find ./backups -name "*.sha256" -type f -mtime +60 -delete

# Check storage usage
du -sh ./backups/*
```

## Monitoring and Alerts

### Backup Monitoring

Monitor backup success/failure:

```bash
# Check last backup status
tail -50 /var/log/simplepro/backup.log

# Check backup file timestamps
ls -lht backups/mongodb/*.tar.gz | head -5
ls -lht backups/minio/*.tar.gz | head -5

# Verify recent backups exist
if [ ! -f "$(find backups/mongodb -name "*.tar.gz" -mtime -1)" ]; then
  echo "WARNING: No MongoDB backup in last 24 hours"
fi
```

### Alert Configuration

Add monitoring to cron jobs:

```bash
# Cron job with alerting
0 2 * * * cd /opt/simplepro && ./scripts/backup/backup-all.sh || \
  echo "Backup failed" | mail -s "SimplePro Backup Failure" admin@example.com
```

Or use Prometheus alerting (see DISASTER_RECOVERY.md).

## Troubleshooting

### Common Issues

**1. Backup fails with "disk full" error**

```bash
# Check disk space
df -h

# Clean up old backups
find ./backups -name "*.tar.gz" -type f -mtime +7 -delete

# Compress old backups
find ./backups -name "*.tar.gz" -type f -mtime +30 -exec gzip {} \;
```

**2. MongoDB backup authentication error**

```bash
# Verify MongoDB credentials
mongosh $MONGODB_URI --eval "db.adminCommand('ping')"

# Update credentials in environment
export MONGODB_URI="mongodb://admin:newpassword@localhost:27017"
```

**3. MinIO connection timeout**

```bash
# Check MinIO service
docker ps | grep minio

# Test connectivity
curl http://localhost:9000/minio/health/live

# Verify credentials
mc alias set local http://localhost:9000 admin password
mc ls local/
```

## Best Practices

1. **Test Restores Regularly**: Backups are only useful if they can be restored
2. **Monitor Backup Size**: Unexpected size changes may indicate issues
3. **Encrypt Sensitive Backups**: Use GPG encryption for backups containing PII
4. **Keep Multiple Copies**: 3-2-1 rule (3 copies, 2 different media, 1 offsite)
5. **Document Procedures**: Keep this document updated with any changes
6. **Audit Backup Access**: Log and monitor who accesses backups
7. **Secure Credentials**: Store backup credentials in secrets management system

## Related Documentation

- [Disaster Recovery Procedures](DISASTER_RECOVERY.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Monitoring Setup](MONITORING.md)

## Support

For backup-related issues:
- Check logs: `/var/log/simplepro/backup.log`
- Review script output for error messages
- Verify service status: `docker ps`
- Contact DevOps team: devops@simplepro.com
