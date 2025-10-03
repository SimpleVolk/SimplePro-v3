# Database Operations Runbook

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team
**Review Cycle:** Quarterly

## Table of Contents

1. [Overview](#overview)
2. [Replica Set Architecture](#replica-set-architecture)
3. [Startup and Shutdown Procedures](#startup-and-shutdown-procedures)
4. [Backup Procedures](#backup-procedures)
5. [Restore Procedures](#restore-procedures)
6. [Failover Procedures](#failover-procedures)
7. [Replica Set Management](#replica-set-management)
8. [Index Maintenance](#index-maintenance)
9. [Performance Tuning](#performance-tuning)
10. [Monitoring and Alerting](#monitoring-and-alerting)
11. [Common Issues and Solutions](#common-issues-and-solutions)
12. [Emergency Contacts](#emergency-contacts)

---

## Overview

### Purpose
This runbook provides comprehensive procedures for managing the MongoDB replica set infrastructure for SimplePro-v3.

### System Architecture
- **Database:** MongoDB 7.0
- **Replica Set Name:** simplepro-rs
- **Deployment:** Docker containerized
- **Members:**
  - Primary: `mongodb-primary` (172.22.0.10:27017)
  - Secondary 1: `mongodb-secondary1` (172.22.0.11:27017)
  - Secondary 2: `mongodb-secondary2` (172.22.0.12:27017)

### Key Metrics
- **RTO (Recovery Time Objective):** < 30 seconds (automatic failover)
- **RPO (Recovery Point Objective):** < 5 minutes (with oplog backups)
- **Backup Frequency:** Daily full backups, continuous oplog
- **Backup Retention:** 30 days

---

## Replica Set Architecture

### Configuration
```javascript
{
  _id: "simplepro-rs",
  version: 1,
  members: [
    { _id: 0, host: "172.22.0.10:27017", priority: 2 },  // Primary
    { _id: 1, host: "172.22.0.11:27017", priority: 1 },  // Secondary
    { _id: 2, host: "172.22.0.12:27017", priority: 1 }   // Secondary
  ]
}
```

### Write Concern
```javascript
{
  w: "majority",        // Replicate to majority of nodes
  j: true,              // Journal writes
  wtimeout: 10000       // 10 second timeout
}
```

### Read Preference
- **Application:** `secondaryPreferred` (distribute reads)
- **Transactions:** `primary` (consistency required)
- **Analytics:** `secondary` (offload reporting queries)

---

## Startup and Shutdown Procedures

### Starting the Replica Set

#### Standard Startup
```bash
# 1. Navigate to project root
cd D:\Claude\SimplePro-v3

# 2. Start replica set containers
docker-compose -f docker-compose.mongodb-replica.yml up -d

# 3. Wait for containers to be healthy (2-3 minutes)
docker ps --filter "name=simplepro-mongodb"

# 4. Check replica set status
./scripts/mongodb/check-replica-health.sh

# 5. Verify primary election
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.status()"
```

#### First-Time Setup
```bash
# Run the setup script (handles initialization)
./scripts/mongodb/setup-replica-set.sh

# Or on Windows
scripts\mongodb\setup-replica-set.bat
```

### Graceful Shutdown

#### Standard Shutdown
```bash
# 1. Stop application to prevent new connections
docker stop simplepro-api

# 2. Verify no active connections (optional)
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "db.currentOp()"

# 3. Stop replica set containers (graceful shutdown)
docker-compose -f docker-compose.mongodb-replica.yml stop

# Wait 30 seconds for graceful shutdown
sleep 30

# 4. Verify containers stopped
docker ps --filter "name=simplepro-mongodb"

# 5. Optional: Remove containers (keeps data volumes)
docker-compose -f docker-compose.mongodb-replica.yml down
```

#### Emergency Shutdown
```bash
# Only use in emergency situations (data loss possible)
docker stop simplepro-mongodb-primary simplepro-mongodb-secondary1 simplepro-mongodb-secondary2
```

### Startup Order After Failure

**Important:** Always start the previous primary first to minimize data loss.

```bash
# 1. Start previous primary first
docker start simplepro-mongodb-primary

# 2. Wait 30 seconds for it to stabilize
sleep 30

# 3. Start secondary nodes
docker start simplepro-mongodb-secondary1
docker start simplepro-mongodb-secondary2

# 4. Verify replica set status
./scripts/mongodb/check-replica-health.sh
```

---

## Backup Procedures

### Daily Full Backup

**Schedule:** 2:00 AM UTC daily
**Method:** Full mongodump with oplog
**Location:** `/backups/mongodb/YYYYMMDD_HHMMSS`

#### Manual Backup
```bash
# Run backup script
./scripts/backup/mongodb-backup.sh

# Verify backup completed
ls -lh /backups/mongodb/$(date +%Y%m%d*)

# Check backup integrity
cat /backups/mongodb/$(date +%Y%m%d*)/backup-metadata.json
```

#### Automated Backup (Cron)
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/SimplePro-v3/scripts/backup/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1

# Weekly backup at 3 AM Sunday (with integrity check)
0 3 * * 0 /path/to/SimplePro-v3/scripts/backup/mongodb-backup.sh --verify >> /var/log/mongodb-backup.log 2>&1
```

### Pre-Deployment Backup

**Critical:** Always create a backup before major deployments.

```bash
# 1. Create pre-deployment backup
./scripts/backup/mongodb-backup.sh

# 2. Tag backup with deployment info
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
echo "Pre-deployment backup: v1.2.0" > /backups/mongodb/$BACKUP_DATE/DEPLOYMENT_TAG

# 3. Verify backup
./scripts/backup/mongodb-restore.sh $BACKUP_DATE --dry-run
```

### Continuous Oplog Backup

**Purpose:** Point-in-time recovery (PITR)
**Method:** Continuous oplog tailing

```bash
# Setup oplog backup (run in background)
docker exec -d simplepro-mongodb-primary mongodump \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db=local \
  --collection=oplog.rs \
  --out=/backups/oplog/$(date +%Y%m%d_%H%M%S)
```

### Backup Verification

```bash
# 1. Test restore to isolated environment
docker run -d --name mongo-verify -p 27099:27017 mongo:7.0

# 2. Restore to verification instance
BACKUP_DATE=20251002_140000
mongorestore --host=localhost:27099 \
  --gzip \
  --dir=/backups/mongodb/$BACKUP_DATE

# 3. Verify data integrity
mongosh --host=localhost:27099 --eval "
  db.getSiblingDB('simplepro').jobs.countDocuments()
"

# 4. Cleanup
docker stop mongo-verify && docker rm mongo-verify
```

---

## Restore Procedures

### Full Database Restore

**Use Case:** Complete database recovery after catastrophic failure

```bash
# 1. Identify backup to restore
ls -lh /backups/mongodb/

# 2. Stop application
docker stop simplepro-api

# 3. Run restore script
./scripts/backup/mongodb-restore.sh 20251002_140000

# 4. Verify restore
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').getCollectionNames().length
  "

# 5. Restart application
docker start simplepro-api
```

### Partial Collection Restore

**Use Case:** Restore specific collection(s) without affecting others

```bash
# 1. Extract specific collection from backup
BACKUP_DIR=/backups/mongodb/20251002_140000
TARGET_COLLECTION=jobs

# 2. Restore only specified collection
mongorestore \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db=simplepro \
  --collection=$TARGET_COLLECTION \
  --gzip \
  $BACKUP_DIR/simplepro/$TARGET_COLLECTION.bson.gz

# 3. Verify collection restored
mongosh -u admin -p <password> --authenticationDatabase admin --eval "
  db.getSiblingDB('simplepro').$TARGET_COLLECTION.countDocuments()
"
```

### Point-in-Time Recovery (PITR)

**Use Case:** Recover to specific timestamp (e.g., before data corruption)

```bash
# 1. Find backup before incident
TARGET_TIME="2025-10-02T14:30:00Z"
BACKUP_BEFORE=$(ls /backups/mongodb/ | grep "20251002_14[0-2]" | tail -1)

# 2. Restore base backup
./scripts/backup/mongodb-restore.sh $BACKUP_BEFORE --no-oplog-replay

# 3. Apply oplog up to target time
mongorestore \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplogReplay \
  --oplogLimit="$(date -d "$TARGET_TIME" +%s):1" \
  /backups/oplog/$BACKUP_BEFORE/local/oplog.rs.bson.gz

# 4. Verify recovery point
mongosh -u admin -p <password> --authenticationDatabase admin --eval "
  db.getSiblingDB('admin').runCommand({replSetGetStatus: 1}).optimes
"
```

### Disaster Recovery (Complete Rebuild)

**Scenario:** All replica set members failed, rebuild from scratch

```bash
# 1. Stop all containers
docker-compose -f docker-compose.mongodb-replica.yml down -v

# 2. Remove all volumes (WARNING: destructive!)
docker volume rm simplepro-v3_mongodb_primary_data
docker volume rm simplepro-v3_mongodb_secondary1_data
docker volume rm simplepro-v3_mongodb_secondary2_data

# 3. Setup fresh replica set
./scripts/mongodb/setup-replica-set.sh

# 4. Wait for replica set to stabilize
sleep 30

# 5. Restore from latest backup
LATEST_BACKUP=$(ls -1 /backups/mongodb/ | tail -1)
./scripts/backup/mongodb-restore.sh $LATEST_BACKUP

# 6. Verify data integrity
./scripts/mongodb/check-replica-health.sh

# 7. Restart application
docker start simplepro-api
```

---

## Failover Procedures

### Automatic Failover

MongoDB replica set automatically elects new primary when current primary fails.

**Expected Behavior:**
- Detection: 10-30 seconds (heartbeat timeout)
- Election: 5-15 seconds (voting process)
- Total RTO: < 30 seconds

**Monitoring During Failover:**
```bash
# Watch replica set status
watch -n 1 'docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --quiet --eval "rs.status().members.map(m => ({name: m.name, state: m.stateStr}))"'
```

### Manual Failover (Planned Maintenance)

**Use Case:** Maintenance on primary node

```bash
# 1. Check current primary
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.status().members.find(m => m.stateStr === 'PRIMARY').name"

# 2. Step down primary (triggers election)
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.stepDown(60)"

# 3. Wait for new primary election (10-15 seconds)
sleep 15

# 4. Verify new primary elected
docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.status().members.find(m => m.stateStr === 'PRIMARY').name"

# 5. Perform maintenance on old primary
docker exec simplepro-mongodb-primary <maintenance-command>

# 6. Verify node rejoined as secondary
./scripts/mongodb/check-replica-health.sh
```

### Forced Failover (Emergency)

**Only use if automatic failover fails**

```bash
# 1. Stop problematic primary
docker stop simplepro-mongodb-primary

# 2. Force reconfiguration on secondary
docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    var config = rs.conf();
    config.members = config.members.filter(m => m.host !== '172.22.0.10:27017');
    config.version++;
    rs.reconfig(config, {force: true});
  "

# 3. Verify new primary
./scripts/mongodb/check-replica-health.sh

# 4. When old primary is fixed, re-add it
docker start simplepro-mongodb-primary
sleep 30

docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.add({host: '172.22.0.10:27017', priority: 2})
  "
```

---

## Replica Set Management

### Adding a New Member

```bash
# 1. Start new MongoDB container
docker run -d \
  --name simplepro-mongodb-secondary3 \
  --network storage-network \
  --ip 172.22.0.13 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:7.0 \
  mongod --replSet simplepro-rs --bind_ip_all

# 2. Add to replica set
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.add({
      host: '172.22.0.13:27017',
      priority: 1,
      votes: 1
    })
  "

# 3. Wait for initial sync (may take hours for large datasets)
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.status().members.find(m => m.name === '172.22.0.13:27017')
  "

# 4. Monitor sync progress
watch -n 5 './scripts/mongodb/check-replica-health.sh'
```

### Removing a Member

```bash
# 1. Check current configuration
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.conf()"

# 2. Remove member
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.remove('172.22.0.13:27017')
  "

# 3. Verify removal
./scripts/mongodb/check-replica-health.sh

# 4. Stop and remove container
docker stop simplepro-mongodb-secondary3
docker rm simplepro-mongodb-secondary3
```

### Replacing a Failed Member

```bash
# 1. Remove failed member from replica set
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.remove('172.22.0.11:27017')
  "

# 2. Stop and remove failed container
docker stop simprepro-mongodb-secondary1
docker rm simplepro-mongodb-secondary1

# 3. Remove old volume
docker volume rm simplepro-v3_mongodb_secondary1_data

# 4. Start new container (will get fresh data via initial sync)
docker-compose -f docker-compose.mongodb-replica.yml up -d mongodb-secondary1

# 5. Add new member to replica set
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.add('172.22.0.11:27017')
  "

# 6. Monitor initial sync
./scripts/mongodb/check-replica-health.sh
```

---

## Index Maintenance

### Viewing Current Indexes

```bash
# List all indexes in database
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').getCollectionNames().forEach(function(col) {
      print('Collection: ' + col);
      printjson(db.getSiblingDB('simplepro')[col].getIndexes());
    });
  "
```

### Creating Indexes on Secondaries First

**Best Practice:** Build indexes on secondaries before primary to minimize impact

```bash
# 1. Step down primary
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.stepDown(300)"

# 2. Build index on new secondaries (old primary)
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').jobs.createIndex(
      { createdAt: 1, status: 1 },
      { background: true, name: 'idx_jobs_createdAt_status' }
    )
  "

# 3. Wait for index build to complete
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.currentOp({ 'command.createIndexes': { \$exists: true } })
  "

# 4. Repeat for other secondaries
# ...

# 5. Finally build on current primary
docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').jobs.createIndex(
      { createdAt: 1, status: 1 },
      { background: true, name: 'idx_jobs_createdAt_status' }
    )
  "
```

### Rebuilding Indexes

```bash
# Rebuild all indexes on a collection
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').jobs.reIndex()
  "
```

### Monitoring Index Usage

```bash
# Check index usage statistics
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').jobs.aggregate([
      { \$indexStats: {} }
    ]).forEach(printjson)
  "
```

---

## Performance Tuning

### Connection Pool Tuning

Current settings (in `database.module.ts`):
```typescript
maxPoolSize: 100
minPoolSize: 10
maxIdleTimeMS: 300000  // 5 minutes
```

**Monitoring Pool Usage:**
```bash
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.serverStatus().connections
  "
```

### Query Performance Analysis

```bash
# Enable profiling (level 2 = all operations)
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').setProfilingLevel(2)
  "

# View slow queries
docker exec simprepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').system.profile.find({
      millis: { \$gt: 100 }
    }).sort({ millis: -1 }).limit(10).forEach(printjson)
  "

# Disable profiling
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').setProfilingLevel(0)
  "
```

### WiredTiger Cache Optimization

Default: 50% of RAM - 1GB (or 256MB minimum)

```bash
# Check current cache usage
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    var status = db.serverStatus().wiredTiger.cache;
    print('Cache Size: ' + (status['bytes currently in the cache'] / 1024 / 1024).toFixed(2) + ' MB');
    print('Max Size: ' + (status['maximum bytes configured'] / 1024 / 1024).toFixed(2) + ' MB');
    print('Evicted: ' + status['unmodified pages evicted']);
  "
```

### Compacting Collections

```bash
# Compact collection to reclaim disk space
docker exec simprepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').runCommand({ compact: 'jobs', force: true })
  "
```

---

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Replica Set Health**
   - Primary availability
   - Secondary lag < 10 seconds
   - All members healthy (health: 1)

2. **Performance Metrics**
   - Query response time < 100ms (p95)
   - Connection pool utilization < 80%
   - WiredTiger cache hit ratio > 95%

3. **Resource Utilization**
   - CPU usage < 70%
   - Memory usage < 80%
   - Disk usage < 80%
   - Disk I/O latency < 10ms

4. **Replication Metrics**
   - Replication lag < 10 seconds
   - Oplog window > 24 hours

### Health Check Script

```bash
# Run comprehensive health check
./scripts/mongodb/check-replica-health.sh

# Automated monitoring (every 5 minutes)
*/5 * * * * /path/to/SimplePro-v3/scripts/mongodb/check-replica-health.sh | \
  grep -E '(ERROR|WARN|✗)' && \
  echo "MongoDB health check failed" | mail -s "MongoDB Alert" ops@simplepro.com
```

### MongoDB Exporter (Prometheus)

Metrics available at: `http://localhost:9216/metrics`

Key metrics:
- `mongodb_up` - Replica set availability
- `mongodb_rs_members_health` - Member health status
- `mongodb_rs_members_optimeDate` - Replication lag
- `mongodb_connections_current` - Active connections
- `mongodb_opcounters_total` - Operation counters

---

## Common Issues and Solutions

### Issue: Replica Set Member Down

**Symptoms:**
- Health check shows member with health: 0
- "No primary found" errors in application logs

**Diagnosis:**
```bash
./scripts/mongodb/check-replica-health.sh
docker logs simplepro-mongodb-primary
```

**Solution:**
```bash
# Restart failed member
docker restart simplepro-mongodb-primary

# If restart fails, check disk space
docker exec simplepro-mongodb-primary df -h

# Check for corruption
docker exec simprepro-mongodb-primary mongod --dbpath=/data/db --repair
```

### Issue: High Replication Lag

**Symptoms:**
- Secondary lag > 60 seconds
- "Replication lag too high" alerts

**Diagnosis:**
```bash
# Check oplog window
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    var oplog = db.getSiblingDB('local').oplog.rs.find().sort({\$natural: -1}).limit(1).next();
    var first = db.getSiblingDB('local').oplog.rs.find().sort({\$natural: 1}).limit(1).next();
    print('Oplog window: ' + ((oplog.ts.getTime() - first.ts.getTime()) / 3600) + ' hours');
  "

# Check secondary performance
docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.serverStatus().metrics.repl
  "
```

**Solutions:**
1. **Increase oplog size** (if window < 24 hours)
2. **Optimize slow queries** (reducing load on primary)
3. **Add more secondaries** (distribute read load)
4. **Increase resources** (CPU/memory for secondary)

### Issue: Out of Disk Space

**Symptoms:**
- "No space left on device" errors
- Database write failures

**Immediate Actions:**
```bash
# Check disk usage
docker exec simplepro-mongodb-primary df -h

# Compact collections to reclaim space
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').getCollectionNames().forEach(function(col) {
      print('Compacting: ' + col);
      db.getSiblingDB('simplepro').runCommand({ compact: col, force: true });
    });
  "

# Remove old logs
docker exec simplepro-mongodb-primary find /data/db/journal -type f -mtime +7 -delete

# Clean up old backups
find /backups/mongodb -type d -mtime +30 -exec rm -rf {} \;
```

### Issue: Connection Pool Exhausted

**Symptoms:**
- "No connection available" errors
- Application timeouts

**Diagnosis:**
```bash
# Check current connections
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    var status = db.serverStatus().connections;
    print('Current: ' + status.current);
    print('Available: ' + status.available);
    print('Active: ' + status.active);
  "

# Find long-running operations
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.currentOp({ 'active': true, 'secs_running': { \$gt: 10 } })
  "
```

**Solutions:**
1. **Increase pool size** (update `MONGODB_MAX_POOL_SIZE`)
2. **Kill long-running queries**
3. **Optimize slow queries**
4. **Add read replicas**

### Issue: Authentication Failed

**Symptoms:**
- "Authentication failed" errors
- Cannot connect to database

**Solutions:**
```bash
# Verify credentials
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "db.getUsers()"

# Reset user password
docker exec simplepro-mongodb-primary mongosh -u admin -p <old-password> \
  --authenticationDatabase admin --eval "
    db.changeUserPassword('admin', 'new-password')
  "

# Recreate user if necessary
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.dropUser('simplepro_app');
    db.getSiblingDB('simplepro').createUser({
      user: 'simplepro_app',
      pwd: 'new-password',
      roles: [{ role: 'readWrite', db: 'simplepro' }]
    });
  "
```

---

## Emergency Contacts

### On-Call Rotation

- **Primary:** DevOps Lead - +1-555-0100
- **Secondary:** Backend Lead - +1-555-0101
- **Escalation:** CTO - +1-555-0199

### Escalation Procedures

1. **P0 (Critical):** Call primary on-call immediately
2. **P1 (High):** Page on-call within 15 minutes
3. **P2 (Medium):** Create ticket, notify during business hours
4. **P3 (Low):** Create ticket for next sprint

### Communication Channels

- **Slack:** #ops-alerts, #database-team
- **PagerDuty:** MongoDB service
- **Email:** ops@simplepro.com

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | DevOps Team | Initial creation |

---

**End of Document**
