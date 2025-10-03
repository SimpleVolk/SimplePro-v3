# Staging Deployment Test Plan

**Project:** SimplePro-v3
**Version:** 1.0.0
**Date:** 2025-10-02
**Environment:** Staging
**Author:** DevOps Team

## Executive Summary

This document outlines the comprehensive test plan for deploying SimplePro-v3 to a staging environment. The staging deployment serves as the final validation before production deployment, ensuring all infrastructure components, security measures, and application features work correctly in a production-like environment.

## Objectives

1. Validate production Docker configurations work correctly
2. Verify all security fixes from Sprint 1 Week 1 are functional
3. Test deployment automation scripts
4. Establish performance baselines
5. Validate monitoring and alerting infrastructure
6. Ensure rollback procedures work correctly
7. Identify and document any deployment issues

## Test Environment

### Infrastructure Requirements

- **Operating System:** Linux (Ubuntu 20.04+) or Windows with WSL2
- **Docker:** 24.0.0+
- **Docker Compose:** 2.20.0+
- **Resources:**
  - CPU: 4+ cores
  - RAM: 8GB minimum, 16GB recommended
  - Disk: 50GB available
  - Network: Internet connectivity for image pulls

### Port Requirements

| Service | Port | Purpose |
|---------|------|---------|
| Nginx | 80 | HTTP (redirects to HTTPS) |
| Nginx | 443 | HTTPS (SSL/TLS) |
| API | 3001 | API direct access (internal) |
| Web | 3009 | Web app direct access (internal) |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache |
| MinIO | 9000 | S3 API |
| MinIO Console | 9001 | MinIO web UI |
| Prometheus | 9090 | Metrics |
| Grafana | 3000 | Dashboards |
| MongoDB Exporter | 9216 | MongoDB metrics |
| Redis Exporter | 9121 | Redis metrics |
| Node Exporter | 9100 | System metrics |

## Pre-Deployment Checklist

### 1. Environment Preparation

- [ ] Docker and Docker Compose installed
- [ ] Required ports are available (not in use)
- [ ] Sufficient disk space (50GB+)
- [ ] Git repository is up to date
- [ ] Previous staging containers stopped and removed
- [ ] Clean workspace (no conflicting .env files)

### 2. Configuration Validation

- [ ] Staging secrets directory does not exist (will be auto-generated)
- [ ] docker-compose.staging.yml exists
- [ ] Dockerfiles exist for API and Web
- [ ] Nginx configuration files exist
- [ ] Prometheus configuration exists
- [ ] Grafana provisioning files exist

### 3. Script Availability

- [ ] setup-staging.sh exists and is executable
- [ ] smoke-test-staging.sh exists and is executable
- [ ] validate-environment.sh exists
- [ ] secrets-management.sh exists
- [ ] backup-restore.sh exists

## Deployment Steps

### Phase 1: Environment Setup (30 minutes)

**Objective:** Initialize staging environment with proper configuration

**Steps:**
1. Run prerequisite checks
   ```bash
   ./scripts/setup-staging.sh --check-prereqs
   ```

2. Generate staging secrets
   ```bash
   ./scripts/setup-staging.sh --generate-secrets
   ```

3. Validate environment configuration
   ```bash
   ./scripts/validate-environment.sh staging
   ```

4. Create required directories
   ```bash
   ./scripts/setup-staging.sh --create-directories
   ```

**Success Criteria:**
- All prerequisite checks pass
- Secrets generated and stored securely
- Environment variables validated
- Required directories created with proper permissions

### Phase 2: Infrastructure Deployment (45 minutes)

**Objective:** Deploy all infrastructure services

**Steps:**
1. Create staging network
   ```bash
   docker network create simplepro-staging-network
   ```

2. Pull required Docker images
   ```bash
   docker-compose -f docker-compose.staging.yml pull
   ```

3. Build application containers
   ```bash
   docker-compose -f docker-compose.staging.yml build --no-cache
   ```

4. Start infrastructure services (MongoDB, Redis, MinIO)
   ```bash
   docker-compose -f docker-compose.staging.yml up -d mongodb redis minio
   ```

5. Wait for infrastructure health checks
   ```bash
   ./scripts/setup-staging.sh --wait-infrastructure
   ```

