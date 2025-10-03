# SimplePro-v3 Operations Documentation

**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team

## Quick Reference

This directory contains comprehensive operational runbooks for managing SimplePro-v3 infrastructure.

## Available Runbooks

### 1. [MongoDB Replica Set Setup Guide](./MONGODB_REPLICA_SET_SETUP.md)
**Use for:** Initial setup and configuration of MongoDB replica set

**Quick Start:**
```bash
cd D:\Claude\SimplePro-v3
./scripts/mongodb/setup-replica-set.sh  # Linux/Mac
scripts\mongodb\setup-replica-set.bat   # Windows
```

**Key Topics:**
- Architecture overview
- Installation steps
- Configuration guidelines
- Testing and verification
- Troubleshooting

---

### 2. [Database Operations Runbook](./DATABASE_OPERATIONS_RUNBOOK.md)
**Use for:** Day-to-day database management tasks

**Common Operations:**
```bash
# Health check
./scripts/mongodb/check-replica-health.sh

# Backup
./scripts/backup/mongodb-backup.sh

# Restore
./scripts/backup/mongodb-restore.sh <backup-date>

# Manual failover
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.stepDown(60)"
```

**Key Topics:**
- Startup/shutdown procedures
- Backup and restore procedures
- Failover procedures (automatic and manual)
- Replica set management (add/remove members)
- Index maintenance
- Performance tuning
- Common issues and solutions

---

### 3. [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
**Use for:** Deploying application updates

**Quick Deploy (Staging):**
```bash
cd D:\Claude\SimplePro-v3
./scripts/deploy-staging.sh
```

**Quick Deploy (Production):**
```bash
# Pre-deployment backup
./scripts/backup/mongodb-backup.sh

# Deploy
./scripts/deploy-prod.sh

# Verify
./scripts/smoke-test-staging.sh https://api.simplepro.com
```

**Key Topics:**
- Pre-deployment checklist (15+ items)
- Staging deployment procedure
- Production deployment (blue-green)
- Smoke testing
- Rollback procedures
- Post-deployment verification
- Communication protocols

---

### 4. [Incident Response Runbook](./INCIDENT_RESPONSE_RUNBOOK.md)
**Use for:** Handling production incidents

**Severity Levels:**
- **P0 (Critical):** Complete outage, data loss - Response: Immediate
- **P1 (High):** Major feature down - Response: <15 min
- **P2 (Medium):** Minor degradation - Response: <1 hour
- **P3 (Low):** Cosmetic issues - Response: Next business day

**Quick Incident Response:**
```bash
# 1. Acknowledge alert
# 2. Quick health check
curl https://api.simplepro.com/health
./scripts/mongodb/check-replica-health.sh

# 3. Check logs
docker logs simplepro-api --since 10m | grep -i error
docker logs simplepro-mongodb-primary --tail=100

# 4. Create war room (for P0/P1)
# Slack: #incident-[timestamp]

# 5. Follow incident response phases
```

**Key Topics:**
- Incident severity levels
- Response process (6 phases)
- Common incident scenarios
- Communication protocols
- Post-incident review

---

### 5. [Backup and Recovery Runbook](./BACKUP_RECOVERY_RUNBOOK.md)
**Use for:** Backup management and disaster recovery

**Backup Strategy:**
- **Continuous:** Oplog every 5 minutes (RPO: <5 min)
- **Daily:** Full backup at 2 AM UTC (Retention: 30 days)
- **Weekly:** Verified backup Sunday 3 AM (Retention: 90 days)
- **Monthly:** Archive 1st of month (Retention: 1 year)

**Quick Restore:**
```bash
# List backups
ls -lh /backups/mongodb/

# Restore from backup
./scripts/backup/mongodb-restore.sh 20251002_143000

# Verify
./scripts/mongodb/check-replica-health.sh
```

**Key Topics:**
- Backup strategy and schedules
- Manual and automated backups
- Full database restore
- Partial collection restore
- Point-in-time recovery (PITR)
- Disaster recovery procedures
- Testing and validation

---

## Quick Command Reference

### Health Checks
```bash
# Replica set health
./scripts/mongodb/check-replica-health.sh

# API health
curl http://localhost:3001/health

# All containers
docker ps --filter "name=simplepro"
```

### Backup Operations
```bash
# Create backup
./scripts/backup/mongodb-backup.sh

# List backups
ls -lt /backups/mongodb/ | head -10

# Restore backup
./scripts/backup/mongodb-restore.sh <YYYYMMDD_HHMMSS>
```

### Deployment
```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Deploy to production
./scripts/deploy-prod.sh

# Rollback
docker-compose -f docker-compose.production.yml restart
```

