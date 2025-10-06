# CI/CD, Monitoring, and Backup Setup

## Overview

This document provides a comprehensive guide to the CI/CD pipelines, monitoring infrastructure, and backup/disaster recovery systems implemented for SimplePro-v3.

## Table of Contents

1. [CI/CD Pipeline](#cicd-pipeline)
2. [Monitoring & Observability](#monitoring--observability)
3. [Backup & Disaster Recovery](#backup--disaster-recovery)
4. [Quick Start Guide](#quick-start-guide)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

## CI/CD Pipeline

### Overview

SimplePro-v3 uses GitHub Actions for continuous integration and deployment with three main workflows:

1. **CI Pipeline** (`ci.yml`) - Code quality, testing, building
2. **CD Pipeline** (`cd.yml`) - Docker image building and deployment
3. **Release Pipeline** (`release.yml`) - Version releases and production deployments

### CI Pipeline (ci.yml)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

| Job                     | Description                    | Duration |
| ----------------------- | ------------------------------ | -------- |
| **install**             | Install and cache dependencies | ~2 min   |
| **lint**                | ESLint and Prettier checks     | ~1 min   |
| **type-check**          | TypeScript compilation         | ~1 min   |
| **security**            | npm audit and Snyk scanning    | ~2 min   |
| **test-pricing-engine** | Unit tests for pricing engine  | ~1 min   |
| **test-api**            | API unit tests with MongoDB    | ~3 min   |
| **test-web**            | Web component tests            | ~2 min   |
| **build**               | Build all applications         | ~5 min   |

**Total Duration:** ~10-15 minutes

**Features:**

- Parallel job execution for speed
- Dependency caching (node_modules)
- Test coverage reporting to Codecov
- Security vulnerability scanning
- Automated PR comments with status

### CD Pipeline (cd.yml)

**Triggers:**

- Push to `main` (production) or `develop` (staging)
- Manual workflow dispatch

**Jobs:**

| Job                       | Description                             |
| ------------------------- | --------------------------------------- |
| **build-images**          | Build and push Docker images to GHCR    |
| **security-scan**         | Trivy vulnerability scanning            |
| **deploy-staging**        | Deploy to staging environment           |
| **deploy-production**     | Deploy to production (main branch only) |
| **post-deployment-check** | Monitor metrics for 5 minutes           |

**Features:**

- Multi-stage Docker builds with layer caching
- Security scanning with Trivy
- Rolling deployments with health checks
- Automatic rollback on failure
- Slack notifications
- Blue-green deployment strategy for production

### Release Pipeline (release.yml)

**Triggers:**

- Git tags matching `v*.*.*` (e.g., v1.2.3)
- Manual workflow dispatch

**Jobs:**

| Job                          | Description                           |
| ---------------------------- | ------------------------------------- |
| **create-release**           | Generate changelog and GitHub release |
| **build-artifacts**          | Build production artifacts            |
| **build-production-images**  | Tag Docker images with version        |
| **security-scan-production** | Scan production images                |
| **deploy-production**        | Deploy to production                  |
| **post-release**             | Post-deployment tasks                 |

**Features:**

- Automatic changelog generation
- Semantic versioning
- Production artifact archives
- Signed container images (optional)
- Grafana deployment annotations
- Stakeholder notifications

### GitHub Actions Secrets

Configure these in repository settings:

```bash
# Code Quality
CODECOV_TOKEN              # Code coverage reporting
SNYK_TOKEN                 # Security scanning

# Notifications
SLACK_WEBHOOK_URL          # Deployment notifications

# Staging Environment
STAGING_SSH_KEY            # SSH private key
STAGING_HOST               # Hostname or IP
STAGING_USER               # SSH username

# Production Environment
PRODUCTION_SSH_KEY         # SSH private key
PRODUCTION_HOST            # Hostname or IP
PRODUCTION_USER            # SSH username

# Monitoring
GRAFANA_API_KEY            # For deployment annotations
```

## Monitoring & Observability

### Architecture

SimplePro-v3 includes a complete observability stack:

```
Application (API/Web)
    ↓ metrics
Prometheus (metrics storage)
    ↓ visualization
Grafana (dashboards)

Application (logs)
    ↓
Promtail (log shipper)
    ↓
Loki (log aggregation)
    ↓
Grafana (log viewer)

Prometheus Alerts
    ↓
AlertManager
    ↓
Slack/Email/PagerDuty
```

### Components

| Component         | Purpose            | Port | URL                   |
| ----------------- | ------------------ | ---- | --------------------- |
| **Prometheus**    | Metrics collection | 9090 | http://localhost:9090 |
| **Grafana**       | Visualization      | 3033 | http://localhost:3033 |
| **Loki**          | Log aggregation    | 3100 | http://localhost:3100 |
| **AlertManager**  | Alert routing      | 9093 | http://localhost:9093 |
| **Node Exporter** | System metrics     | 9100 | -                     |
| **cAdvisor**      | Container metrics  | 8080 | -                     |

### Starting Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### Accessing Grafana

1. Open http://localhost:3033
2. Login: `admin` / `admin123`
3. Navigate to **Dashboards** → **SimplePro**
4. View **SimplePro Overview** dashboard

### Available Dashboards

**SimplePro Overview:**

- API health status
- Request rate and response time
- Error rates and totals
- Memory usage
- Business metrics (estimates, jobs, customers)

**Custom Dashboards:**
Create your own by navigating to **+ Create** → **Dashboard**

### Metrics Endpoints

Application exposes Prometheus-compatible metrics:

```bash
# All metrics (Prometheus format)
curl http://localhost:3001/metrics

# Health metrics (JSON)
curl http://localhost:3001/metrics/health

# System information
curl http://localhost:3001/metrics/system
```

### Available Metrics

**System Metrics:**

- `process_memory_bytes` - Memory usage (rss, heap_used, heap_total)
- `process_uptime_seconds` - Process uptime
- `database_connected` - Database connection status (1=connected, 0=disconnected)

**HTTP Metrics:**

- `http_requests_total` - Total HTTP requests (counter)
- `http_errors_total` - Total HTTP errors (counter)
- `http_request_duration_seconds` - Request duration (histogram)

**Business Metrics:**

- `business_estimates_created_total` - Total estimates created
- `business_jobs_created_total` - Total jobs created
- `business_customers_created_total` - Total customers created

### Alert Rules

Configured alerts in `monitoring/prometheus/rules/alerts.yml`:

| Alert                    | Trigger                          | Severity |
| ------------------------ | -------------------------------- | -------- |
| **APIDown**              | API unavailable for 1 minute     | Critical |
| **HighErrorRate**        | Error rate > 5% for 5 minutes    | Warning  |
| **HighResponseTime**     | Response time > 2s for 5 minutes | Warning  |
| **DatabaseDisconnected** | DB connection lost for 1 minute  | Critical |
| **HighMemoryUsage**      | Memory > 90% for 5 minutes       | Warning  |
| **HighSystemCPU**        | CPU > 80% for 5 minutes          | Warning  |
| **DiskSpaceLow**         | Disk space < 10%                 | Warning  |
| **NoRecentEstimates**    | No estimates for 2 hours         | Info     |

### Configuring Alerts

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

receivers:
  - name: 'critical'
    slack_configs:
      - channel: '#simplepro-critical'
    email_configs:
      - to: 'oncall@simplepro.com'
```

Then restart AlertManager:

```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

## Backup & Disaster Recovery

### Backup Components

SimplePro-v3 backups include:

| Component         | Criticality | Frequency | Retention |
| ----------------- | ----------- | --------- | --------- |
| **MongoDB**       | Critical    | Hourly    | 30 days   |
| **MinIO S3**      | High        | Daily     | 30 days   |
| **Configuration** | Medium      | On change | 90 days   |
| **Logs**          | Low         | Weekly    | 30 days   |

### Backup Scripts

Located in `scripts/backup/`:

| Script               | Purpose                     |
| -------------------- | --------------------------- |
| `backup-all.sh`      | Complete system backup      |
| `backup-mongodb.sh`  | MongoDB database backup     |
| `backup-minio.sh`    | MinIO S3 bucket backup      |
| `restore-mongodb.sh` | Restore MongoDB from backup |

### Manual Backup

```bash
# Complete backup (MongoDB + MinIO + Config)
./scripts/backup/backup-all.sh production

# Individual backups
./scripts/backup/backup-mongodb.sh
./scripts/backup/backup-minio.sh

# With custom retention
RETENTION_DAYS=90 ./scripts/backup/backup-mongodb.sh
```

Backups are stored in `./backups/`:

- `backups/mongodb/` - Database backups
- `backups/minio/` - S3 bucket backups
- `backups/config/` - Configuration backups

### Automated Backups

**Cron Job Setup (Production):**

```bash
# Edit crontab
crontab -e

# Add backup schedule
# Hourly MongoDB backup
15 * * * * cd /opt/simplepro && ./scripts/backup/backup-all.sh hourly >> /var/log/simplepro/backup.log 2>&1

# Daily full backup at 2 AM
0 2 * * * cd /opt/simplepro && ./scripts/backup/backup-all.sh daily >> /var/log/simplepro/backup.log 2>&1

# Weekly backup on Sunday at 3 AM
0 3 * * 0 cd /opt/simplepro && RETENTION_DAYS=90 ./scripts/backup/backup-all.sh weekly >> /var/log/simplepro/backup.log 2>&1

# Monthly backup on 1st at 4 AM
0 4 1 * * cd /opt/simplepro && RETENTION_DAYS=365 ./scripts/backup/backup-all.sh monthly >> /var/log/simplepro/backup.log 2>&1
```

### Restore Procedures

**Database Restore:**

```bash
# Restore from latest backup
./scripts/backup/restore-mongodb.sh latest --drop

# Restore from specific backup
./scripts/backup/restore-mongodb.sh backup_20250102_140000.tar.gz --drop

# List available backups
ls -lht backups/mongodb/*.tar.gz
```

**Verify Restore:**

```bash
# Check record counts
mongosh mongodb://localhost:27017/simplepro --eval "
  print('Users:', db.users.countDocuments());
  print('Customers:', db.customers.countDocuments());
  print('Jobs:', db.jobs.countDocuments());
"
```

### Recovery Objectives

**RTO (Recovery Time Objective):**

- API Server: 15 minutes
- Database: 15 minutes
- Document Storage: 1 hour

**RPO (Recovery Point Objective):**

- Business Data: 1 hour (hourly backups)
- Documents: 24 hours (daily backups)
- Configuration: Last change

### Disaster Recovery

See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) for complete procedures.

**Quick Recovery Checklist:**

1. ✅ Assess situation and notify team
2. ✅ Stop affected services
3. ✅ Restore from latest backup
4. ✅ Verify data integrity
5. ✅ Restart services
6. ✅ Run health checks
7. ✅ Monitor for issues
8. ✅ Document incident

## Quick Start Guide

### 1. Setup CI/CD

```bash
# 1. Configure GitHub secrets (see above)

# 2. Enable GitHub Actions
# Go to repository Settings → Actions → General
# Enable "Allow all actions and reusable workflows"

# 3. Trigger first CI run
git push origin main

# 4. Monitor pipeline
# Visit: https://github.com/yourorg/simplepro-v3/actions
```

### 2. Setup Monitoring

```bash
# 1. Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Access Grafana
open http://localhost:3033

# 3. Login with default credentials
# Username: admin
# Password: admin123

# 4. View SimplePro Overview dashboard

# 5. Configure alerts (optional)
# Edit: monitoring/alertmanager/alertmanager.yml
# Add your Slack webhook URL
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### 3. Setup Backups

```bash
# 1. Test manual backup
./scripts/backup/backup-all.sh test

# 2. Verify backup created
ls -lh backups/mongodb/
ls -lh backups/minio/

# 3. Test restore (in staging)
./scripts/backup/restore-mongodb.sh latest --drop

# 4. Setup automated backups (production)
crontab -e
# Add cron jobs (see above)

# 5. Setup remote backup storage (optional)
# AWS S3, Azure Blob, or GCP Storage
```

## Configuration

### Customizing CI Pipeline

Edit `.github/workflows/ci.yml`:

```yaml
# Change Node.js version
env:
  NODE_VERSION: '20'

# Modify test commands
- name: Run API tests
  run: npm run test:api -- --maxWorkers=4

# Add custom jobs
custom-job:
  runs-on: ubuntu-latest
  steps:
    - name: Custom step
      run: echo "Custom logic here"
```

### Customizing Monitoring

**Add Custom Metrics:**

Edit `apps/api/src/monitoring/metrics.service.ts`:

```typescript
// Add business metric
recordBusinessEvent('new_event_type'): void {
  this.incrementCounter('business_events_total', {
    type: 'new_event_type'
  });
}
```

**Add Custom Alerts:**

Edit `monitoring/prometheus/rules/alerts.yml`:

```yaml
- alert: CustomAlert
  expr: custom_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'Custom alert fired'
    description: 'Custom alert description'
```

**Add Custom Dashboard:**

1. Create dashboard in Grafana UI
2. Export JSON: **Settings** → **JSON Model**
3. Save to `monitoring/grafana/dashboards/custom-dashboard.json`
4. Restart Grafana to load automatically

### Customizing Backups

**Change Retention:**

```bash
# Set custom retention period
RETENTION_DAYS=60 ./scripts/backup/backup-mongodb.sh
```

**Remote Storage:**

Add to `scripts/backup/backup-all.sh`:

```bash
# AWS S3
aws s3 sync ./backups/ s3://simplepro-backups/

# Azure Blob
az storage blob upload-batch --destination backups --source ./backups/

# Google Cloud Storage
gsutil -m rsync -r ./backups gs://simplepro-backups/
```

## Troubleshooting

### CI/CD Issues

**Pipeline fails with "npm install" error:**

```bash
# Clear GitHub Actions cache
# Repository Settings → Actions → Caches → Delete all caches
# Re-run workflow
```

**Docker build fails:**

```bash
# Check Dockerfile syntax
docker build -f apps/api/Dockerfile .

# Verify context files exist
ls apps/api/
```

**Deployment fails:**

```bash
# Check SSH connectivity
ssh -i ~/.ssh/id_rsa user@production-host

# Verify Docker on remote
ssh user@production-host 'docker ps'
```

### Monitoring Issues

**Grafana not loading:**

```bash
# Check service status
docker-compose -f docker-compose.monitoring.yml ps grafana

# View logs
docker-compose -f docker-compose.monitoring.yml logs grafana

# Restart service
docker-compose -f docker-compose.monitoring.yml restart grafana
```

**Prometheus not scraping:**

```bash
# Check Prometheus targets
open http://localhost:9090/targets

# Verify application metrics endpoint
curl http://localhost:3001/metrics

# Check Prometheus config
docker exec simplepro-prometheus cat /etc/prometheus/prometheus.yml
```

**Alerts not firing:**

```bash
# Check alert rules
open http://localhost:9090/alerts

# Verify AlertManager config
docker exec simplepro-alertmanager cat /etc/alertmanager/alertmanager.yml

# Test alert
curl -X POST http://localhost:9093/api/v1/alerts
```

### Backup Issues

**Backup script fails:**

```bash
# Check disk space
df -h

# Verify MongoDB connectivity
mongosh mongodb://localhost:27017

# Check script permissions
chmod +x scripts/backup/*.sh

# Run with debug
bash -x scripts/backup/backup-mongodb.sh
```

**Restore fails:**

```bash
# Verify backup file exists
ls -lh backups/mongodb/backup_*.tar.gz

# Check backup integrity
sha256sum -c backups/mongodb/backup_*.tar.gz.sha256

# Stop application first
docker-compose -f docker-compose.prod.yml stop api

# Then retry restore
```

## Related Documentation

- [Backup Procedures](BACKUP.md)
- [Disaster Recovery Plan](DISASTER_RECOVERY.md)
- [Main README](../../README.md)
- [CLAUDE.md](../../CLAUDE.md)

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/yourorg/simplepro-v3/issues
- **DevOps Team**: devops@simplepro.com
- **On-call**: +1-555-0100 (PagerDuty)

## Version History

| Version | Date       | Changes                                     |
| ------- | ---------- | ------------------------------------------- |
| 1.0.0   | 2025-01-02 | Initial CI/CD, monitoring, and backup setup |
