# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery (DR) procedures for SimplePro-v3 to ensure business continuity in the event of system failures, data corruption, or catastrophic events.

## Table of Contents

1. [Recovery Objectives](#recovery-objectives)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Recovery Procedures](#recovery-procedures)
4. [Failover Procedures](#failover-procedures)
5. [Testing & Validation](#testing--validation)
6. [Roles & Responsibilities](#roles--responsibilities)

## Recovery Objectives

### Recovery Time Objective (RTO)

Maximum acceptable downtime for system restoration:

| System Component | RTO Target | Priority |
|------------------|------------|----------|
| **API Server** | 15 minutes | P0 - Critical |
| **Web Application** | 30 minutes | P0 - Critical |
| **Database (MongoDB)** | 15 minutes | P0 - Critical |
| **Document Storage (MinIO)** | 1 hour | P1 - High |
| **Monitoring Systems** | 2 hours | P2 - Medium |

### Recovery Point Objective (RPO)

Maximum acceptable data loss:

| Data Type | RPO Target | Backup Frequency |
|-----------|------------|------------------|
| **Business Data** (customers, jobs, estimates) | 1 hour | Hourly backups |
| **Documents** | 24 hours | Daily backups |
| **System Configurations** | Last change | On-demand |
| **Application Logs** | 1 week | Weekly backups |

### Service Level Objectives (SLO)

- **Availability**: 99.9% uptime (8.76 hours downtime/year)
- **Data Durability**: 99.999999999% (11 nines)
- **Mean Time to Recovery (MTTR)**: < 30 minutes

## Disaster Scenarios

### 1. Database Failure

**Scenario**: MongoDB becomes unavailable or data corruption occurs

**Impact**: Complete system outage, no access to customer/job data

**Recovery Procedure**: [Database Recovery](#database-recovery)

### 2. Application Server Failure

**Scenario**: API or Web server crashes or becomes unresponsive

**Impact**: Users cannot access the application

**Recovery Procedure**: [Application Server Recovery](#application-server-recovery)

### 3. Storage Failure

**Scenario**: MinIO S3 storage failure or data loss

**Impact**: Documents, photos, signatures unavailable

**Recovery Procedure**: [Storage Recovery](#storage-recovery)

### 4. Complete Infrastructure Loss

**Scenario**: Data center outage, hardware failure, or natural disaster

**Impact**: Complete system unavailability

**Recovery Procedure**: [Full System Recovery](#full-system-recovery)

### 5. Data Corruption or Deletion

**Scenario**: Accidental deletion, malicious activity, or data corruption

**Impact**: Partial or complete data loss

**Recovery Procedure**: [Point-in-Time Recovery](#point-in-time-recovery)

### 6. Security Breach

**Scenario**: Unauthorized access, ransomware, or data breach

**Impact**: Data confidentiality and integrity compromised

**Recovery Procedure**: [Security Incident Response](#security-incident-response)

## Recovery Procedures

### Database Recovery

#### Quick MongoDB Restore

```bash
# 1. Stop the application to prevent writes
docker-compose -f docker-compose.prod.yml stop api

# 2. Restore from latest backup
cd /opt/simplepro
./scripts/backup/restore-mongodb.sh latest --drop

# 3. Verify restore
mongosh mongodb://admin:password@localhost:27017/simplepro --eval "
  print('Users:', db.users.countDocuments());
  print('Customers:', db.customers.countDocuments());
  print('Jobs:', db.jobs.countDocuments());
"

# 4. Restart application
docker-compose -f docker-compose.prod.yml up -d api

# 5. Health check
curl -f http://localhost:3001/api/health
```

**Expected Recovery Time**: 5-10 minutes

#### Point-in-Time Recovery

```bash
# 1. List available backups
ls -lht backups/mongodb/*.tar.gz

# 2. Choose backup from specific time
./scripts/backup/restore-mongodb.sh backup_20250102_140000.tar.gz --drop

# 3. Verify data integrity
mongosh mongodb://localhost:27017/simplepro --eval "
  db.jobs.find().sort({createdAt: -1}).limit(5).pretty()
"
```

### Application Server Recovery

#### Container Restart

```bash
# Check container status
docker ps -a | grep simplepro

# Restart failed container
docker-compose -f docker-compose.prod.yml restart api
docker-compose -f docker-compose.prod.yml restart web

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs -f --tail=100 api
```

#### Full Application Redeployment

```bash
# 1. Pull latest stable images
docker pull ghcr.io/yourorg/simplepro-api:latest
docker pull ghcr.io/yourorg/simplepro-web:latest

# 2. Stop current containers
docker-compose -f docker-compose.prod.yml down

# 3. Deploy new containers
docker-compose -f docker-compose.prod.yml up -d

# 4. Monitor startup
docker-compose -f docker-compose.prod.yml logs -f

# 5. Verify services
curl -f http://localhost:3001/api/health
curl -f http://localhost:3009/health
```

**Expected Recovery Time**: 5-15 minutes

### Storage Recovery

#### MinIO S3 Recovery

```bash
# 1. Stop applications to prevent writes
docker-compose -f docker-compose.prod.yml stop api web

# 2. Restore MinIO data
cd /opt/simplepro
./scripts/backup/restore-minio.sh latest

# 3. Restart MinIO
docker-compose -f docker-compose.prod.yml restart minio

# 4. Verify bucket contents
docker exec -it simplepro-minio mc ls local/simplepro-documents

# 5. Restart applications
docker-compose -f docker-compose.prod.yml up -d api web
```

**Expected Recovery Time**: 15-30 minutes

### Full System Recovery

Complete infrastructure rebuild from backups.

#### Prerequisites

- Access to backup storage (local or cloud)
- Fresh server with Docker installed
- Environment configuration files
- SSL certificates

#### Recovery Steps

```bash
# 1. Provision new server
# - Ubuntu 22.04 LTS
# - 8GB RAM minimum
# - 100GB disk space
# - Docker and Docker Compose installed

# 2. Clone repository
cd /opt
git clone https://github.com/yourorg/simplepro-v3.git simplepro
cd simplepro

# 3. Restore configuration files
# Download from backup storage
aws s3 cp s3://simplepro-backups-prod/config/latest.tar.gz ./
tar -xzf latest.tar.gz
cp -r config/* ./

# 4. Restore environment variables
cp .env.production.backup .env.production

# 5. Start infrastructure services
docker-compose -f docker-compose.prod.yml up -d mongodb redis minio

# Wait for services to be ready
sleep 30

# 6. Restore database
./scripts/backup/restore-mongodb.sh s3://simplepro-backups-prod/mongodb/latest.tar.gz

# 7. Restore MinIO storage
./scripts/backup/restore-minio.sh s3://simplepro-backups-prod/minio/latest.tar.gz

# 8. Start application services
docker-compose -f docker-compose.prod.yml up -d api web

# 9. Start monitoring (optional)
docker-compose -f docker-compose.monitoring.yml up -d

# 10. Verify system health
./scripts/health-check.sh

# 11. Update DNS records (if needed)
# Point domain to new server IP

# 12. Enable SSL
certbot --nginx -d api.simplepro.example.com -d simplepro.example.com
```

**Expected Recovery Time**: 1-2 hours

### Point-in-Time Recovery

Recover to a specific point in time using hourly backups.

```bash
# 1. Identify desired recovery point
ls -lht backups/mongodb/ | grep "backup_$(date +%Y%m%d)"

# 2. Restore to specific backup
./scripts/backup/restore-mongodb.sh backup_20250102_140000.tar.gz --drop

# 3. Verify timestamp of restored data
mongosh mongodb://localhost:27017/simplepro --eval "
  db.jobs.find().sort({updatedAt: -1}).limit(1).pretty()
"

# 4. If recovery point is correct, restart services
docker-compose -f docker-compose.prod.yml restart api

# 5. If incorrect, restore from different backup and repeat
```

### Security Incident Response

In case of security breach or ransomware attack:

#### Immediate Actions (0-15 minutes)

```bash
# 1. ISOLATE - Disconnect from network
docker-compose -f docker-compose.prod.yml down

# 2. ASSESS - Check system integrity
docker run --rm -v /:/host alpine sh -c "
  find /host/opt/simplepro -type f -mtime -1 -ls
"

# 3. PRESERVE - Create forensic snapshot
dd if=/dev/sda of=/mnt/external/forensic-image.dd bs=4M status=progress

# 4. NOTIFY - Alert security team and stakeholders
# Send notification to security@simplepro.com
```

#### Recovery Actions (15-60 minutes)

```bash
# 5. CLEAN - Provision clean environment
# Use fresh server or reinstall OS

# 6. RESTORE - Use oldest known-good backup
./scripts/backup/restore-mongodb.sh backup_BEFORE_INCIDENT.tar.gz --drop

# 7. SECURE - Rotate all credentials
./scripts/production-secrets.sh rotate

# 8. HARDEN - Apply security patches
apt-get update && apt-get upgrade -y

# 9. MONITOR - Enable enhanced logging
# Update logging configuration to verbose mode

# 10. VALIDATE - Verify system integrity
# Run security scans and integrity checks
```

## Failover Procedures

### Database Failover

For production systems with MongoDB replica sets:

```bash
# Check replica set status
mongosh mongodb://localhost:27017 --eval "rs.status()"

# Force failover to specific node
mongosh mongodb://localhost:27017 --eval "rs.stepDown()"

# Verify new primary
mongosh mongodb://localhost:27017 --eval "rs.isMaster()"
```

### Load Balancer Failover

If using multiple application servers:

```bash
# Remove unhealthy server from load balancer
# (Nginx example)
nginx -s reload

# Or use cloud provider CLI
aws elb deregister-instances-from-load-balancer \
  --load-balancer-name simplepro-lb \
  --instances i-unhealthy-instance
```

## Testing & Validation

### DR Drill Schedule

| Test Type | Frequency | Scope | Duration |
|-----------|-----------|-------|----------|
| **Backup Verification** | Weekly | Checksum validation | 15 min |
| **Restore Test** | Monthly | Database restore to staging | 1 hour |
| **Tabletop Exercise** | Quarterly | Walk through DR procedures | 2 hours |
| **Full DR Drill** | Annually | Complete recovery simulation | 4 hours |

### Monthly Restore Test Procedure

```bash
# 1. Schedule test during low-traffic period
echo "DR Test: $(date)" >> /var/log/dr-tests.log

# 2. Provision staging environment
docker-compose -f docker-compose.staging.yml up -d mongodb redis minio

# 3. Restore latest production backup
MONGODB_URI=mongodb://localhost:27018 ./scripts/backup/restore-mongodb.sh latest

# 4. Verify data integrity
# Run automated tests
npm run test:integration

# 5. Measure recovery time
# Record in DR test log

# 6. Document issues and improvements
# Update runbook with lessons learned

# 7. Clean up staging environment
docker-compose -f docker-compose.staging.yml down
```

### Validation Checklist

After any recovery procedure:

- [ ] All services are running (`docker ps`)
- [ ] API health check returns 200 (`curl http://localhost:3001/api/health`)
- [ ] Web application loads successfully
- [ ] Database contains expected data (record counts match)
- [ ] Users can login successfully
- [ ] Critical workflows function (create job, generate estimate)
- [ ] Document uploads/downloads work
- [ ] Monitoring systems show normal metrics
- [ ] Logs show no critical errors
- [ ] SSL certificates are valid
- [ ] Backups resume automatically

## Roles & Responsibilities

### Incident Response Team

| Role | Primary | Backup | Responsibilities |
|------|---------|--------|------------------|
| **Incident Commander** | DevOps Lead | CTO | Overall coordination, decision-making |
| **Database Administrator** | DBA | Senior Dev | Database recovery, data integrity |
| **Systems Engineer** | SysOps | DevOps | Infrastructure, networking, servers |
| **Application Owner** | Tech Lead | Senior Dev | Application functionality, testing |
| **Security Officer** | CISO | Security Analyst | Security assessment, threat mitigation |
| **Communications** | Product Manager | VP Engineering | Stakeholder communication, status updates |

### Contact Information

**Emergency Contacts:**
- On-call Engineer: +1-555-0100 (PagerDuty)
- DevOps Lead: devops-lead@simplepro.com
- CTO: cto@simplepro.com
- Support Hotline: +1-555-0911

**Escalation Path:**
1. On-call Engineer (0-15 min)
2. DevOps Lead (15-30 min)
3. CTO (30+ min or critical incidents)

### Communication Templates

#### Internal Status Update

```
INCIDENT ALERT - SimplePro Production

Status: [INVESTIGATING | MITIGATING | RESOLVED]
Severity: [P0 - Critical | P1 - High | P2 - Medium]
Start Time: [timestamp]
Impact: [description of affected services]
Current Actions: [what is being done]
ETA: [estimated resolution time]
Next Update: [timestamp]

Incident Commander: [name]
```

#### Customer Communication

```
Subject: [ACTION REQUIRED] Service Disruption

Dear SimplePro Users,

We are currently experiencing a service disruption affecting [specific services].

Impact:
- [List of affected features]

Timeline:
- Started: [timestamp]
- Expected Resolution: [ETA]

We are working to resolve this as quickly as possible.
We will provide updates every [interval].

For urgent support, contact: support@simplepro.com

Thank you for your patience.

- SimplePro Team
```

## Automation Scripts

### Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash
set -e

echo "=== SimplePro Health Check ==="

# Check API
if curl -f http://localhost:3001/api/health; then
  echo "✓ API is healthy"
else
  echo "✗ API is unhealthy"
  exit 1
fi

# Check Web
if curl -f http://localhost:3009/health; then
  echo "✓ Web is healthy"
else
  echo "✗ Web is unhealthy"
  exit 1
fi

# Check MongoDB
if docker exec simplepro-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null; then
  echo "✓ MongoDB is healthy"
else
  echo "✗ MongoDB is unhealthy"
  exit 1
fi

# Check Redis
if docker exec simplepro-redis redis-cli ping > /dev/null; then
  echo "✓ Redis is healthy"
else
  echo "✗ Redis is unhealthy"
  exit 1
fi

# Check MinIO
if curl -f http://localhost:9000/minio/health/live; then
  echo "✓ MinIO is healthy"
else
  echo "✗ MinIO is unhealthy"
  exit 1
fi

echo ""
echo "All systems operational"
exit 0
```

## Related Documentation

- [Backup Procedures](BACKUP.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Monitoring Setup](MONITORING.md)
- [Security Policies](SECURITY.md)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-01-02 | Initial DR plan | DevOps Team |

## Appendix

### Useful Commands

```bash
# Quick system status
docker ps && docker-compose -f docker-compose.prod.yml ps

# View recent logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Check disk space
df -h

# Check memory usage
free -h

# View active connections
netstat -an | grep ESTABLISHED | wc -l

# Database connection count
mongosh mongodb://localhost:27017/simplepro --eval "db.serverStatus().connections"

# Container resource usage
docker stats --no-stream
```

### Recovery Time Estimates

Based on typical infrastructure:

| Operation | Time Estimate |
|-----------|---------------|
| Container restart | 30 seconds |
| Database restore (10GB) | 5-10 minutes |
| MinIO restore (50GB) | 15-30 minutes |
| Full system rebuild | 1-2 hours |
| SSL certificate renewal | 15 minutes |
| DNS propagation | 5-30 minutes |

### Support Resources

- Docker Documentation: https://docs.docker.com
- MongoDB Recovery: https://docs.mongodb.com/manual/core/backups/
- MinIO Disaster Recovery: https://min.io/docs/minio/linux/operations/backup-restore.html