6. Initialize databases
   ```bash
   ./scripts/setup-staging.sh --init-databases
   ```

**Success Criteria:**
- All images pulled successfully
- Builds complete without errors
- MongoDB is healthy and accepting connections
- Redis is healthy and accepting connections
- MinIO is healthy and buckets created

### Phase 3: Application Deployment (30 minutes)

**Objective:** Deploy API and Web applications

**Steps:**
1. Start API service
   ```bash
   docker-compose -f docker-compose.staging.yml up -d api
   ```

2. Wait for API health check
   ```bash
   ./scripts/setup-staging.sh --wait-api
   ```

3. Start Web service
   ```bash
   docker-compose -f docker-compose.staging.yml up -d web
   ```

4. Wait for Web health check
   ```bash
   ./scripts/setup-staging.sh --wait-web
   ```

5. Start Nginx reverse proxy
   ```bash
   docker-compose -f docker-compose.staging.yml up -d nginx
   ```

**Success Criteria:**
- API container starts and passes health checks
- Web container starts and passes health checks
- Nginx starts and routes traffic correctly
- All services show "healthy" status

### Phase 4: Monitoring Deployment (15 minutes)

**Objective:** Deploy monitoring and observability stack

**Steps:**
1. Start Prometheus
   ```bash
   docker-compose -f docker-compose.staging.yml up -d prometheus
   ```

2. Start Grafana
   ```bash
   docker-compose -f docker-compose.staging.yml up -d grafana
   ```

3. Start exporters
   ```bash
   docker-compose -f docker-compose.staging.yml up -d mongodb-exporter redis-exporter node-exporter
   ```

4. Verify metric collection
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

**Success Criteria:**
- Prometheus is collecting metrics
- Grafana is accessible and connected to Prometheus
- All exporters are reporting data
- Dashboards display real-time metrics

## Smoke Tests

### Test Suite Overview

The smoke test suite validates critical functionality across all components. Tests are executed automatically by `smoke-test-staging.sh`.

### 1. Infrastructure Health Tests

**Test ID:** ST-001
**Category:** Infrastructure
**Priority:** Critical

**Tests:**
- MongoDB connection and authentication
- Redis connection and basic operations (SET/GET)
- MinIO S3 API connectivity
- MinIO bucket existence
- Network connectivity between services

**Pass Criteria:**
- All services respond within 5 seconds
- Authentication succeeds
- Basic CRUD operations work

---

### 2. API Health Tests

**Test ID:** ST-002
**Category:** Application
**Priority:** Critical

**Tests:**
- `/api/health` endpoint responds 200 OK
- `/api/health/ready` endpoint reports all dependencies healthy
- `/api/docs` Swagger UI is accessible
- API responds within 500ms
- Error responses have proper format

**Pass Criteria:**
- All endpoints return expected status codes
- Response times meet SLA
- JSON responses are well-formed

---

### 3. Authentication Tests

**Test ID:** ST-003
**Category:** Security
**Priority:** Critical

**Tests:**
- User login with valid credentials
- User login with invalid credentials returns 401
- JWT token is issued on successful login
- JWT token is accepted for authenticated requests
- Refresh token endpoint works
- Token expiration is enforced

**Pass Criteria:**
- Authentication succeeds with valid credentials
- Authentication fails with invalid credentials
- Tokens are properly formatted and valid
- Token lifecycle works correctly

---

### 4. Database Operations Tests

**Test ID:** ST-004
**Category:** Data Persistence
**Priority:** Critical

**Tests:**
- Create user record
- Read user record
- Update user record
- Delete user record
- Transaction support (if applicable)
- Index usage for queries

**Pass Criteria:**
- All CRUD operations succeed
- Data persists across service restarts
- Query performance is acceptable

---

### 5. File Storage Tests

**Test ID:** ST-005
**Category:** File Management
**Priority:** High

**Tests:**
- Upload file to MinIO via API
- Download file from MinIO via API
- Delete file from MinIO
- Presigned URL generation
- File metadata tracking
- Large file upload (100MB+)

**Pass Criteria:**
- All file operations succeed
- Files are accessible after upload
- Presigned URLs work and expire correctly
- Large files upload without timeout

---

### 6. WebSocket Tests

**Test ID:** ST-006
**Category:** Real-time Communication
**Priority:** High

