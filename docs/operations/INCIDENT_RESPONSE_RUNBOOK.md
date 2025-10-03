# Incident Response Runbook

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team

## Table of Contents

1. [Overview](#overview)
2. [Incident Severity Levels](#incident-severity-levels)
3. [Incident Response Process](#incident-response-process)
4. [Common Incident Scenarios](#common-incident-scenarios)
5. [Communication Protocols](#communication-protocols)
6. [Post-Incident Review](#post-incident-review)

---

## Overview

### Purpose
This runbook provides systematic procedures for responding to production incidents in SimplePro-v3.

### Key Objectives
- Minimize customer impact
- Restore service quickly
- Preserve evidence for post-mortem
- Learn and improve from incidents

###On-Call Contacts
- **Primary On-Call:** See PagerDuty schedule
- **Backup On-Call:** See PagerDuty schedule
- **Escalation:** CTO +1-555-0199

---

## Incident Severity Levels

### P0 - Critical (Response Time: Immediate)

**Definition:**
- Complete system outage
- Data loss or corruption
- Security breach
- Customer data exposed

**Response:**
- Page entire on-call team immediately
- Create war room (Slack #incident-p0)
- Executive notification required
- All hands on deck

**Examples:**
- Database cluster down
- API completely unresponsive
- Data breach detected
- Payment processing failure

**Target Resolution:** < 1 hour

---

### P1 - High (Response Time: <15 minutes)

**Definition:**
- Major feature unavailable
- Severe performance degradation
- Affecting multiple customers
- Revenue-impacting

**Response:**
- Page primary on-call
- Create war room (Slack #incident-p1)
- Manager notification
- Prioritize above all other work

**Examples:**
- Primary database node down (replica set functioning)
- Authentication system issues
- Job creation failing
- File upload service down

**Target Resolution:** < 4 hours

---

### P2 - Medium (Response Time: <1 hour)

**Definition:**
- Minor feature degradation
- Affecting small number of customers
- Workaround available
- Non-critical functionality

**Response:**
- Notify primary on-call
- Create ticket
- Slack notification to #ops
- Address during business hours

**Examples:**
- Slow query performance
- Non-critical API endpoints timing out
- Email notifications delayed
- Minor UI issues

**Target Resolution:** < 24 hours

---

### P3 - Low (Response Time: Next business day)

**Definition:**
- Cosmetic issues
- Minimal customer impact
- Enhancement requests
- Documentation issues

**Response:**
- Create ticket
- Schedule in next sprint
- No immediate action required

**Examples:**
- Typos in UI
- Non-critical logging errors
- Performance optimization opportunities
- Documentation updates

**Target Resolution:** Next sprint

---

## Incident Response Process

### Phase 1: Detection and Triage (0-5 minutes)

#### Detection Methods
- **Automated Alerts:** Grafana, PagerDuty
- **Customer Reports:** Support tickets, calls
- **Monitoring:** Real-time dashboards
- **Team Reports:** Slack, email

#### Initial Actions
```bash
# 1. Acknowledge alert
# In PagerDuty: Click "Acknowledge"

# 2. Quick health check
curl https://api.simplepro.com/health
./scripts/mongodb/check-replica-health.sh

# 3. Check error logs (last 10 minutes)
docker logs simplepro-api --since 10m | grep -i error

# 4. Review metrics
# Open: https://grafana.simplepro.com/dashboards/overview
```

#### Severity Assessment
Ask:
- How many customers affected?
- Is system functional at all?
- Is data at risk?
- Is there a security concern?

Assign severity level (P0-P3)

---

### Phase 2: Incident Declaration (5-10 minutes)

#### For P0/P1 Incidents

1. **Create War Room**
   ```
   Slack: Create #incident-[timestamp]
   Bridge: Start video call
   Title: [P0/P1] Brief description
   ```

2. **Assign Roles**
   - **Incident Commander:** Coordinates response
   - **Technical Lead:** Directs technical troubleshooting
   - **Communications Lead:** Updates stakeholders
   - **Scribe:** Documents actions and timeline

3. **Initial Status Message**
   ```
   🚨 INCIDENT DECLARED 🚨

   Severity: P1
   Status: Investigating
   Impact: Job creation failing, ~50% of requests
   Started: 2025-10-02 14:30 UTC
   Team: @john (IC), @sarah (Tech Lead)

   Updates every 15 minutes in this channel.
   ```

---

### Phase 3: Investigation (10-30 minutes)

#### Investigation Checklist
- [ ] Check application logs
- [ ] Check database status
- [ ] Check infrastructure (CPU, memory, disk)
- [ ] Check network connectivity
- [ ] Check recent deployments
- [ ] Check configuration changes
- [ ] Check third-party services
- [ ] Review monitoring dashboards

#### Investigation Commands
```bash
# Application logs
docker logs simplepro-api --tail=500 | grep -E "(ERROR|FATAL)"

# Database status
./scripts/mongodb/check-replica-health.sh

# System resources
docker stats simplepro-api simplepro-mongodb-primary

# Recent deployments
git log --oneline -10

# Network connectivity
docker exec simplepro-api ping -c 3 mongodb-primary
docker exec simplepro-api curl -v https://external-api.com

# Active connections
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "db.currentOp({'active': true})"
```

#### Document Findings
Keep running log in Slack:
```
14:35 - Checking application logs - high error rate in job controller
14:37 - Database status - all nodes healthy
14:40 - Identified issue: MongoDB connection pool exhausted
14:42 - Root cause: Connections not being released properly
```

---

### Phase 4: Mitigation (30-60 minutes)

#### Mitigation Strategies

**Quick Wins (Try First):**
1. Restart affected service
2. Clear cache
3. Increase resource limits
4. Enable maintenance mode
5. Failover to backup system

**Example: Restart Service**
```bash
# Graceful restart
docker restart simplepro-api

# Monitor restart
watch -n 1 'curl -s https://api.simplepro.com/health | jq'

# Check if issue resolved
docker logs simplepro-api --tail=100
```

**Example: Scale Up Resources**
```bash
# Increase memory limit
docker update --memory=4g --memory-swap=4g simplepro-api

# Increase connection pool
# Update environment variable
docker exec simplepro-api sh -c 'echo "MONGODB_MAX_POOL_SIZE=200" >> .env'
docker restart simplepro-api
```

**Example: Enable Circuit Breaker**
```bash
# Temporarily disable problematic feature
curl -X POST https://api.simplepro.com/admin/features \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"feature": "job_creation", "enabled": false}'
```

---

### Phase 5: Resolution (Variable)

#### Verification Checklist
- [ ] Error rate back to normal (<0.1%)
- [ ] Response times within SLA
- [ ] All health checks passing
- [ ] Customer reports of issues stopped
- [ ] Monitoring shows stable metrics
- [ ] No new related errors in logs

#### Resolution Commands
```bash
# Verify API health
for i in {1..10}; do
  curl -s https://api.simplepro.com/health | jq -r '.status'
  sleep 5
done

# Check error rate (last 30 minutes)
# View in Grafana

# Test critical flows
./scripts/smoke-test-staging.sh https://api.simplepro.com
```

#### Resolution Message
```
✅ INCIDENT RESOLVED ✅

Severity: P1
Duration: 47 minutes (14:30 - 15:17 UTC)
Root Cause: MongoDB connection pool exhaustion
Fix: Increased pool size from 100 to 200
Impact: Job creation failed for ~45 minutes, affecting 23 customers

All systems operational.
Post-mortem scheduled: Thursday 10 AM

Thank you team! 🎉
```

---

### Phase 6: Post-Incident (Within 48 hours)

See [Post-Incident Review](#post-incident-review) section.

---

## Common Incident Scenarios

### Scenario 1: Database Connection Failures

**Symptoms:**
- "Unable to connect to database" errors
- Application timeouts
- 500 errors on all endpoints

**Quick Diagnosis:**
```bash
# Check database status
./scripts/mongodb/check-replica-health.sh

# Check connection pool
docker exec simplepro-api node -e "
  const mongoose = require('mongoose');
  console.log(mongoose.connection.readyState);
"

# Test connection
docker exec simplepro-mongodb-primary mongosh --eval "db.adminCommand('ping')"
```

**Mitigation Steps:**
1. Check if database is running
2. Verify network connectivity
3. Check credentials
4. Review connection pool settings
5. Restart application if needed

---

### Scenario 2: High Memory Usage

**Symptoms:**
- Application slow or unresponsive
- Out of memory errors
- Container restarts

**Quick Diagnosis:**
```bash
# Check memory usage
docker stats simplepro-api --no-stream

# Check for memory leaks
docker exec simplepro-api node -e "
  console.log(process.memoryUsage());
"

# Check active requests
docker exec simplepro-api netstat -an | grep ESTABLISHED | wc -l
```

**Mitigation Steps:**
1. Identify memory-intensive processes
2. Clear cache if applicable
3. Increase memory limits temporarily
4. Restart application to clear memory
5. Review code for memory leaks

---

### Scenario 3: Slow Query Performance

**Symptoms:**
- API response times > 5 seconds
- Database CPU high
- Timeout errors

**Quick Diagnosis:**
```bash
# Check slow queries
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').setProfilingLevel(2);
    sleep(60000);  // Profile for 1 minute
    db.getSiblingDB('simplepro').system.profile.find({
      millis: { \$gt: 1000 }
    }).sort({ millis: -1 }).limit(5).forEach(printjson);
  "

# Check index usage
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').jobs.aggregate([ { \$indexStats: {} } ])
  "
```

**Mitigation Steps:**
1. Identify slow queries
2. Check if indexes exist
3. Create missing indexes
4. Optimize query patterns
5. Add caching for frequently accessed data

---

### Scenario 4: Replica Set Member Down

**Symptoms:**
- Replica set health alerts
- Replication lag increasing
- Read performance degraded

**Quick Diagnosis:**
```bash
./scripts/mongodb/check-replica-health.sh

# Check member status
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.status().members.forEach(m =>
      print(m.name + ': ' + m.stateStr + ' (health: ' + m.health + ')')
    )
  "
```

**Mitigation Steps:**
1. Restart failed member
2. Check logs for errors
3. Verify network connectivity
4. If primary failed, verify secondary promoted
5. Monitor replication lag during recovery

---

### Scenario 5: Disk Space Critical

**Symptoms:**
- "No space left on device" errors
- Database write failures
- Log files not being written

**Quick Diagnosis:**
```bash
# Check disk usage
docker exec simplepro-mongodb-primary df -h

# Check largest files/directories
docker exec simplepro-mongodb-primary du -sh /data/db/* | sort -rh | head -10

# Check logs size
docker exec simplepro-api du -sh /var/log/* 2>/dev/null
```

**Mitigation Steps:**
1. Clean up old logs
2. Compact database collections
3. Remove old backups
4. Clear temp files
5. Increase disk size if needed

**Emergency Cleanup:**
```bash
# Remove old logs
docker exec simplepro-api find /var/log -name "*.log" -mtime +7 -delete

# Compact collections
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('simplepro').runCommand({ compact: 'jobs', force: true })
  "

# Clean old backups
find /backups/mongodb -type d -mtime +30 -exec rm -rf {} \;
```

---

### Scenario 6: High CPU Usage

**Symptoms:**
- Application slow
- High server CPU (>90%)
- Request timeouts

**Quick Diagnosis:**
```bash
# Check CPU usage
docker stats --no-stream | grep simplepro

# Find CPU-intensive processes
docker exec simplepro-api top -b -n 1 | head -20

# Check database operations
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.currentOp({ 'active': true, 'secs_running': { \$gt: 5 } })
  "
```

**Mitigation Steps:**
1. Identify CPU-intensive queries/operations
2. Kill long-running operations if necessary
3. Scale horizontally (add instances)
4. Optimize code/queries
5. Implement rate limiting

---

## Communication Protocols

### Internal Communication

**During Incident (Every 15 minutes):**
```
Status Update - 14:45 UTC

Status: Investigating
Impact: Job creation failing - 50% error rate
Affected: ~23 customers
Current Action: Analyzing database connection pool
ETA: 15-20 minutes
Next Update: 15:00 UTC

- Incident Commander
```

### External Communication

**Status Page Update (Immediately for P0/P1):**
```
Title: Job Creation Issues
Status: Investigating

We are currently investigating an issue affecting job creation.
Some users may experience errors when creating new jobs.
Other features are operating normally.

We will provide updates every 30 minutes.

Posted: 14:35 UTC
```

**Customer Support Update:**
```
To: support@simplepro.com
Subject: URGENT - Job Creation Issues

Team,

We have a P1 incident affecting job creation (started 14:30 UTC).

What customers will experience:
- Error when trying to create new jobs
- Error message: "Unable to process request"

Workaround:
- Retry in 15-20 minutes
- Use mobile app (currently unaffected)

Status: Being actively worked on
ETA: 30-45 minutes

Please use this template for customer communications:
[template link]

Will update in 15 minutes.

- DevOps Team
```

---

## Post-Incident Review

### Post-Mortem Meeting (Within 48 hours)

**Attendees:**
- Incident Commander
- Technical Lead
- Engineering Manager
- Product Manager
- Customer Success (if customer-facing)

**Agenda:**
1. Incident timeline review
2. Root cause analysis (5 Whys)
3. What went well
4. What could be improved
5. Action items

### Post-Mortem Document Template

```markdown
# Post-Mortem: [Brief Description]

**Date:** 2025-10-02
**Duration:** 47 minutes (14:30 - 15:17 UTC)
**Severity:** P1
**Incident Commander:** John Doe

## Summary
Brief description of what happened and impact.

## Timeline
- 14:30 - Alert triggered: High error rate on job creation API
- 14:32 - On-call acknowledged, started investigation
- 14:35 - Incident declared P1, war room created
- 14:40 - Root cause identified: Connection pool exhaustion
- 14:45 - Mitigation started: Increased pool size
- 14:50 - Fix deployed
- 15:00 - Monitoring shows error rate decreasing
- 15:17 - Incident resolved, all metrics normal

## Root Cause
MongoDB connection pool (maxPoolSize: 100) was insufficient for current load.
Connections were not being released properly due to missing error handling
in job creation controller, causing pool exhaustion.

## Impact
- 47 minutes of degraded service
- 23 customers affected
- ~450 failed job creation attempts
- 0 data loss
- Revenue impact: Minimal (estimated $50)

## Resolution
1. Increased connection pool size from 100 to 200
2. Added proper connection release in error handling
3. Implemented connection pool monitoring

## What Went Well
- Quick detection (2 minutes from start to alert)
- Good communication (updates every 15 minutes)
- Effective mitigation (restored service in <1 hour)
- Clear roles and responsibilities

## What Could Be Improved
- Connection pool sizing was not based on load testing
- No alerts for connection pool utilization
- Error handling gaps in multiple controllers

## Action Items
1. [ ] Add connection pool monitoring/alerting (@jane, by 10/05)
2. [ ] Conduct load testing to determine optimal pool size (@john, by 10/10)
3. [ ] Audit all database operations for proper error handling (@team, by 10/15)
4. [ ] Update runbook with connection pool troubleshooting (@mike, by 10/08)
5. [ ] Implement circuit breaker pattern for database connections (@sarah, by 10/20)

## Lessons Learned
- Connection pool monitoring is critical
- Load testing should include database connection limits
- Error handling must release resources properly
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | DevOps Team | Initial creation |

---

**End of Document**
