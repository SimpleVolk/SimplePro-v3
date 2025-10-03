# Security Incident Response Playbook

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Classification:** CONFIDENTIAL
**Owner:** Security Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Incident Classification](#2-incident-classification)
3. [Response Team](#3-response-team)
4. [Response Procedures by Incident Type](#4-response-procedures-by-incident-type)
5. [Communication Protocols](#5-communication-protocols)
6. [Post-Incident Activities](#6-post-incident-activities)
7. [Contact Information](#7-contact-information)

---

## 1. Overview

### 1.1 Purpose

This playbook provides step-by-step procedures for responding to security incidents in SimplePro-v3.

### 1.2 Scope

Covers incidents related to:
- Authentication bypass
- Brute force attacks
- WebSocket DoS attacks
- Data breaches
- Unauthorized access
- Rate limiting bypass
- Injection attacks

### 1.3 Objectives

1. **Contain** - Stop the incident from spreading
2. **Eradicate** - Remove the threat
3. **Recover** - Restore normal operations
4. **Learn** - Prevent future incidents

---

## 2. Incident Classification

### 2.1 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - CRITICAL** | System-wide impact, data breach | Immediate (< 15 min) | Massive data breach, complete system compromise |
| **P1 - HIGH** | Significant impact, active attack | < 1 hour | Active brute force, DDoS attack, privilege escalation |
| **P2 - MEDIUM** | Limited impact, potential threat | < 4 hours | Suspicious activity, minor data exposure |
| **P3 - LOW** | Minimal impact, isolated issue | < 24 hours | Single failed intrusion attempt, minor policy violation |

### 2.2 Incident Types

1. **Authentication Attacks** - Brute force, credential stuffing
2. **Authorization Bypass** - Privilege escalation, BOLA
3. **DoS/DDoS** - Resource exhaustion, connection flooding
4. **Injection Attacks** - SQL, NoSQL, XSS, command injection
5. **Data Breach** - Unauthorized data access or exfiltration
6. **Configuration Error** - Misconfigured security controls
7. **Insider Threat** - Malicious or negligent employee actions

---

## 3. Response Team

### 3.1 Roles and Responsibilities

| Role | Responsibilities | Contact |
|------|-----------------|---------|
| **Incident Commander** | Overall response coordination | security-lead@company.com |
| **Security Analyst** | Investigation and forensics | security-team@company.com |
| **DevOps Engineer** | System access and infrastructure | devops@company.com |
| **Development Lead** | Code fixes and deployments | dev-lead@company.com |
| **Legal Counsel** | Legal and compliance | legal@company.com |
| **Communications Lead** | Internal/external communications | comms@company.com |
| **CTO/CISO** | Executive decision-making | cto@company.com |

### 3.2 Escalation Path

```
P3 (Low) → Security Analyst
    ↓ (if escalated)
P2 (Medium) → Incident Commander + Security Team
    ↓ (if escalated)
P1 (High) → Incident Commander + CTO + All Teams
    ↓ (if escalated)
P0 (Critical) → Full Incident Response Team + Legal + Executive Team
```

---

## 4. Response Procedures by Incident Type

## 4.1 Brute Force Authentication Attack

### Detection Indicators

- ✅ Alert: `HighAuthenticationFailureRate`
- ✅ Alert: `BruteForceAttackDetected`
- ✅ Grafana dashboard shows spike in failed logins
- ✅ Logs show repeated failed attempts from same IP

### Immediate Response (< 15 minutes)

**Step 1: Verify the Attack**
```bash
# Check Grafana dashboard
# URL: http://localhost:3000/d/security-overview

# Query Prometheus for recent failures
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum by(ip) (increase(simplepro_auth_failures_total[5m]))'

# Check logs
tail -f apps/api/logs/app.log | grep "authentication failed"
```

**Step 2: Identify Attacking IP(s)**
```bash
# Get top failing IPs
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=topk(10, sum by(ip) (increase(simplepro_auth_failures_total[1h])))'

# Check geographic location (optional)
curl https://ipapi.co/{IP}/json/
```

**Step 3: Block Attacking IPs**
```bash
# Option A: Firewall block (recommended)
sudo ufw deny from {ATTACKING_IP}

# Option B: Add to rate limiter blocklist
# Update apps/api/src/common/middleware/rate-limit.middleware.ts
# Add IP to blocklist array

# Option C: Cloudflare/WAF block (if applicable)
```

**Step 4: Verify Block Effectiveness**
```bash
# Monitor for continued attempts
watch -n 5 'curl -s http://localhost:9090/api/v1/query \
  --data-urlencode "query=rate(simplepro_auth_failures_total[1m])"'

# Should see rate decrease
```

### Containment (< 30 minutes)

**Step 5: Implement Enhanced Rate Limiting**
```typescript
// Temporarily reduce rate limits
@Throttle({ default: { limit: 3, ttl: 3600000 } })  // 3 attempts per hour
```

**Step 6: Enable Additional Monitoring**
```bash
# Increase log verbosity
export LOG_LEVEL=debug

# Restart API
pm2 restart api

# Watch for patterns
tail -f apps/api/logs/app.log | grep -E "(authentication|login|bruteforce)"
```

### Investigation (< 1 hour)

**Step 7: Analyze Attack Pattern**
```bash
# Extract attack timeline
grep "authentication failed" apps/api/logs/app.log \
  | awk '{print $1, $2, $5}' \
  | sort | uniq -c

# Check targeted usernames
grep "authentication failed" apps/api/logs/app.log \
  | jq -r '.username' \
  | sort | uniq -c | sort -rn

# Determine attack type
# - Credential stuffing: Many different usernames
# - Brute force: One username, many passwords
```

**Step 8: Check for Compromised Accounts**
```bash
# Query successful logins from attacking IPs
db.userSessions.find({
  ip: { $in: ["ATTACKING_IPs"] },
  createdAt: { $gt: ISODate("ATTACK_START_TIME") }
})

# If found: ESCALATE to P1
```

### Eradication (< 2 hours)

**Step 9: Force Password Reset (if compromised)**
```bash
# If any accounts compromised
db.users.updateMany(
  { username: { $in: ["compromised_users"] } },
  { $set: { mustChangePassword: true } }
)

# Invalidate all sessions
db.userSessions.deleteMany({
  userId: { $in: ["compromised_user_ids"] }
})
```

**Step 10: Strengthen Defenses**
```typescript
// Add CAPTCHA for repeated failures (future enhancement)
// Implement account lockout after 5 failures
// Add email notification for suspicious login attempts
```

### Recovery (< 4 hours)

**Step 11: Restore Normal Operations**
```bash
# Remove temporary rate limits (if appropriate)
# Restore normal monitoring

# Verify system health
curl http://localhost:3001/api/health
```

**Step 12: Notify Affected Users**
```
Subject: Security Notice - Suspicious Login Activity

We detected and blocked suspicious login attempts on your account.
Your account is secure. No action required unless you've forgotten your password.

Best practices:
- Use strong, unique passwords
- Enable 2FA when available
- Be cautious of phishing emails
```

### Post-Incident (< 24 hours)

**Step 13: Document Incident**
```markdown
# Incident Report: Brute Force Attack

**Date:** 2025-10-02
**Severity:** P1
**Duration:** 2 hours 15 minutes
**Affected Systems:** Authentication API

## Summary
Brute force attack from IP range 203.0.113.0/24 targeting admin accounts.
Blocked 15,432 login attempts. No accounts compromised.

## Timeline
- 14:00 UTC: Attack detected
- 14:15 UTC: IPs blocked
- 14:30 UTC: Enhanced rate limiting enabled
- 16:15 UTC: Normal operations restored

## Root Cause
Rate limiting was sufficient but could be more aggressive.

## Action Items
1. [P1] Implement account lockout after 5 failures
2. [P2] Add CAPTCHA for repeated failures
3. [P3] Implement email notifications for suspicious activity
```

**Step 14: Update Defenses**
- Improve rate limiting
- Add IP reputation checking
- Implement account lockout
- Consider 2FA implementation

---

## 4.2 WebSocket DoS Attack

### Detection Indicators

- ✅ Alert: `WebSocketConnectionFlood`
- ✅ Alert: `HighWebSocketConnectionRejections`
- ✅ High CPU/memory usage
- ✅ Legitimate users cannot connect

### Immediate Response (< 15 minutes)

**Step 1: Verify Attack**
```bash
# Check active connections
curl http://localhost:3001/api/websocket/stats

# Check Prometheus
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=rate(simplepro_websocket_connection_attempts_total[1m])'

# Monitor server resources
htop
```

**Step 2: Identify Attack Source**
```bash
# Get connection attempts by IP
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=topk(10, sum by(ip) (increase(simplepro_websocket_connection_attempts_total[5m])))'

# Check logs
grep "WebSocket connection" apps/api/logs/app.log | tail -100
```

**Step 3: Block Attacking IPs**
```bash
# Firewall block
sudo ufw deny from {ATTACKING_IP}

# OR add to WebSocket gateway blocklist
# apps/api/src/websocket/websocket.gateway.ts
const BLOCKED_IPS = ['ATTACKING_IP_1', 'ATTACKING_IP_2'];
```

**Step 4: Reduce Connection Limits (Emergency)**
```typescript
// Temporarily reduce limits
private readonly MAX_CONNECTIONS_PER_USER = 3;  // Down from 5
private readonly MAX_CONNECTIONS_PER_IP = 5;    // Down from 10
```

### Containment (< 30 minutes)

**Step 5: Restart WebSocket Gateway**
```bash
# Graceful restart to clear connections
pm2 restart api

# Verify restart
curl http://localhost:3001/api/health
```

**Step 6: Monitor Recovery**
```bash
# Watch connection count
watch -n 2 'curl -s http://localhost:3001/api/websocket/stats'

# Monitor server resources
watch -n 2 'ps aux | grep node'
```

### Investigation (< 1 hour)

**Step 7: Analyze Attack Pattern**
```bash
# Check connection timing
grep "WebSocket connection" apps/api/logs/app.log \
  | awk '{print $1}' \
  | uniq -c

# Check for patterns
# - Rapid connections from same IP
# - Distributed attack (many IPs)
# - Authenticated or unauthenticated
```

**Step 8: Check for Data Exfiltration**
```bash
# Check for successful connections that sent unusual amounts of data
db.auditLogs.find({
  action: "websocket.event",
  timestamp: { $gt: ISODate("ATTACK_START") },
  eventType: { $in: ["message.send", "data.request"] }
}).count()
```

### Eradication & Recovery

**Step 9: Implement Enhanced Protections**
```typescript
// Add connection rate limiting per IP
const CONNECTION_RATE_LIMIT = 10; // connections per minute per IP

// Add authentication requirement before connection
// (already implemented, verify it's working)

// Add progressive delays for repeat connection attempts
```

**Step 10: Restore Normal Operations**
```bash
# Return limits to normal values
# Remove temporary blocks (if appropriate)
# Verify legitimate users can connect
```

### Post-Incident

**Document and improve:**
- Update WebSocket security documentation
- Review connection limits
- Consider implementing progressive connection delays
- Add DDoS protection (Cloudflare, etc.)

---

## 4.3 Document Sharing Brute Force

### Detection Indicators

- ✅ Alert: `DocumentShareBruteForce`
- ✅ Multiple password failures for same token
- ✅ Rate limiting hits on document endpoints

### Immediate Response (< 15 minutes)

**Step 1: Verify Attack**
```bash
# Check document share attempts
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=rate(simplepro_document_share_password_failures_total[5m])'

# Check specific tokens under attack
grep "Document share" apps/api/logs/app.log | tail -50
```

**Step 2: Identify Attack**
```bash
# Get failing IPs and tokens
db.auditLogs.aggregate([
  {
    $match: {
      action: "document.share.access",
      result: "failure",
      timestamp: { $gt: new Date(Date.now() - 3600000) }
    }
  },
  {
    $group: {
      _id: { token: "$token", ip: "$ip" },
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

**Step 3: Revoke Compromised Tokens**
```bash
# If token under heavy attack, revoke it
db.documentShares.updateOne(
  { token: "ATTACKED_TOKEN" },
  { $set: { expiresAt: new Date(), revokedAt: new Date(), revokedReason: "Brute force attack detected" } }
)

# Notify document owner
# Send email about security incident
```

**Step 4: Block Attacking IPs**
```bash
# Block at firewall
sudo ufw deny from {ATTACKING_IP}

# Verify rate limiting is working
curl -X POST http://localhost:3001/api/documents/shared/TOKEN/access \
  -H "Content-Type: application/json" \
  -d '{"password":"test"}' \
  -w "Status: %{http_code}\n"
```

### Containment (< 30 minutes)

**Step 5: Reduce Rate Limits (Emergency)**
```typescript
// Temporarily reduce document share rate limit
@Throttle({ default: { limit: 3, ttl: 3600000 } })  // 3 attempts per hour (down from 5)
```

**Step 6: Notify Affected Users**
```
Subject: Security Alert - Document Share Link Revoked

We detected suspicious activity on your shared document link and
have temporarily revoked it for your protection.

Please create a new share link if needed.

Contact support if you have questions.
```

### Investigation & Eradication

**Step 7: Review All Recent Shares**
```bash
# Check for other potential targets
db.documentShares.find({
  createdAt: { $gt: new Date(Date.now() - 86400000) },
  accessCount: { $gt: 10 }
})

# Look for successful attacks
db.auditLogs.find({
  action: "document.share.access",
  result: "success",
  ip: { $in: ["ATTACKING_IPs"] }
})

# If any successful: ESCALATE to P0 (data breach)
```

**Step 8: Strengthen Password Requirements**
```typescript
// For future shares, require stronger passwords
const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_REQUIREMENTS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
```

### Recovery & Post-Incident

**Step 9: Restore Services**
```bash
# Return rate limits to normal
# Unblock IPs if appropriate
# Enable new shares with enhanced security
```

**Step 10: Implement Improvements**
- Add password strength meter for share creation
- Implement email notifications for failed access attempts
- Consider implementing one-time-use share links
- Add expiration reminders for long-lived shares

---

## 4.4 Data Breach Response

### Detection Indicators

- ✅ Unauthorized data access detected
- ✅ Large data exports
- ✅ Unusual database queries
- ✅ Data appears in unauthorized locations

### CRITICAL - Immediate Response (< 5 minutes)

**Step 1: ESCALATE IMMEDIATELY**
```
NOTIFY IMMEDIATELY:
- Incident Commander
- CTO/CISO
- Legal Counsel
- Communications Lead

DO NOT DELAY - This is a P0 incident
```

**Step 2: Stop Data Exfiltration**
```bash
# If active exfiltration, block immediately
sudo ufw deny from {ATTACKING_IP}

# If compromised account, disable it
db.users.updateOne(
  { _id: ObjectId("COMPROMISED_USER_ID") },
  { $set: { isActive: false, suspendedReason: "Security incident" } }
)

# Invalidate all sessions for user
db.userSessions.deleteMany({ userId: ObjectId("COMPROMISED_USER_ID") })
```

**Step 3: Preserve Evidence**
```bash
# DO NOT modify logs or database
# Create snapshots immediately

# Snapshot logs
cp -r apps/api/logs /tmp/incident-logs-$(date +%Y%m%d-%H%M%S)

# Snapshot database (if possible without disrupting service)
mongodump --out=/tmp/incident-db-$(date +%Y%m%d-%H%M%S)

# Capture network traffic (if applicable)
```

### Containment (< 30 minutes)

**Step 4: Assess Scope**
```bash
# Determine what data was accessed
db.auditLogs.find({
  userId: ObjectId("COMPROMISED_USER_ID"),
  action: { $in: ["read", "export", "download"] },
  timestamp: { $gt: ISODate("SUSPECTED_BREACH_START") }
})

# Identify affected customers/records
# Document everything
```

**Step 5: Isolate Affected Systems**
```bash
# If necessary, take systems offline
# Only if data exfiltration is ongoing and cannot be stopped otherwise

# REQUIRES APPROVAL FROM INCIDENT COMMANDER
```

### Legal & Compliance (< 1 hour)

**Step 6: Assess Legal Obligations**
```
CONSULT LEGAL IMMEDIATELY:
- GDPR notification requirements (72 hours)
- PCI DSS breach notification
- State data breach laws
- Contractual obligations

DOCUMENT:
- What data was accessed
- How many records
- Types of data (PII, financial, etc.)
- Affected individuals
```

**Step 7: Prepare Notifications**
```
Required notifications:
- Affected users
- Regulatory authorities
- Business partners
- Insurance company
- Law enforcement (if applicable)

Timeline:
- Internal: Immediate
- Regulatory: 72 hours (GDPR)
- Affected individuals: Without undue delay
```

### Investigation (< 24 hours)

**Step 8: Forensic Analysis**
```bash
# Engage forensics team
# Preserve all evidence
# Determine:
# - How was access gained?
# - When did breach occur?
# - What data was accessed?
# - Was data exfiltrated?
# - How many records affected?
```

**Step 9: Root Cause Analysis**
```markdown
Common causes:
- Compromised credentials
- SQL/NoSQL injection
- Authentication bypass
- Privilege escalation
- Insider threat
- Third-party compromise
```

### Eradication & Recovery (< 48 hours)

**Step 10: Remediate Vulnerability**
```
Fix the root cause:
- Patch vulnerabilities
- Reset compromised credentials
- Implement additional controls
- Deploy emergency fixes
```

**Step 11: Restore Normal Operations**
```
- Verify fix effectiveness
- Restore services
- Monitor for reoccurrence
- Maintain heightened security posture
```

### Post-Incident (< 7 days)

**Step 12: Comprehensive Report**
```markdown
Required sections:
- Executive summary
- Incident timeline
- Data affected
- Root cause
- Response actions
- Lessons learned
- Corrective actions
- Regulatory notifications
```

**Step 13: Regulatory Notifications**
```
File required notifications:
- GDPR: Data Protection Authority
- PCI DSS: Payment card brands
- State laws: Attorney General
- Others as applicable
```

**Step 14: Affected User Notification**
```
Subject: Important Security Notice

We are writing to inform you of a data security incident that may have
affected your information.

What happened: [Brief description]
What information was involved: [Specific data types]
What we're doing: [Response actions]
What you can do: [Recommendations]

We sincerely apologize for this incident and are taking steps to prevent
future occurrences.
```

**Step 15: Implement Long-Term Improvements**
- Enhanced monitoring
- Additional security controls
- Security awareness training
- Third-party security audit
- Incident response improvements

---

## 5. Communication Protocols

### 5.1 Internal Communication

**Incident Declared:**
```
To: incident-response-team@company.com
Subject: [P1] Security Incident - Brute Force Attack

INCIDENT DECLARED
Severity: P1
Type: Brute Force Authentication Attack
Status: ACTIVE
Incident Commander: [Name]

Details:
- Detected: 2025-10-02 14:00 UTC
- Source: Multiple IPs in range 203.0.113.0/24
- Target: Admin accounts
- Current Status: IPs blocked, attack ongoing

Action Required:
- Security Team: Investigate attack pattern
- DevOps: Monitor system health
- Development: Prepare emergency rate limit changes if needed

War Room: Slack #incident-response
Next Update: 30 minutes
```

**Status Updates:**
```
Every 30-60 minutes during active incident:
- Current status
- Actions taken
- Next steps
- ETA for resolution
```

### 5.2 External Communication

**Customer Notification:**
```
Only notify customers if:
- Service disruption affects them
- Their data may be compromised
- Action required on their part

Template:
Subject: Service Update - Security Enhancement

We're currently implementing security enhancements that may
temporarily affect service. We expect to complete this work
within [timeframe].

No action required. We'll update when complete.
```

**Public Statement (if needed):**
```
REQUIRES APPROVAL FROM:
- Legal
- Communications Lead
- CTO/CISO

Template available from Communications team
```

### 5.3 Regulatory Communication

**GDPR Breach Notification (72 hours):**
```
To: Data Protection Authority
Subject: Personal Data Breach Notification

[Use official DPA template]

Must include:
- Nature of breach
- Data categories affected
- Number of affected individuals
- Likely consequences
- Measures taken
- Contact details
```

---

## 6. Post-Incident Activities

### 6.1 Incident Report Template

```markdown
# Security Incident Report

**Incident ID:** INC-2025-001
**Date:** 2025-10-02
**Severity:** P1
**Status:** RESOLVED

## Executive Summary
[2-3 sentence summary of incident and resolution]

## Incident Details
- **Type:** [Attack type]
- **Detected:** [Date/time]
- **Resolved:** [Date/time]
- **Duration:** [Hours/minutes]
- **Affected Systems:** [List]
- **Data Impact:** [None/Limited/Significant]

## Timeline
- 14:00 UTC: Incident detected
- 14:15 UTC: IPs blocked
- 14:30 UTC: Enhanced monitoring enabled
- 16:00 UTC: Attack subsided
- 16:30 UTC: Normal operations restored

## Root Cause
[Detailed analysis of why incident occurred]

## Impact Assessment
- **Users Affected:** [Number]
- **Data Compromised:** [Yes/No/Unknown]
- **Service Downtime:** [Duration]
- **Financial Impact:** [Estimate]

## Response Actions
1. [Action taken]
2. [Action taken]
3. [Action taken]

## Lessons Learned
**What Went Well:**
- [Item]

**What Could Be Improved:**
- [Item]

## Corrective Actions
| Action | Priority | Owner | Due Date | Status |
|--------|----------|-------|----------|--------|
| [Action] | P1 | [Name] | 2025-10-10 | Open |

## Attachments
- Logs: /incidents/INC-2025-001/logs/
- Screenshots: /incidents/INC-2025-001/screenshots/
- Forensics: /incidents/INC-2025-001/forensics/
```

### 6.2 Post-Incident Review Meeting

**Schedule:** Within 1 week of incident resolution

**Attendees:**
- Incident Commander
- Response team members
- Affected system owners
- Management

**Agenda:**
1. Incident recap
2. Timeline review
3. Response effectiveness
4. Lessons learned
5. Corrective actions
6. Process improvements

### 6.3 Knowledge Base Update

**Document:**
- New attack patterns
- Effective response techniques
- Tool usage tips
- Escalation procedures

**Update:**
- Runbooks
- Playbooks
- Training materials
- Monitoring rules

---

## 7. Contact Information

### 7.1 Internal Contacts

| Role | Name | Email | Phone | Slack |
|------|------|-------|-------|-------|
| Incident Commander | [Name] | security-lead@company.com | +1-555-0100 | @security-lead |
| Security Team Lead | [Name] | security@company.com | +1-555-0101 | @sec-team-lead |
| DevOps Lead | [Name] | devops@company.com | +1-555-0102 | @devops-lead |
| CTO | [Name] | cto@company.com | +1-555-0103 | @cto |
| Legal Counsel | [Name] | legal@company.com | +1-555-0104 | @legal |

### 7.2 External Contacts

| Organization | Contact | Phone | Purpose |
|--------------|---------|-------|---------|
| Hosting Provider | support@provider.com | +1-555-0200 | Infrastructure issues |
| Security Vendor | vendor@security.com | +1-555-0201 | Security tools support |
| Law Enforcement | cybercrime@agency.gov | +1-555-0202 | Criminal activity reporting |
| Insurance | claims@insurance.com | +1-555-0203 | Cyber insurance claims |

### 7.3 Emergency Procedures

**After Hours:**
```
1. Call Incident Commander: +1-555-0100
2. If no answer, call CTO: +1-555-0103
3. If no answer, call CEO: +1-555-0104
4. Page on-call engineer: PagerDuty
```

**Escalation Chain:**
```
Security Analyst
    ↓
Incident Commander
    ↓
CTO/CISO
    ↓
CEO
    ↓
Board of Directors (for major incidents)
```

---

## Appendix A: Quick Reference

### Common Commands

```bash
# Check authentication failures
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=rate(simplepro_auth_failures_total[5m])'

# Block IP at firewall
sudo ufw deny from {IP}

# Disable user account
db.users.updateOne({ username: "USER" }, { $set: { isActive: false } })

# Invalidate sessions
db.userSessions.deleteMany({ userId: ObjectId("USER_ID") })

# Check recent security events
tail -f apps/api/logs/app.log | grep -i "security"
```

### Decision Tree

```
Incident Detected
    ↓
Is it ACTIVE?
    Yes → Contain immediately
    No → Investigate
    ↓
Data breach?
    Yes → P0, notify Legal immediately
    No → Continue assessment
    ↓
Service disruption?
    Yes → P1, restore service
    No → P2/P3, investigate and remediate
```

---

**Document Classification:** CONFIDENTIAL
**Version:** 1.0
**Last Updated:** 2025-10-02
**Next Review:** 2025-11-02
**Owner:** Security Team

**This playbook is confidential and should only be shared with authorized personnel.**
