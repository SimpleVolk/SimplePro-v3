# Deployment Runbook

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team
**Review Cycle:** Quarterly

## Table of Contents

1. [Overview](#overview)
2. [Deployment Environments](#deployment-environments)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Smoke Testing](#smoke-testing)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Deployment Windows](#deployment-windows)
10. [Communication Protocols](#communication-protocols)
11. [Emergency Deployments](#emergency-deployments)

---

## Overview

### Purpose
This runbook provides step-by-step procedures for deploying SimplePro-v3 across all environments.

### Deployment Strategy
- **Type:** Blue-Green with rolling updates
- **Zero Downtime:** Required for production
- **Automated Tests:** Must pass before deployment
- **Manual Approval:** Required for production

### Key Principles
1. Always deploy to staging first
2. Never skip testing phases
3. Always have a rollback plan
4. Communicate early and often
5. Monitor actively during deployment

---

## Deployment Environments

### Development
- **URL:** http://localhost:3009
- **API:** http://localhost:3001
- **Database:** Single MongoDB instance
- **Purpose:** Local development and testing
- **Deployment:** Manual, on-demand

### Staging
- **URL:** https://staging.simplepro.com
- **API:** https://api-staging.simplepro.com
- **Database:** Replica set (3 nodes)
- **Purpose:** Pre-production testing
- **Deployment:** Automated via CI/CD
- **Data:** Production-like test data

### Production
- **URL:** https://app.simplepro.com
- **API:** https://api.simplepro.com
- **Database:** Replica set (3 nodes + backup)
- **Purpose:** Live customer environment
- **Deployment:** Automated with manual approval
- **Data:** Real customer data

---

## Pre-Deployment Checklist

### Code Review (24-48 hours before)
- [ ] All code changes peer-reviewed
- [ ] All unit tests passing (>80% coverage)
- [ ] All integration tests passing
- [ ] No critical or high severity vulnerabilities
- [ ] Breaking changes documented
- [ ] API documentation updated
- [ ] Database migrations tested

### Infrastructure (12-24 hours before)
- [ ] Backup infrastructure verified
- [ ] Monitoring and alerting functional
- [ ] Database backup completed
- [ ] Disk space verified (>20% free)
- [ ] Load balancer health checks configured
- [ ] SSL certificates valid (>30 days)

### Documentation (Before deployment)
- [ ] Release notes prepared
- [ ] Deployment steps documented
- [ ] Rollback plan documented
- [ ] Known issues listed
- [ ] Customer-facing changes documented
- [ ] API changes documented

### Team Coordination (Before deployment)
- [ ] Deployment team notified (24h advance)
- [ ] Customer success team notified
- [ ] Support team briefed on changes
- [ ] Deployment window communicated
- [ ] On-call engineer identified
- [ ] War room (Slack/Teams) created

### Testing (Must pass)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance tests pass
- [ ] Security scans clean
- [ ] Browser compatibility verified
- [ ] Mobile app compatibility verified

### Database (Critical)
- [ ] Backup completed successfully
- [ ] Backup restoration tested
- [ ] Database migrations prepared
- [ ] Migration rollback tested
- [ ] Index creation planned (if any)
- [ ] Data migration scripts tested

### Application (Final checks)
- [ ] Environment variables configured
- [ ] Feature flags configured
- [ ] Third-party API keys valid
- [ ] SMTP/SMS services configured
- [ ] CDN cache invalidation planned
- [ ] Docker images built and tagged

---

## Staging Deployment

### Prerequisites
```bash
# 1. Ensure on correct branch
git checkout main
git pull origin main

# 2. Verify version tag
git describe --tags

# 3. Check CI/CD status
# Visit: https://github.com/yourorg/SimplePro-v3/actions
```

### Step 1: Database Backup (10 minutes)

```bash
# Connect to staging server
ssh devops@staging.simplepro.com

# Create pre-deployment backup
cd /opt/SimplePro-v3
./scripts/backup/mongodb-backup.sh

# Verify backup
ls -lh /backups/mongodb/$(date +%Y%m%d*)
```

### Step 2: Database Migrations (5-15 minutes)

```bash
# Review pending migrations
npm run migration:show

# Run migrations (dry run first)
npm run migration:run -- --dry-run

# Apply migrations
npm run migration:run

# Verify migrations
npm run migration:verify
```

### Step 3: Application Deployment (10-20 minutes)

```bash
# Pull latest code
cd /opt/SimplePro-v3
git fetch --all --tags
git checkout tags/v1.2.0

# Install dependencies
npm ci --production

# Build applications
npm run build

# Run deployment script
./scripts/deploy-staging.sh

# Expected output:
# - Stopping old containers
# - Starting new containers
# - Running health checks
# - Deployment successful
```

### Step 4: Health Checks (5 minutes)

```bash
# Check API health
curl https://api-staging.simplepro.com/health

# Check database connectivity
./scripts/mongodb/check-replica-health.sh

# Check application logs
docker logs simplepro-api-staging --tail=100

# Verify container status
docker ps --filter "name=simprepro-staging"
```

### Step 5: Smoke Testing (15-30 minutes)

See [Smoke Testing](#smoke-testing) section below.

---

## Production Deployment

### Deployment Window
- **Preferred:** Tuesday/Wednesday, 10 AM - 2 PM EST
- **Avoid:** Monday, Friday, weekends, holidays
- **Duration:** 30-60 minutes
- **Rollback Window:** +2 hours

### Pre-Deployment Final Checks (30 minutes before)

```bash
# 1. Verify staging deployment successful
curl https://api-staging.simplepro.com/health

# 2. Check production system health
./scripts/mongodb/check-replica-health.sh

# 3. Verify backup is recent (<6 hours old)
ls -lth /backups/mongodb/ | head -5

# 4. Check current traffic levels
# View in Grafana: https://grafana.simplepro.com

# 5. Verify all team members present
# Check Slack #deployment channel
```

### Step 1: Pre-Deployment Backup (15 minutes)

```bash
# Connect to production primary server
ssh devops@prod-db-01.simplepro.com

# Create tagged pre-deployment backup
cd /opt/SimplePro-v3
BACKUP_TAG="v1.2.0-pre-deployment"
./scripts/backup/mongodb-backup.sh

# Tag backup
echo "$BACKUP_TAG" > /backups/mongodb/$(date +%Y%m%d*)/DEPLOYMENT_TAG

# Verify backup
./scripts/backup/mongodb-restore.sh $(date +%Y%m%d*) --dry-run

# Expected: "Backup verification successful"
```

### Step 2: Enable Maintenance Mode (Optional)

```bash
# For major deployments with expected downtime
# Update maintenance page
curl -X POST https://api.simplepro.com/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "System maintenance in progress. Expected completion: 11:30 AM EST"}'

# Verify maintenance page
curl https://app.simplepro.com
# Expected: Maintenance page displayed
```

### Step 3: Database Migrations (10-20 minutes)

```bash
# Connect to production API server
ssh devops@prod-api-01.simplepro.com

cd /opt/SimplePro-v3

# Review migrations
npm run migration:show

# Dry run
npm run migration:run -- --dry-run

# Apply migrations (point of no return without rollback)
npm run migration:run

# Verify
npm run migration:verify

# If migrations fail, execute rollback immediately
```

### Step 4: Rolling Application Update (20-30 minutes)

**Blue-Green Deployment:**

```bash
# Current: Blue environment serving traffic
# Deploy to: Green environment

# 1. Deploy to green environment
ssh devops@prod-api-02.simplepro.com  # Green instance
cd /opt/SimplePro-v3
git fetch --all --tags
git checkout tags/v1.2.0
npm ci --production
npm run build

# 2. Start green environment
docker-compose -f docker-compose.production.yml up -d

# 3. Health check green environment
for i in {1..10}; do
  curl http://localhost:3001/health && echo " - OK" || echo " - FAIL"
  sleep 5
done

# 4. Smoke test green environment
./scripts/smoke-test-staging.sh http://localhost:3001

# 5. Switch load balancer to green
# Update nginx/ALB configuration
curl -X POST https://lb.simplepro.com/switch \
  -H "Authorization: Bearer $LB_TOKEN" \
  -d '{"target": "green"}'

# 6. Monitor traffic shift (5 minutes)
watch -n 5 'curl -s https://api.simplepro.com/health | jq'

# 7. If successful, stop blue environment
ssh devops@prod-api-01.simplepro.com
docker-compose -f docker-compose.production.yml stop

# Keep blue environment ready for quick rollback (30 minutes)
```

**Alternative: Rolling Update (Zero Downtime)**

```bash
# Update instances one at a time
for instance in prod-api-01 prod-api-02 prod-api-03; do
  echo "Deploying to $instance..."

  # Remove from load balancer
  curl -X POST https://lb.simplepro.com/remove \
    -d "{\"instance\": \"$instance\"}"

  # Wait for connections to drain
  sleep 30

  # Deploy
  ssh devops@$instance.simplepro.com << 'EOF'
    cd /opt/SimplePro-v3
    git fetch --all --tags
    git checkout tags/v1.2.0
    npm ci --production
    npm run build
    docker-compose -f docker-compose.production.yml up -d
    sleep 10
EOF

  # Health check
  until curl -f http://$instance.simplepro.com:3001/health; do
    echo "Waiting for $instance to be healthy..."
    sleep 5
  done

  # Add back to load balancer
  curl -X POST https://lb.simplepro.com/add \
    -d "{\"instance\": \"$instance\"}"

  # Monitor (2 minutes)
  sleep 120

  echo "$instance deployed successfully"
done
```

### Step 5: Disable Maintenance Mode

```bash
# Disable maintenance mode
curl -X POST https://api.simplepro.com/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'

# Verify application accessible
curl https://app.simplepro.com
# Expected: Application loads
```

### Step 6: Post-Deployment Verification

See [Post-Deployment Verification](#post-deployment-verification) section below.

---

## Smoke Testing

### Automated Smoke Tests

```bash
# Run comprehensive smoke test suite
./scripts/smoke-test-staging.sh

# Expected output:
# ✓ API health check
# ✓ Database connectivity
# ✓ Authentication flow
# ✓ Create job
# ✓ Update job
# ✓ Job listing
# ✓ File upload
# ✓ WebSocket connection
# All tests passed (8/8)
```

### Manual Smoke Tests (15 minutes)

1. **Authentication** (2 minutes)
   - [ ] Login with valid credentials
   - [ ] Login with invalid credentials (expect error)
   - [ ] Logout
   - [ ] Session persistence

2. **Dashboard** (2 minutes)
   - [ ] Dashboard loads
   - [ ] Statistics display correctly
   - [ ] Charts render
   - [ ] Recent activity shows

3. **Jobs Module** (5 minutes)
   - [ ] Create new job
   - [ ] View job details
   - [ ] Update job status
   - [ ] Assign crew
   - [ ] Upload document
   - [ ] Delete job (if applicable)

4. **Customer Module** (3 minutes)
   - [ ] Create customer
   - [ ] View customer details
   - [ ] Update customer info
   - [ ] Customer list displays

5. **Real-time Features** (2 minutes)
   - [ ] WebSocket connection established
   - [ ] Notifications received
   - [ ] Live updates work

6. **Critical Paths** (1 minute)
   - [ ] Generate estimate
   - [ ] Schedule move
   - [ ] Complete job

### Performance Smoke Tests

```bash
# API response times
ab -n 100 -c 10 https://api.simplepro.com/api/jobs

# Expected:
# - Average response time < 200ms
# - 99th percentile < 500ms
# - 0% error rate

# Database query performance
./scripts/mongodb/check-replica-health.sh

# Expected:
# - Primary available
# - Replication lag < 10 seconds
# - Connection pool < 80% utilized
```

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Triggers:**
- Application fails to start
- Health checks fail consistently (>5 minutes)
- Critical functionality broken
- Data corruption detected
- >10% error rate
- Performance degradation >50%

**Decision Window:**
- **0-15 minutes:** Monitor closely
- **15-30 minutes:** Prepare rollback plan
- **30+ minutes:** Execute rollback if issues persist

### Application Rollback (5-10 minutes)

#### Blue-Green Rollback (Fastest)

```bash
# 1. Switch load balancer back to blue environment
curl -X POST https://lb.simplepro.com/switch \
  -H "Authorization: Bearer $LB_TOKEN" \
  -d '{"target": "blue"}'

# 2. Verify traffic shifted
curl https://api.simplepro.com/health

# 3. Stop green environment
ssh devops@prod-api-02.simplepro.com
docker-compose -f docker-compose.production.yml stop

# Expected time: <2 minutes
```

#### Container Rollback

```bash
# Rollback to previous Docker image
for instance in prod-api-01 prod-api-02 prod-api-03; do
  ssh devops@$instance.simplepro.com << 'EOF'
    cd /opt/SimplePro-v3

    # Stop current version
    docker-compose -f docker-compose.production.yml stop

    # Checkout previous version
    git checkout tags/v1.1.0

    # Restart with previous version
    docker-compose -f docker-compose.production.yml up -d

    # Wait for health check
    sleep 10
EOF
done

# Expected time: 5-10 minutes
```

### Database Rollback (15-30 minutes)

#### Rollback Migrations

```bash
# 1. Check migration history
npm run migration:show

# 2. Rollback last migration batch
npm run migration:rollback

# 3. Verify rollback
npm run migration:verify

# Expected time: 5-10 minutes
```

#### Restore from Backup (Last Resort)

```bash
# 1. Identify pre-deployment backup
ls -lh /backups/mongodb/ | grep "$(date +%Y%m%d)"

# 2. Stop application
docker stop simprepro-api

# 3. Restore database
./scripts/backup/mongodb-restore.sh 20251002_100000

# 4. Verify restoration
./scripts/mongodb/check-replica-health.sh

# 5. Restart application
docker start simplepro-api

# Expected time: 20-30 minutes
# WARNING: Data loss possible (changes since backup)
```

### Post-Rollback Actions

1. **Notify Team**
   ```
   Deployment of v1.2.0 rolled back to v1.1.0
   Reason: [specific reason]
   Impact: [customer impact if any]
   Next steps: [root cause analysis]
   ```

2. **Root Cause Analysis**
   - Review deployment logs
   - Check application errors
   - Analyze monitoring data
   - Document lessons learned

3. **Customer Communication** (if applicable)
   - Notify affected customers
   - Explain issue and resolution
   - Provide timeline for fix

---

## Post-Deployment Verification

### Immediate Verification (First 15 minutes)

```bash
# 1. API health check
curl https://api.simplepro.com/health
# Expected: {"status":"ok","version":"1.2.0"}

# 2. Database health
./scripts/mongodb/check-replica-health.sh
# Expected: All members healthy, lag <10s

# 3. Error rates
# Check Grafana: https://grafana.simplepro.com/dashboards/errors
# Expected: <0.1% error rate

# 4. Response times
# Check Grafana: https://grafana.simprepro.com/dashboards/performance
# Expected: p95 <500ms

# 5. Active connections
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "db.serverStatus().connections"
# Expected: Within normal range
```

### Short-term Monitoring (First hour)

Monitor in Grafana:
- [ ] API request rate (normal pattern)
- [ ] Error rate (<0.1%)
- [ ] Response time p95 (<500ms)
- [ ] Database connections (within limits)
- [ ] Replica set health (all healthy)
- [ ] CPU usage (<70%)
- [ ] Memory usage (<80%)
- [ ] Disk I/O (normal pattern)

### Long-term Monitoring (First 24 hours)

- [ ] Check error logs every 2 hours
- [ ] Review customer support tickets (any new issues?)
- [ ] Monitor business metrics (conversion rates, etc.)
- [ ] Verify scheduled jobs running
- [ ] Check notification delivery
- [ ] Validate backup completion

### Sign-off Checklist

After 24 hours of stable operation:
- [ ] No critical issues reported
- [ ] All metrics within acceptable ranges
- [ ] Customer support confirms no deployment-related issues
- [ ] Automated tests passing
- [ ] Backups completing successfully
- [ ] On-call engineer briefed

**Deployment considered successful** ✓

---

## Deployment Windows

### Standard Deployment Windows

**Preferred Windows:**
- **Tuesday:** 10:00 AM - 2:00 PM EST
- **Wednesday:** 10:00 AM - 2:00 PM EST
- **Thursday:** 10:00 AM - 12:00 PM EST (minor updates only)

**Avoid:**
- **Monday:** High traffic, weekend issues may still surface
- **Friday:** No time to fix issues before weekend
- **Weekends:** Reduced team availability
- **Holidays:** Reduced team and customer availability
- **Month-end:** Customers busy with billing/reporting

### Emergency Windows

Emergency deployments (critical security fixes, production outages) can proceed any time with:
- Approval from CTO or VP Engineering
- On-call team notified
- Rollback plan ready
- Monitoring actively watched

---

## Communication Protocols

### Pre-Deployment Notification (24-48 hours before)

**To:** All stakeholders
**Channel:** Email + Slack #announcements
**Template:**
```
Subject: Planned Deployment - [Date/Time]

Hi team,

We have a planned deployment scheduled for:
- Date: Tuesday, October 2, 2025
- Time: 10:00 AM - 11:30 AM EST
- Version: v1.2.0
- Impact: No expected downtime

Release highlights:
- [Feature 1]
- [Feature 2]
- [Bug fix 1]

For detailed release notes: [link]

Questions? Reply to this thread or reach out in #deployment-coordination

- DevOps Team
```

### During Deployment

**Channel:** Slack #deployment-war-room

**Status Updates (every 15 minutes):**
```
10:00 AM - Deployment started
10:15 AM - Database backup complete
10:30 AM - Migrations applied successfully
10:45 AM - Application deployed to green environment
11:00 AM - Traffic switched to new version
11:15 AM - Monitoring - all systems healthy
11:30 AM - Deployment complete ✓
```

### Post-Deployment Summary

**To:** All stakeholders
**Channel:** Email + Slack #announcements
**Template:**
```
Subject: Deployment Complete - v1.2.0

Hi team,

The v1.2.0 deployment has been completed successfully.

Deployment summary:
- Start time: 10:00 AM EST
- End time: 11:30 AM EST
- Duration: 90 minutes
- Status: Successful ✓
- Rollbacks: None

What changed:
- [Feature 1]
- [Feature 2]
- [Bug fix 1]

Post-deployment metrics (first hour):
- Error rate: 0.02% (normal)
- Response time p95: 320ms (improved)
- Uptime: 100%

Full release notes: [link]

Customer-facing changes:
- [Change 1 visible to customers]
- [Change 2 visible to customers]

Known issues: None

The deployment is being monitored for the next 24 hours.

Thanks to everyone involved!

- DevOps Team
```

---

## Emergency Deployments

### Definition
Emergency deployment required for:
- **P0 incidents:** Production outage, data loss
- **Critical security vulnerabilities**
- **Data corruption**
- **Compliance violations**

### Emergency Process

1. **Incident Declaration** (0-5 minutes)
   - Declare P0 incident
   - Page on-call team
   - Create war room

2. **Impact Assessment** (5-10 minutes)
   - Identify affected systems
   - Estimate customer impact
   - Determine fix approach

3. **Fix Development** (10-60 minutes)
   - Develop and test fix
   - Skip standard review process if necessary
   - Document changes

4. **Deployment** (15-30 minutes)
   - Create emergency backup
   - Deploy fix
   - Monitor closely

5. **Verification** (15-30 minutes)
   - Confirm fix resolves issue
   - Check for side effects
   - Monitor metrics

6. **Post-Incident** (Within 48 hours)
   - Post-mortem meeting
   - Document root cause
   - Identify improvements

### Emergency Deployment Approvers

Requires approval from at least one:
- CTO
- VP Engineering
- Director of Engineering
- Senior DevOps Engineer (on-call)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | DevOps Team | Initial creation |

---

**End of Document**