### Monitoring
```bash
# Prometheus
http://localhost:9090

# Grafana
http://localhost:3000

# MongoDB Exporter Metrics
curl http://localhost:9216/metrics
```

### Logs
```bash
# API logs
docker logs simplepro-api --tail=100 -f

# Database logs
docker logs simplepro-mongodb-primary --tail=100 -f

# All logs
docker-compose -f docker-compose.mongodb-replica.yml logs -f
```

---

## Emergency Contacts

### On-Call Rotation
- **Primary:** DevOps Lead - +1-555-0100
- **Secondary:** Backend Lead - +1-555-0101
- **Escalation:** CTO - +1-555-0199

### Communication Channels
- **Critical Incidents:** Slack #ops-critical, PagerDuty
- **Warnings:** Slack #ops-alerts
- **General:** Slack #ops, Email ops@simplepro.com

---

## Monitoring and Alerts

### Key Metrics to Watch

**Replica Set Health:**
- ✅ All members healthy (health: 1)
- ✅ Replication lag <10 seconds
- ✅ Primary available

**Performance:**
- ✅ Response time p95 <500ms
- ✅ Error rate <0.1%
- ✅ Connection pool <80% utilized

**Resources:**
- ✅ CPU <70%
- ✅ Memory <80%
- ✅ Disk space >20% free

### Critical Alerts

If you receive any of these alerts, take immediate action:

1. **MongoDBReplicaSetMemberDown**
   - Action: Check logs and restart member
   - Runbook: Database Operations → Replica Set Member Down

2. **MongoDBNoPrimary**
   - Action: Verify election in progress, manual intervention if stuck
   - Runbook: Database Operations → Failover Procedures

3. **MongoDBConnectionPoolExhausted**
   - Action: Increase pool size or investigate leaks
   - Runbook: Incident Response → Connection Pool Exhausted

4. **MongoDBCriticalDiskSpace**
   - Action: Clean up or expand disk immediately
   - Runbook: Incident Response → Disk Space Critical

5. **MongoDBBackupNotRecent**
   - Action: Check backup cron and run manual backup
   - Runbook: Backup and Recovery → Automated Backup

---

## Maintenance Windows

### Preferred Windows
- **Tuesday/Wednesday:** 10 AM - 2 PM EST
- **Avoid:** Monday, Friday, weekends, holidays, month-end

### Scheduled Maintenance
- **Database patching:** Monthly (2nd Tuesday)
- **Infrastructure updates:** Quarterly
- **DR drills:** Quarterly
- **Backup restore tests:** Monthly

---

## Training Resources

### Required Reading
1. MongoDB Replica Set Setup Guide (this folder)
2. Database Operations Runbook
3. Incident Response Runbook

### Recommended Training
- MongoDB University: M103 (Basic Cluster Administration)
- MongoDB University: M201 (MongoDB Performance)
- Internal: SimplePro Architecture Overview
- Internal: On-Call Training

### Hands-On Practice
- Complete replica set setup in staging
- Perform test failover
- Execute backup and restore
- Run through incident response scenarios

---

## Document Maintenance

### Review Schedule
- **Quarterly:** Review all runbooks for accuracy
- **After Incidents:** Update based on lessons learned
- **After Major Changes:** Update affected runbooks immediately

### Contributing
1. Create branch for documentation updates
2. Make changes to relevant runbooks
3. Test procedures if applicable
4. Submit PR with clear description of changes
5. Get review from DevOps team member

### Version History
All runbooks include version history at the bottom. Major changes require version increment.

---

## Additional Resources

### Internal Links
- [SimplePro-v3 Main README](../../README.md)
- [CLAUDE.md Developer Guide](../../CLAUDE.md)
- [Architecture Documentation](../architecture/)
- [API Documentation](../api/)

### External References
- [MongoDB Replica Set Documentation](https://docs.mongodb.com/manual/replication/)
- [MongoDB Operations Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)
- [Prometheus MongoDB Exporter](https://github.com/percona/mongodb_exporter)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## Support

### Getting Help

**For Operational Questions:**
- Slack: #ops or #database-team
- Email: ops@simplepro.com
- Documentation: This folder

**For Incidents:**
- P0/P1: Page on-call via PagerDuty
- P2/P3: Create ticket in Jira
- Communication: Slack #ops-alerts

**For Documentation Issues:**
- Submit PR with corrections
- Email: devops-team@simplepro.com
- Slack: #ops

---

**Last Updated:** 2025-10-02
**Next Review:** 2026-01-02
**Maintained By:** DevOps Team