**Tests:**
- WebSocket connection establishment
- Message send and receive
- Connection limit enforcement
- Reconnection handling
- Authentication requirement

**Pass Criteria:**
- WebSocket connects successfully
- Messages are delivered in real-time
- Connection limits work
- Authentication is enforced

---

### 7. Web Application Tests

**Test ID:** ST-007
**Category:** Frontend
**Priority:** High

**Tests:**
- Homepage loads successfully
- Login page is accessible
- Dashboard loads after login
- Static assets load correctly
- API integration works
- Navigation works

**Pass Criteria:**
- All pages return 200 OK
- No console errors
- Authentication flow works
- API calls succeed

---

### 8. Monitoring Tests

**Test ID:** ST-008
**Category:** Observability
**Priority:** Medium

**Tests:**
- Prometheus scrapes all targets
- Grafana displays dashboards
- Metrics are being collected
- Alerts can be triggered
- Logs are being written

**Pass Criteria:**
- All Prometheus targets are "UP"
- Grafana shows live data
- Metrics update in real-time
- Alert rules are loaded

---

### 9. Security Validation Tests

**Test ID:** ST-009
**Category:** Security
**Priority:** Critical

**Tests:**
- No hardcoded secrets in containers
- Environment variables properly injected
- SSL/TLS certificates valid
- HTTPS redirect works
- CORS configured correctly
- Rate limiting works
- NoSQL injection prevention
- Password hashing (bcrypt)

**Pass Criteria:**
- No secrets visible in container inspect
- HTTPS enforced on all endpoints
- CORS only allows specified origins
- Rate limiting blocks excessive requests
- Security headers present

---

### 10. Performance Baseline Tests

**Test ID:** ST-010
**Category:** Performance
**Priority:** Medium

**Tests:**
- API response time (p50, p95, p99)
- Database query performance
- Concurrent user handling (10, 50, 100 users)
- Memory usage under load
- CPU usage under load
- Container restart time

**Metrics to Capture:**
- Average response time
- Requests per second
- Error rate
- Resource utilization

**Pass Criteria:**
- API p95 response time < 1000ms
- System handles 100 concurrent users
- No memory leaks detected
- Containers restart within 30 seconds

## Health Check Verification

### Service Health Checks

Each service must pass its health check before proceeding:

```bash
# MongoDB
docker exec simplepro-mongodb-staging mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec simplepro-redis-staging redis-cli -a $REDIS_PASSWORD ping

# MinIO
curl http://localhost:9000/minio/health/live

# API
curl http://localhost:3001/api/health

# Web
curl http://localhost:3009/

# Nginx
curl -k https://localhost/health

# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3000/api/health
```

### Dependency Verification

Verify services can communicate:

```bash
# API can reach MongoDB
docker exec simplepro-api-staging curl mongodb:27017

# API can reach Redis
docker exec simplepro-api-staging redis-cli -h redis ping

# API can reach MinIO
docker exec simplepro-api-staging curl minio:9000/minio/health/live

# Prometheus can scrape API
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="api")'
```

## Performance Baseline Tests

### API Performance

**Tool:** Apache Bench (ab) or wrk

```bash
# Test 1: Health endpoint - 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3001/api/health

# Test 2: Login endpoint - 100 requests, 5 concurrent
ab -n 100 -c 5 -p login.json -T application/json http://localhost:3001/api/auth/login

# Test 3: Authenticated request - 500 requests, 10 concurrent
ab -n 500 -c 10 -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/customers
```

**Success Criteria:**
- Health endpoint: p95 < 50ms
- Login endpoint: p95 < 500ms
- Authenticated requests: p95 < 1000ms
- Error rate: < 0.1%

### Database Performance

```bash
# MongoDB performance
docker exec simplepro-mongodb-staging mongosh --eval "db.serverStatus()"

# Redis performance
docker exec simplepro-redis-staging redis-cli --latency-history
```

**Success Criteria:**
- MongoDB average query time < 100ms
- Redis latency < 1ms

### Resource Usage

```bash
# Monitor resource usage
docker stats --no-stream

# Check container logs for errors
docker-compose -f docker-compose.staging.yml logs --tail=100
```

