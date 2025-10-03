# Backup and Recovery Runbook

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Backup Procedures](#backup-procedures)
4. [Recovery Procedures](#recovery-procedures)
5. [Disaster Recovery](#disaster-recovery)
6. [Testing and Validation](#testing-and-validation)

---

## Overview

### Backup Objectives
- **RPO (Recovery Point Objective):** < 5 minutes
- **RTO (Recovery Time Objective):** < 30 minutes
- **Retention:** 30 days (daily), 90 days (weekly), 1 year (monthly)

### Backup Locations
- **Primary:** `/backups/mongodb/` (local server)
- **Secondary:** AWS S3 bucket `simplepro-backups` (optional)
- **Offsite:** Encrypted backups to separate region

---

## Backup Strategy

### Backup Types

#### 1. Continuous Oplog Backup
- **Frequency:** Continuous (every 5 minutes)
- **Purpose:** Point-in-time recovery (PITR)
- **Retention:** 7 days
- **Size:** ~1-5 GB per day
- **Location:** `/backups/mongodb/oplog/`

#### 2. Daily Full Backup
- **Schedule:** 2:00 AM UTC daily
- **Method:** mongodump with compression
- **Retention:** 30 days
- **Size:** ~10-50 GB (compressed)
- **Location:** `/backups/mongodb/daily/YYYYMMDD_HHMMSS/`

#### 3. Weekly Full Backup with Verification
- **Schedule:** Sunday 3:00 AM UTC
- **Method:** mongodump + integrity check
- **Retention:** 90 days
- **Additional:** Restore test to verification environment
- **Location:** `/backups/mongodb/weekly/YYYYMMDD_HHMMSS/`

#### 4. Monthly Archive
- **Schedule:** 1st of month, 4:00 AM UTC
- **Method:** Full dump + metadata
- **Retention:** 1 year
- **Additional:** Upload to cold storage (S3 Glacier)
- **Location:** `/backups/mongodb/monthly/YYYYMM/`

---

## Backup Procedures

### Manual Backup

```bash
# Navigate to project directory
cd D:\Claude\SimplePro-v3

# Run backup script
./scripts/backup/mongodb-backup.sh

# Expected output:
# ================================================
# MongoDB Backup - SimplePro-v3
# ================================================
#
# Backup Date: 2025-10-02 14:30:00
# Backup Directory: /backups/mongodb/20251002_143000
#
# Step 1: Creating full database dump...
# ✓ Database dump completed
# Step 2: Copying backup from container...
# ✓ Backup copied successfully
# Step 3: Creating backup metadata...
# ✓ Metadata created
# Step 4: Verifying backup integrity...
# ✓ Backup verified: 15 collections backed up
# Step 5: Calculating checksums...
# ✓ Checksums calculated
# Step 6: Cleaning up old backups...
# ✓ Old backups cleaned up
#
# ================================================
# Backup Complete!
# ================================================
#
# Backup Location: /backups/mongodb/20251002_143000
# Backup Size: 2.3 GB
# Collections: 15
# Retention: 30 days

# Verify backup exists
ls -lh /backups/mongodb/20251002_143000
```

### Automated Backup (Cron Setup)

```bash
# Edit crontab
crontab -e

# Add backup schedules
# Daily backup at 2 AM UTC
0 2 * * * /opt/SimplePro-v3/scripts/backup/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1

# Weekly backup at 3 AM Sunday (with verification)
0 3 * * 0 /opt/SimplePro-v3/scripts/backup/mongodb-backup.sh --verify >> /var/log/mongodb-backup-weekly.log 2>&1

# Monthly archive at 4 AM on 1st of month
0 4 1 * * /opt/SimplePro-v3/scripts/backup/mongodb-backup.sh --archive >> /var/log/mongodb-backup-monthly.log 2>&1

# Continuous oplog backup (every 5 minutes)
*/5 * * * * /opt/SimplePro-v3/scripts/backup/mongodb-oplog-backup.sh >> /var/log/mongodb-oplog.log 2>&1
```

### Pre-Deployment Backup

**Critical:** Always backup before deployments!

```bash
# 1. Create tagged backup
./scripts/backup/mongodb-backup.sh

# 2. Tag backup with deployment version
BACKUP_DATE=$(ls -1 /backups/mongodb/ | tail -1)
echo "v1.2.0-pre-deployment" > /backups/mongodb/$BACKUP_DATE/DEPLOYMENT_TAG
echo "$(date -Iseconds)" >> /backups/mongodb/$BACKUP_DATE/DEPLOYMENT_TAG
echo "Deployed by: $(whoami)" >> /backups/mongodb/$BACKUP_DATE/DEPLOYMENT_TAG

# 3. Verify backup
./scripts/backup/mongodb-restore.sh $BACKUP_DATE --dry-run

# 4. Document backup in deployment notes
echo "Pre-deployment backup: /backups/mongodb/$BACKUP_DATE" >> deployment-notes.txt
```

### Backup Verification

```bash
# Method 1: Quick verification (checks files exist)
BACKUP_DATE=20251002_143000
if [ -f "/backups/mongodb/$BACKUP_DATE/backup-metadata.json" ] && \
   [ -f "/backups/mongodb/$BACKUP_DATE/checksums.txt" ]; then
  echo "✓ Backup appears valid"
else
  echo "✗ Backup incomplete or corrupted"
fi

# Method 2: Checksum verification
cd /backups/mongodb/$BACKUP_DATE
sha256sum -c checksums.txt
# All checksums should match

# Method 3: Test restore (recommended weekly)
# Start temporary MongoDB instance
docker run -d --name mongo-verify \
  -p 27099:27017 \
  mongo:7.0

# Wait for it to start
sleep 10

# Restore to verification instance
mongorestore \
  --host=localhost:27099 \
  --gzip \
  --dir=/backups/mongodb/$BACKUP_DATE

# Verify data
mongosh --host=localhost:27099 --eval "
  print('Collections: ' + db.getSiblingDB('simplepro').getCollectionNames().length);
  print('Jobs: ' + db.getSiblingDB('simplepro').jobs.countDocuments());
  print('Customers: ' + db.getSiblingDB('simplepro').customers.countDocuments());
"

# Cleanup
docker stop mongo-verify && docker rm mongo-verify
```

### Monitoring Backup Health

```bash
# Check backup freshness (alert if >24 hours old)
LATEST_BACKUP=$(ls -1t /backups/mongodb/ | head -1)
BACKUP_AGE=$(($(date +%s) - $(date -r /backups/mongodb/$LATEST_BACKUP +%s)))
HOURS=$((BACKUP_AGE / 3600))

if [ $HOURS -gt 24 ]; then
  echo "⚠ WARNING: Latest backup is $HOURS hours old"
  # Send alert
  echo "Latest backup is $HOURS hours old" | mail -s "Backup Alert" ops@simplepro.com
else
  echo "✓ Backup is fresh ($HOURS hours old)"
fi

# Check backup disk space
BACKUP_DISK_USAGE=$(df -h /backups | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $BACKUP_DISK_USAGE -gt 80 ]; then
  echo "⚠ WARNING: Backup disk usage at $BACKUP_DISK_USAGE%"
fi
```

---

## Recovery Procedures

### Full Database Restore

**Use Case:** Complete database recovery after catastrophic failure

```bash
# 1. List available backups
ls -lh /backups/mongodb/

# 2. Identify backup to restore
BACKUP_DATE=20251002_143000

# 3. View backup metadata
cat /backups/mongodb/$BACKUP_DATE/backup-metadata.json

# 4. STOP APPLICATION (prevents new writes during restore)
docker stop simplepro-api

# 5. Run restore script
./scripts/backup/mongodb-restore.sh $BACKUP_DATE

# Interactive prompts:
# - Verify backup details
# - Confirm restore (type "yes")
# - Choose to drop existing database
#
# Progress:
# Step 1: Verifying backup integrity...
# ✓ Backup integrity verified
# Step 2: Preparing for restore...
# ✓ API container stopped
# Step 3: Copying backup to MongoDB container...
# ✓ Backup copied to container
# Step 4: Dropping existing database... (if selected)
# ✓ Database dropped
# Step 5: Restoring database...
# ✓ Database restored with oplog replay
# Step 6: Cleaning up...
# ✓ Cleanup complete
# Step 7: Verifying restore...
# ✓ Restore verified: 15 collections restored
#
# ================================================
# Restore Complete!
# ================================================

# 6. Verify restore
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    var db = db.getSiblingDB('simplepro');
    print('Collections: ' + db.getCollectionNames().length);
    print('Total documents: ' +
      db.getCollectionNames().reduce((sum, col) =>
        sum + db[col].countDocuments(), 0
      )
    );
  "

# 7. Check replica set health
./scripts/mongodb/check-replica-health.sh

# 8. Restart application
docker start simplepro-api

# 9. Monitor application
docker logs simplepro-api -f
```

### Partial Collection Restore

**Use Case:** Restore specific collection without affecting others

```bash
# 1. Identify backup and collection
BACKUP_DATE=20251002_143000
COLLECTION=jobs

# 2. Extract collection from backup
BACKUP_DIR=/backups/mongodb/$BACKUP_DATE
COLLECTION_FILE=$BACKUP_DIR/simplepro/$COLLECTION.bson.gz

# Verify collection file exists
if [ ! -f "$COLLECTION_FILE" ]; then
  echo "Error: Collection file not found"
  exit 1
fi

# 3. Backup current collection (safety)
mongodump \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db=simplepro \
  --collection=$COLLECTION \
  --gzip \
  --out=/tmp/pre-restore-backup-$(date +%s)

# 4. Restore collection
mongorestore \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db=simplepro \
  --collection=$COLLECTION \
  --gzip \
  --drop \
  $COLLECTION_FILE

# 5. Verify restoration
mongosh -u admin -p <password> --authenticationDatabase admin --eval "
  print('Collection count: ' +
    db.getSiblingDB('simplepro').$COLLECTION.countDocuments()
  );
"

# 6. Test application functionality
curl -X GET https://api.simplepro.com/api/jobs | jq
```

### Point-in-Time Recovery (PITR)

**Use Case:** Recover to specific timestamp before data corruption

```bash
# Scenario: Data corruption discovered at 14:45, need to recover to 14:30

# 1. Determine target time
TARGET_TIME="2025-10-02T14:30:00Z"
TARGET_TIMESTAMP=$(date -d "$TARGET_TIME" +%s)

# 2. Find nearest backup before target time
BACKUP_BEFORE=$(find /backups/mongodb -type d -name "20251002_14*" | \
  awk -F'_' '{print $1"_"$2}' | \
  awk -v target="$TARGET_TIMESTAMP" '{
    ts = mktime(substr($1,1,4)" "substr($1,5,2)" "substr($1,7,2)" "substr($2,1,2)" "substr($2,3,2)" "substr($2,5,2));
    if (ts < target) print $0;
  }' | tail -1)

echo "Using backup: $BACKUP_BEFORE"

# 3. Stop application
docker stop simplepro-api

# 4. Restore base backup (without oplog replay yet)
./scripts/backup/mongodb-restore.sh $BACKUP_BEFORE --no-oplog-replay

# 5. Find oplog entries for recovery window
OPLOG_DIR=/backups/mongodb/oplog/$BACKUP_BEFORE

# 6. Apply oplog up to target time
mongorestore \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --oplogReplay \
  --oplogLimit="$TARGET_TIMESTAMP:999" \
  --oplogFile=$OPLOG_DIR/local/oplog.rs.bson.gz

# 7. Verify recovery point
mongosh -u admin -p <password> --authenticationDatabase admin --eval "
  var status = db.getSiblingDB('admin').runCommand({replSetGetStatus: 1});
  print('Recovered to: ' + status.optimes.lastCommittedOpTime.ts);
"

# 8. Restart application
docker start simplepro-api

# 9. Verify data integrity
# - Check critical records
# - Verify no corruption present
# - Test application functionality
```

### Individual Document Recovery

**Use Case:** Recover accidentally deleted/modified documents

```bash
# 1. Identify document ID and backup
DOC_ID="507f1f77bcf86cd799439011"
BACKUP_DATE=20251002_143000

# 2. Extract document from backup
mongorestore \
  --uri="mongodb://admin:password@localhost:27099/?authSource=admin" \
  --db=simplepro \
  --collection=jobs \
  --gzip \
  /backups/mongodb/$BACKUP_DATE/simplepro/jobs.bson.gz

# Connect to temporary instance
mongosh --host=localhost:27099 --eval "
  var doc = db.getSiblingDB('simplepro').jobs.findOne({_id: ObjectId('$DOC_ID')});
  printjson(doc);
" > /tmp/recovered-document.json

# 3. Import document to production
mongosh -u admin -p <password> --authenticationDatabase admin --eval "
  var doc = $(cat /tmp/recovered-document.json);
  db.getSiblingDB('simplepro').jobs.insertOne(doc);
"

# Cleanup
docker stop mongo-temp && docker rm mongo-temp
```

---

## Disaster Recovery

### Complete Data Center Failure

**Scenario:** Primary data center completely unavailable

#### Prerequisites
- Offsite backups (S3) up to date
- DR environment provisioned
- DNS failover configured
- Team trained on DR procedures

#### Recovery Steps (RTO: 2-4 hours)

```bash
# PHASE 1: Assess Situation (15 minutes)
# - Confirm primary site down
# - Notify team and stakeholders
# - Activate DR plan
# - Update status page

# PHASE 2: Provision DR Infrastructure (30-60 minutes)

# 1. Launch DR MongoDB cluster (AWS/Azure)
# Use infrastructure-as-code (Terraform)
cd /opt/SimplePro-v3/terraform/dr
terraform apply -var="environment=dr"

# 2. Verify DR cluster healthy
ssh dr-mongodb-01.simplepro.com
./scripts/mongodb/check-replica-health.sh

# PHASE 3: Restore Data (60-90 minutes)

# 1. Download latest backup from S3
aws s3 sync s3://simplepro-backups/mongodb/latest /tmp/restore/

# 2. Restore to DR cluster
mongorestore \
  --uri="mongodb://admin:password@dr-mongodb-01:27017/?replicaSet=simplepro-rs-dr&authSource=admin" \
  --gzip \
  --oplogReplay \
  /tmp/restore/

# 3. Verify data integrity
mongosh --host dr-mongodb-01 -u admin -p <password> --authenticationDatabase admin --eval "
  print('Collections: ' + db.getSiblingDB('simplepro').getCollectionNames().length);
  print('Total docs: ' +
    db.getSiblingDB('simplepro').getCollectionNames()
      .reduce((sum, col) => sum + db[col].countDocuments(), 0)
  );
"

# PHASE 4: Start Application (15-30 minutes)

# 1. Update DNS to point to DR environment
# - Update A records for api.simplepro.com
# - Update A records for app.simplepro.com
# - TTL should be low (300s) for quick propagation

# 2. Deploy application to DR
cd /opt/SimplePro-v3-DR
./scripts/deploy-dr.sh

# 3. Verify application healthy
curl https://api.simprepro.com/health

# PHASE 5: Verification and Monitoring (30 minutes)

# 1. Run smoke tests
./scripts/smoke-test-staging.sh https://api.simplepro.com

# 2. Notify users
# Update status page: "System restored, running on backup infrastructure"

# 3. Monitor closely
# - Watch error rates
# - Monitor performance
# - Check user reports

# PHASE 6: Plan Return to Primary (Future)
# - Assess primary site damage
# - Plan migration back
# - Schedule maintenance window
```

### Replica Set Complete Failure

**Scenario:** All replica set members corrupted/failed

```bash
# 1. Stop all replica set members
docker stop simplepro-mongodb-primary
docker stop simplepro-mongodb-secondary1
docker stop simprepro-mongodb-secondary2

# 2. Remove corrupted volumes
docker volume rm simplepro-v3_mongodb_primary_data
docker volume rm simplepro-v3_mongodb_secondary1_data
docker volume rm simplepro-v3_mongodb_secondary2_data

# 3. Rebuild replica set
./scripts/mongodb/setup-replica-set.sh

# 4. Wait for replica set to stabilize
sleep 60
./scripts/mongodb/check-replica-health.sh

# 5. Restore from backup
LATEST_BACKUP=$(ls -1t /backups/mongodb/ | head -1)
./scripts/backup/mongodb-restore.sh $LATEST_BACKUP

# 6. Verify restore
./scripts/mongodb/check-replica-health.sh

# 7. Restart application
docker start simplepro-api
```

---

## Testing and Validation

### Quarterly DR Drill

**Frequency:** Every 3 months
**Duration:** 4-6 hours
**Participants:** DevOps, Engineering, Management

#### Drill Procedure

1. **Preparation Week:**
   - Review DR procedures
   - Verify backup accessibility
   - Check DR infrastructure provisioned
   - Schedule drill (avoid busy periods)

2. **Drill Day:**
   - Announce drill start
   - Simulate primary site failure
   - Execute DR recovery procedures
   - Document all steps and timing
   - Test application functionality
   - Verify data integrity

3. **Post-Drill:**
   - Calculate actual RTO/RPO achieved
   - Identify issues encountered
   - Update procedures based on learnings
   - Report results to stakeholders

#### Success Criteria
- [ ] DR site operational within RTO (2 hours)
- [ ] Data loss within RPO (5 minutes)
- [ ] All critical functionality working
- [ ] Team able to execute procedures without major issues
- [ ] Documentation accurate and clear

### Monthly Backup Restore Test

```bash
#!/bin/bash
# Monthly backup restore test
# Run on first Sunday of each month

echo "=== Monthly Backup Restore Test ==="
date

# 1. Select random backup from last 30 days
BACKUP=$(find /backups/mongodb -type d -mtime -30 -name "202*" | shuf -n 1)
echo "Testing backup: $BACKUP"

# 2. Start test MongoDB instance
docker run -d --name mongo-test \
  -p 27099:27017 \
  mongo:7.0

sleep 10

# 3. Restore to test instance
mongorestore \
  --host=localhost:27099 \
  --gzip \
  --dir=$BACKUP \
  --oplogReplay 2>&1 | tee /tmp/restore-test.log

# 4. Verify restoration
RESULT=$(mongosh --host=localhost:27099 --quiet --eval "
  var db = db.getSiblingDB('simplepro');
  var collections = db.getCollectionNames().length;
  var docs = db.getCollectionNames()
    .reduce((sum, col) => sum + db[col].countDocuments(), 0);
  print(collections + ',' + docs);
")

COLLECTIONS=$(echo $RESULT | cut -d',' -f1)
DOCUMENTS=$(echo $RESULT | cut -d',' -f2)

# 5. Check results
if [ "$COLLECTIONS" -gt 10 ] && [ "$DOCUMENTS" -gt 1000 ]; then
  echo "✓ Restore test PASSED"
  echo "  Collections: $COLLECTIONS"
  echo "  Documents: $DOCUMENTS"
  STATUS="PASS"
else
  echo "✗ Restore test FAILED"
  echo "  Collections: $COLLECTIONS (expected >10)"
  echo "  Documents: $DOCUMENTS (expected >1000)"
  STATUS="FAIL"
fi

# 6. Cleanup
docker stop mongo-test && docker rm mongo-test

# 7. Log results
echo "$(date -Iseconds),$BACKUP,$STATUS,$COLLECTIONS,$DOCUMENTS" >> /var/log/backup-tests.csv

# 8. Alert if failed
if [ "$STATUS" == "FAIL" ]; then
  echo "Backup restore test failed: $BACKUP" | mail -s "BACKUP TEST FAILURE" ops@simplepro.com
fi

echo "=== Test Complete ==="
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | DevOps Team | Initial creation |

---

**End of Document**