**Success Criteria:**
- API memory usage < 500MB
- Web memory usage < 256MB
- MongoDB memory usage < 1GB
- Total CPU usage < 50% under normal load

## Security Validation

### 1. Secrets Management

**Test:**
```bash
# Verify no secrets in environment variables visible externally
docker inspect simplepro-api-staging | grep -i "password\|secret\|key"

# Verify secrets are loaded from files
docker exec simplepro-api-staging cat /run/secrets/jwt_secret
```

**Pass Criteria:**
- No plaintext secrets in container inspect
- Secrets loaded from /run/secrets
- Secrets have proper permissions (0600)

### 2. Network Security

**Test:**
```bash
# Verify services are on isolated network
docker network inspect simplepro-staging-network

# Verify external access is only through Nginx
nmap -p 1-65535 localhost
```

**Pass Criteria:**
- Services communicate on private network
- Only exposed ports are accessible externally
- No unnecessary ports open

### 3. SSL/TLS Validation

**Test:**
```bash
# Test SSL certificate
openssl s_client -connect localhost:443 -showcerts

# Test HTTPS redirect
curl -I http://localhost/
```

**Pass Criteria:**
- Valid SSL certificate
- HTTP redirects to HTTPS
- TLS 1.2+ only

### 4. Authentication & Authorization

**Test:**
```bash
# Test unauthenticated access is blocked
curl -I http://localhost:3001/api/customers

# Test authenticated access works
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/customers

# Test rate limiting
for i in {1..10}; do curl http://localhost:3001/api/auth/login; done
```

**Pass Criteria:**
- Unauthenticated requests return 401
- Authenticated requests return 200
- Rate limiting blocks after threshold

## Rollback Procedures

### Scenario 1: Health Check Failures

**Detection:**
- Service fails to start
- Health checks timeout
- Container exits unexpectedly

**Rollback Steps:**
1. Stop all staging services
   ```bash
   docker-compose -f docker-compose.staging.yml down
   ```

2. Review logs
   ```bash
   docker-compose -f docker-compose.staging.yml logs
   ```

3. Fix identified issues

4. Restart deployment from Phase 1

### Scenario 2: Data Corruption

**Detection:**
- Database connection errors
- Data inconsistencies
- Failed transactions

**Rollback Steps:**
1. Stop application services (API, Web)
   ```bash
   docker-compose -f docker-compose.staging.yml stop api web
   ```

2. Restore from backup
   ```bash
   ./scripts/backup-restore.sh restore --latest
   ```

3. Verify data integrity
   ```bash
   docker exec simplepro-mongodb-staging mongosh --eval "db.users.count()"
   ```

4. Restart application services
   ```bash
   docker-compose -f docker-compose.staging.yml up -d api web
   ```

### Scenario 3: Security Issues

**Detection:**
- Secrets exposed
- Authentication bypass
- Unauthorized access

**Rollback Steps:**
1. Immediately stop all services
   ```bash
   docker-compose -f docker-compose.staging.yml down
   ```

2. Rotate all secrets
   ```bash
   ./scripts/secrets-management.sh rotate --all
   ```

3. Review security configurations

4. Restart with secure configuration

### Scenario 4: Performance Degradation

**Detection:**
- Response times exceed SLA
- High resource usage
- Container OOM kills

**Rollback Steps:**
1. Scale back to previous version
   ```bash
   docker-compose -f docker-compose.staging.yml down
   git checkout <previous-stable-commit>
   docker-compose -f docker-compose.staging.yml up -d
   ```

2. Investigate performance issues

3. Optimize and redeploy

## Issue Tracking

### Issue Template

```markdown
## Issue Title

**ID:** ISS-XXX
**Severity:** Critical / High / Medium / Low
**Category:** Infrastructure / Application / Security / Performance
**Discovered:** YYYY-MM-DD HH:MM
**Status:** Open / In Progress / Resolved

### Description
[Detailed description of the issue]

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Impact
[Impact on deployment]

### Resolution
[How it was fixed, or proposed solution]

### Verification
[How to verify the fix works]
```

### Issue Severity Levels

- **Critical:** Deployment cannot proceed, system is down
- **High:** Major functionality broken, significant impact
- **Medium:** Feature degradation, workaround available
- **Low:** Minor issues, cosmetic problems

## Test Schedule

### Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Pre-deployment Checklist | 15 min | T+0 | T+15 |
| Environment Setup | 30 min | T+15 | T+45 |
| Infrastructure Deployment | 45 min | T+45 | T+90 |
| Application Deployment | 30 min | T+90 | T+120 |
| Monitoring Deployment | 15 min | T+120 | T+135 |
| Smoke Tests | 60 min | T+135 | T+195 |
| Performance Tests | 30 min | T+195 | T+225 |
| Security Validation | 30 min | T+225 | T+255 |
| Documentation | 15 min | T+255 | T+270 |
| **Total** | **4.5 hours** | | |

### Milestones

- **M1:** Environment ready (T+45)
- **M2:** Infrastructure healthy (T+90)
- **M3:** Applications deployed (T+120)
- **M4:** Monitoring active (T+135)
- **M5:** All tests passing (T+255)
- **M6:** Deployment validated (T+270)

## Success Criteria

### Must Have (Go/No-Go Criteria)

- [ ] All infrastructure services healthy
- [ ] API passes all health checks
- [ ] Web application accessible
- [ ] Authentication works correctly
- [ ] Database operations successful
- [ ] No critical security issues
- [ ] All smoke tests pass
- [ ] Monitoring collecting metrics

### Should Have

- [ ] Performance meets baselines
- [ ] All exporters reporting
- [ ] Grafana dashboards working
- [ ] Backup/restore tested
- [ ] Documentation complete

### Nice to Have

- [ ] Load testing completed
- [ ] Chaos testing performed
- [ ] Security scanning passed
- [ ] Accessibility testing

## Risk Assessment

### High Risk Areas

1. **Database Initialization**
   - Risk: MongoDB replica set configuration fails
   - Mitigation: Use standalone mode for staging
   - Contingency: Manual database setup

2. **Secret Management**
   - Risk: Secrets not properly injected
   - Mitigation: Validation script before deployment
   - Contingency: Manual secret configuration

3. **Network Configuration**
   - Risk: Services cannot communicate
   - Mitigation: Pre-deployment network tests
   - Contingency: Use default bridge network

4. **Resource Constraints**
   - Risk: Insufficient resources for all services
   - Mitigation: Resource limits in docker-compose
   - Contingency: Scale down monitoring stack

### Medium Risk Areas

1. **SSL Certificate Generation**
2. **Docker image build failures**
3. **Port conflicts**
4. **Disk space exhaustion**

## Post-Test Activities

### 1. Documentation

- [ ] Update deployment guide with lessons learned
- [ ] Document any manual steps required
- [ ] Create troubleshooting guide
- [ ] Update runbook

### 2. Metrics Collection

- [ ] Export Prometheus metrics
- [ ] Capture performance baselines
- [ ] Screenshot Grafana dashboards
- [ ] Save resource usage data

### 3. Cleanup

- [ ] Stop staging environment
- [ ] Remove staging volumes (optional)
- [ ] Archive logs
- [ ] Document issues found

### 4. Reporting

- [ ] Create test execution report
- [ ] Share results with team
- [ ] Schedule production deployment
- [ ] Plan fixes for issues found

## Sign-Off

### Approval Required

- [ ] DevOps Lead
- [ ] Security Team
- [ ] Development Lead
- [ ] Product Owner

### Approval Criteria

1. All critical tests pass
2. No high-severity issues open
3. Security validation complete
4. Performance acceptable
5. Documentation complete

## Appendix

### A. Test Data

Location: `scripts/test-data/`

- `test-users.json` - Test user accounts
- `test-customers.json` - Sample customer data
- `test-jobs.json` - Sample job data
- `large-file.bin` - 100MB test file for upload

### B. Helper Scripts

- `scripts/setup-staging.sh` - Environment setup
- `scripts/smoke-test-staging.sh` - Automated smoke tests
- `scripts/cleanup-staging.sh` - Environment cleanup
- `scripts/generate-test-data.sh` - Create test data

### C. Reference Documents

- Docker Deployment Guide
- Environment Configuration Guide
- Security Hardening Checklist
- Production Readiness Checklist

### D. Contact Information

- **DevOps Team:** devops@simplepro.com
- **Security Team:** security@simplepro.com
- **On-Call:** +1-555-0100

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Next Review:** Before production deployment
