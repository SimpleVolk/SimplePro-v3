# SimplePro-v3 Penetration Testing Plan

**Document Version:** 1.0
**Date:** 2025-10-02
**Prepared By:** Claude Code - API Security Auditor
**Testing Scope:** Sprint 1 Week 1 Security Fixes Validation
**Priority:** CRITICAL

---

## Executive Summary

This penetration testing plan validates the security fixes implemented in Sprint 1 Week 1 for SimplePro-v3. The objective is to verify that all 4 critical vulnerabilities have been properly remediated and no new vulnerabilities were introduced.

### Testing Objectives

1. **Validate Security Fixes** - Confirm all 4 critical vulnerabilities are resolved
2. **Regression Testing** - Ensure fixes didn't introduce new vulnerabilities
3. **Attack Simulation** - Attempt to exploit previous vulnerabilities
4. **Defense Verification** - Confirm security controls are functioning
5. **Documentation** - Create evidence for compliance and audit purposes

### Vulnerabilities Under Test

| ID           | Vulnerability                       | Severity | Status                   |
| ------------ | ----------------------------------- | -------- | ------------------------ |
| CVE-2024-001 | Hardcoded Secrets in Docker Compose | CRITICAL | Fixed - Testing Required |
| CVE-2024-002 | JWT Secret Weak Fallback            | CRITICAL | Fixed - Testing Required |
| CVE-2024-003 | Document Sharing Password in URL    | CRITICAL | Fixed - Testing Required |
| CVE-2024-004 | WebSocket Connection Limit Bypass   | CRITICAL | Fixed - Testing Required |

---

## 1. Testing Scope

### 1.1 In-Scope Systems

**API Backend:**

- Authentication & Authorization (JWT, sessions)
- Document sharing endpoints
- WebSocket gateway
- Rate limiting mechanisms
- Input validation
- Error handling

**Infrastructure:**

- Docker Compose configuration
- Environment variable management
- Secret management system
- Database connections

**Configuration:**

- `.env` file handling
- `.env.docker` file handling
- JWT secret configuration
- Database credentials

### 1.2 Out-of-Scope

- Frontend web application vulnerabilities
- Mobile app security (separate testing)
- Third-party dependencies (covered by npm audit)
- Physical security
- Social engineering

### 1.3 Testing Timeline

| Phase     | Duration    | Activities                                |
| --------- | ----------- | ----------------------------------------- |
| Phase 1   | 2 hours     | Automated testing setup and execution     |
| Phase 2   | 2 hours     | Manual penetration testing                |
| Phase 3   | 2 hours     | OWASP Top 10 validation                   |
| Phase 4   | 2 hours     | Report generation and evidence collection |
| **Total** | **8 hours** | **Complete testing cycle**                |

---

## 2. Test Scenarios by Vulnerability

### 2.1 Hardcoded Secrets Testing (CVE-2024-001)

**Objective:** Verify no secrets are hardcoded and services fail without credentials

#### Test Case 2.1.1: Source Code Secret Scanning

**Priority:** CRITICAL
**Type:** Static Analysis

**Test Steps:**

1. Search entire codebase for hardcoded passwords
2. Grep for common password patterns
3. Search for default credentials
4. Check Docker Compose files for fallback values

**Commands:**

```bash
# Search for hardcoded passwords
grep -r "simplepro_dev" .
grep -r "simplepro_redis" .
grep -r "simplepro_minio" .
grep -r "password.*=" . --include="*.yml" --include="*.yaml"

# Search for credential patterns
grep -r "password.*:.*['\"]" . --include="*.yml"
grep -r "secret.*:.*['\"]" . --include="*.yml"
```

**Expected Result:**

- No matches for hardcoded secrets
- All credential references use environment variables
- No fallback default values

**Pass Criteria:** Zero hardcoded secrets found

---

#### Test Case 2.1.2: Docker Startup Without Credentials

**Priority:** CRITICAL
**Type:** Configuration Testing

**Test Steps:**

1. Remove `.env.docker` file if it exists
2. Attempt to start Docker services
3. Verify startup fails with clear error message
4. Check that no services start with default passwords

**Commands:**

```bash
# Remove credentials file
rm .env.docker 2>/dev/null

# Attempt startup
docker-compose -f docker-compose.dev.yml up -d

# Check running containers
docker ps | grep simplepro
```

**Expected Result:**

- Docker Compose fails to start
- Error messages indicate missing environment variables
- No containers running
- Clear guidance on required configuration

**Pass Criteria:** Services fail to start without explicit credentials

---

#### Test Case 2.1.3: Weak Password Rejection

**Priority:** HIGH
**Type:** Configuration Validation

**Test Steps:**

1. Create `.env.docker` with weak passwords
2. Attempt to start services
3. Test various weak password patterns
4. Verify rejection and helpful error messages

**Test Data:**

```bash
# Weak passwords to test
MONGODB_PASSWORD=password
MONGODB_PASSWORD=123456
MONGODB_PASSWORD=admin
REDIS_PASSWORD=redis
MINIO_ROOT_PASSWORD=minio123
```

**Expected Result:**

- System should warn about weak passwords (if validation implemented)
- Or allow but log security warning
- Documentation should guide users to strong passwords

**Pass Criteria:** System guides users toward strong passwords

---

#### Test Case 2.1.4: Environment Variable Validation

**Priority:** HIGH
**Type:** Configuration Testing

**Test Steps:**

1. Test with missing required variables
2. Test with empty string values
3. Test with special characters in passwords
4. Verify proper error handling

**Commands:**

```bash
# Test missing variables
unset MONGODB_PASSWORD
docker-compose -f docker-compose.dev.yml config

# Test empty values
export MONGODB_PASSWORD=""
docker-compose -f docker-compose.dev.yml config
```

**Expected Result:**

- Clear error messages for missing variables
- Rejection of empty values
- Proper handling of special characters
- No exposure of actual values in error messages

**Pass Criteria:** Comprehensive validation prevents misconfiguration

---

### 2.2 JWT Secret Testing (CVE-2024-002)

**Objective:** Verify JWT secrets are mandatory, strong, and cannot be bypassed

#### Test Case 2.2.1: Missing JWT Secret

**Priority:** CRITICAL
**Type:** Authentication Testing

**Test Steps:**

1. Remove JWT_SECRET from environment
2. Attempt to start API server
3. Verify startup fails immediately
4. Check error message clarity

**Commands:**

```bash
# Remove JWT secret
unset JWT_SECRET
unset JWT_REFRESH_SECRET

# Attempt API startup
cd apps/api
npm run start:dev

# Expected: Immediate failure
```

**Expected Result:**

- API fails to start
- Error: "JWT_SECRET configuration failed. Please ensure JWT_SECRET environment variable is set..."
- No fallback to default secret
- Clear remediation instructions

**Pass Criteria:** API refuses to start without JWT_SECRET

---

#### Test Case 2.2.2: Weak JWT Secret Rejection

**Priority:** CRITICAL
**Type:** Cryptographic Validation

**Test Steps:**

1. Set JWT_SECRET to less than 32 characters
2. Attempt to start API server
3. Test various weak secret patterns
4. Verify minimum length enforcement

**Commands:**

```bash
# Test weak secrets
export JWT_SECRET="short"
npm run start:dev

export JWT_SECRET="12345678901234567890123"
npm run start:dev

export JWT_SECRET="weak-secret-key"
npm run start:dev
```

**Expected Result:**

- Error: "JWT_SECRET must be at least 32 characters long..."
- Startup fails for any secret < 32 chars
- Clear guidance on generating strong secrets
- No hint about actual secret value in logs

**Pass Criteria:** All secrets < 32 characters are rejected

---

#### Test Case 2.2.3: Token Forgery Attempt

**Priority:** CRITICAL
**Type:** Authentication Bypass

**Test Steps:**

1. Generate a JWT token using a known weak secret
2. Attempt to use the token for API access
3. Try common default secrets
4. Verify all attempts are rejected

**Attack Vectors:**

```javascript
// Attempt token generation with common secrets
const weakSecrets = [
  'default-secret-key',
  'simplepro-development-secret-key-change-in-production',
  'secret',
  'password',
  'simplepro',
];

// For each weak secret, try to forge a token
```

**Expected Result:**

- All forged tokens rejected
- 401 Unauthorized response
- "Invalid token" error message
- Security event logged

**Pass Criteria:** Zero successful authentications with forged tokens

---

#### Test Case 2.2.4: JWT Algorithm Confusion

**Priority:** HIGH
**Type:** Cryptographic Attack

**Test Steps:**

1. Create token with "none" algorithm
2. Create token with mismatched algorithm (RS256 vs HS256)
3. Attempt symmetric/asymmetric confusion
4. Verify all are rejected

**Attack Payloads:**

```javascript
// Token with "none" algorithm
header: {
  alg: 'none';
}

// Algorithm confusion
header: {
  alg: 'HS256';
} // when expecting RS256
header: {
  alg: 'RS256';
} // when expecting HS256
```

**Expected Result:**

- All algorithm confusion attempts fail
- Tokens with "none" algorithm rejected
- Algorithm validation enforced
- 401 Unauthorized for all attempts

**Pass Criteria:** Algorithm validation prevents confusion attacks

---

### 2.3 Document Sharing Security (CVE-2024-003)

**Objective:** Verify passwords are secure and rate limiting prevents brute force

#### Test Case 2.3.1: Password in URL Rejection

**Priority:** CRITICAL
**Type:** API Security

**Test Steps:**

1. Attempt GET request with password in query string
2. Verify GET method is blocked
3. Check server logs for password exposure
4. Confirm POST method is required

**Commands:**

```bash
# Attempt GET with password (OLD VULNERABLE METHOD)
curl -X GET "http://localhost:3001/api/documents/shared/TOKEN123/access?password=testpass"

# Expected: 404 or 405 Method Not Allowed
```

**Expected Result:**

- GET request fails (404 or 405)
- Endpoint not accessible via GET
- No password in server access logs
- Error indicates POST required

**Pass Criteria:** GET method completely blocked

---

#### Test Case 2.3.2: POST Body Password Validation

**Priority:** CRITICAL
**Type:** API Security

**Test Steps:**

1. Send POST request with password in body
2. Verify proper authentication
3. Check logs to ensure no password leakage
4. Confirm secure handling

**Commands:**

```bash
# Correct POST method
curl -X POST http://localhost:3001/api/documents/shared/TOKEN123/access \
  -H "Content-Type: application/json" \
  -d '{"password":"testpassword123"}'

# Check server logs
tail -f apps/api/logs/app.log | grep "password"
```

**Expected Result:**

- POST request accepted
- Password not visible in logs
- Proper password validation
- Secure error messages

**Pass Criteria:** Passwords never appear in logs or URLs

---

#### Test Case 2.3.3: Brute Force Rate Limiting

**Priority:** CRITICAL
**Type:** DoS Protection

**Test Steps:**

1. Send 5 requests with wrong passwords (within limit)
2. Send 6th request (should be rate limited)
3. Verify 429 Too Many Requests response
4. Check retry-after header
5. Wait for TTL and test again

**Commands:**

```bash
#!/bin/bash
# Brute force test script

TOKEN="valid_test_token_here"
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3001/api/documents/shared/$TOKEN/access \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"wrong$i\"}" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s -o /dev/null
  echo "---"
done
```

**Expected Result:**

- Requests 1-5: 401 Unauthorized (wrong password)
- Request 6: 429 Too Many Requests
- Response includes retry-after header (3600 seconds)
- Rate limit resets after TTL

**Pass Criteria:** Exactly 5 attempts allowed per hour per IP

---

#### Test Case 2.3.4: Rate Limit Bypass Attempts

**Priority:** HIGH
**Type:** Security Control Bypass

**Test Steps:**

1. Attempt bypass via X-Forwarded-For header spoofing
2. Try different user agents
3. Test with VPN/proxy IP changes
4. Verify rate limiting holds

**Attack Vectors:**

```bash
# IP spoofing attempt
curl -X POST http://localhost:3001/api/documents/shared/TOKEN/access \
  -H "X-Forwarded-For: 1.2.3.4" \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'

# Different user agents
curl -X POST http://localhost:3001/api/documents/shared/TOKEN/access \
  -H "User-Agent: Mozilla/5.0" \
  -d '{"password":"wrong"}'
```

**Expected Result:**

- Header spoofing doesn't bypass rate limiting
- Rate limiting based on actual client IP
- User agent changes don't reset counter
- Consistent enforcement

**Pass Criteria:** Rate limiting cannot be bypassed

---

#### Test Case 2.3.5: Audit Log Verification

**Priority:** HIGH
**Type:** Logging & Monitoring

**Test Steps:**

1. Make valid access attempt
2. Make invalid attempts (wrong password, expired token)
3. Review audit logs
4. Verify all attempts are logged with proper metadata

**Commands:**

```bash
# Generate test events
# 1. Valid access
curl -X POST http://localhost:3001/api/documents/shared/VALID_TOKEN/access \
  -H "Content-Type: application/json" \
  -d '{"password":"correct_password"}'

# 2. Wrong password
curl -X POST http://localhost:3001/api/documents/shared/VALID_TOKEN/access \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong_password"}'

# 3. Expired token
curl -X POST http://localhost:3001/api/documents/shared/EXPIRED_TOKEN/access \
  -H "Content-Type: application/json" \
  -d '{"password":"any_password"}'

# Review logs
grep "Document share access" apps/api/logs/app.log
```

**Expected Result:**

- All attempts logged
- Timestamp, IP, outcome recorded
- No password values in logs
- Structured log format for SIEM integration

**Pass Criteria:** Comprehensive audit trail without sensitive data

---

### 2.4 WebSocket Security (CVE-2024-004)

**Objective:** Verify connection limits, authentication-first, and event rate limiting

#### Test Case 2.4.1: Unauthenticated Connection Rejection

**Priority:** CRITICAL
**Type:** Authentication Testing

**Test Steps:**

1. Attempt WebSocket connection without JWT token
2. Verify immediate disconnection
3. Check that no resources are allocated
4. Confirm clear error message

**Commands:**

```bash
# Install wscat if needed
npm install -g wscat

# Attempt connection without auth
wscat -c ws://localhost:3001/realtime

# Expected: Immediate disconnect with error
```

**Expected Result:**

- Connection rejected immediately
- Error: "Authentication required"
- No resource allocation before auth
- WebSocket closes with error code

**Pass Criteria:** Zero unauthenticated connections allowed

---

#### Test Case 2.4.2: Per-User Connection Limit

**Priority:** CRITICAL
**Type:** Resource Control

**Test Steps:**

1. Generate valid JWT token for test user
2. Open 5 WebSocket connections (within limit)
3. Attempt 6th connection (should fail)
4. Verify error message indicates limit reached

**Commands:**

```bash
#!/bin/bash
# Get JWT token first
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}' \
  | jq -r '.accessToken')

# Open multiple connections
for i in {1..6}; do
  echo "Opening connection $i"
  wscat -c "ws://localhost:3001/realtime" \
    -H "Authorization: Bearer $TOKEN" &
  sleep 1
done

# Check connection count
```

**Expected Result:**

- Connections 1-5: Accepted and active
- Connection 6: Rejected
- Error: "Maximum connections per user exceeded (5/5)"
- Existing connections remain stable

**Pass Criteria:** Exactly 5 connections per user allowed

---

#### Test Case 2.4.3: Per-IP Connection Limit

**Priority:** CRITICAL
**Type:** DoS Protection

**Test Steps:**

1. Create 2 test users
2. Open 5 connections from user 1
3. Open 5 connections from user 2 (same IP)
4. Attempt 11th connection (should fail due to IP limit)

**Expected Result:**

- 10 total connections allowed (2 users × 5 connections)
- 11th connection rejected
- Error: "Maximum connections per IP exceeded (10/10)"
- Per-user limit also enforced

**Pass Criteria:** Maximum 10 connections per IP address

---

#### Test Case 2.4.4: Event Rate Limiting

**Priority:** CRITICAL
**Type:** DoS Protection

**Test Steps:**

1. Establish authenticated WebSocket connection
2. Send 100 events rapidly (within limit)
3. Send 101st event (should be rate limited)
4. Verify rate limit error

**Test Events:**

```javascript
// Send via wscat
// Event 1-100: Allowed
{
  "event": "message.send",
  "data": {
    "threadId": "thread123",
    "content": "Test message 1"
  }
}

// Event 101: Should fail
{
  "event": "message.send",
  "data": {
    "threadId": "thread123",
    "content": "Test message 101"
  }
}
```

**Expected Result:**

- Events 1-100: Processed successfully
- Event 101: Error response
- Error: "Rate limit exceeded: 100 events per minute"
- Connection remains open
- Rate limit resets after 60 seconds

**Pass Criteria:** Exactly 100 events per minute per connection

---

#### Test Case 2.4.5: Connection Flooding DoS

**Priority:** CRITICAL
**Type:** DoS Attack Simulation

**Test Steps:**

1. Attempt to open 1000+ connections rapidly
2. Monitor server resource usage
3. Verify limits prevent resource exhaustion
4. Check for memory leaks

**Commands:**

```bash
#!/bin/bash
# DoS simulation script

# Generate tokens for multiple fake users
for i in {1..200}; do
  (
    # Each iteration tries to open connections
    TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"user$i\",\"password\":\"Test123!\"}" \
      | jq -r '.accessToken')

    # Try to open 6 connections (1 over limit)
    for j in {1..6}; do
      wscat -c "ws://localhost:3001/realtime" \
        -H "Authorization: Bearer $TOKEN" &
    done
  ) &
done

# Monitor server
htop
```

**Expected Result:**

- Server remains stable
- Memory usage controlled
- CPU usage acceptable
- Connection limits enforced
- No resource exhaustion
- Clear rejection messages

**Pass Criteria:** Server handles flood without crash or degradation

---

#### Test Case 2.4.6: Memory Leak Testing

**Priority:** HIGH
**Type:** Resource Management

**Test Steps:**

1. Open 100 connections
2. Close all connections
3. Monitor memory usage
4. Verify proper cleanup
5. Repeat cycle 10 times

**Commands:**

```bash
#!/bin/bash
# Memory leak test

for cycle in {1..10}; do
  echo "Cycle $cycle"

  # Record memory before
  BEFORE=$(ps aux | grep "node.*api" | awk '{print $6}')

  # Open connections
  for i in {1..100}; do
    wscat -c "ws://localhost:3001/realtime" \
      -H "Authorization: Bearer $TOKEN" &
    PIDS[$i]=$!
  done

  sleep 5

  # Close all connections
  for pid in ${PIDS[@]}; do
    kill $pid 2>/dev/null
  done

  sleep 5

  # Record memory after
  AFTER=$(ps aux | grep "node.*api" | awk '{print $6}')

  echo "Memory: Before=$BEFORE KB, After=$AFTER KB"
done
```

**Expected Result:**

- Memory returns to baseline after disconnect
- No steady memory increase over cycles
- Event rate limiters cleaned up
- Typing indicators cleared
- Room memberships removed

**Pass Criteria:** Memory stable across 10 cycles

---

#### Test Case 2.4.7: Authentication-First Verification

**Priority:** CRITICAL
**Type:** Architecture Validation

**Test Steps:**

1. Monitor connection handling order
2. Verify authentication happens before resource allocation
3. Check log timestamps
4. Confirm design prevents resource DoS

**Verification Method:**

```javascript
// Review code execution order in websocket.gateway.ts
// handleConnection method should:
// 1. Extract and verify JWT (FIRST)
// 2. Check user connection limit (SECOND)
// 3. Check IP connection limit (THIRD)
// 4. THEN allocate resources (LAST)
```

**Expected Result:**

- JWT verification is first operation
- No resources allocated before auth
- Limits checked before acceptance
- Failed auth = zero resource cost

**Pass Criteria:** Code review confirms auth-first architecture

---

## 3. OWASP API Security Top 10 Testing

### API1:2023 - Broken Object Level Authorization (BOLA)

**Test Objective:** Verify users can only access their own resources

#### Test Case 3.1: Document Access Control

```bash
# As User A, get document ID
TOKEN_A=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usera","password":"Test123!"}' \
  | jq -r '.accessToken')

DOC_ID=$(curl -s http://localhost:3001/api/documents \
  -H "Authorization: Bearer $TOKEN_A" \
  | jq -r '.[0].id')

# As User B, try to access User A's document
TOKEN_B=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"userb","password":"Test123!"}' \
  | jq -r '.accessToken')

curl -X GET http://localhost:3001/api/documents/$DOC_ID \
  -H "Authorization: Bearer $TOKEN_B"

# Expected: 403 Forbidden
```

**Pass Criteria:** 403 Forbidden for unauthorized resource access

---

### API2:2023 - Broken Authentication

**Test Objective:** Verify authentication mechanisms are secure

#### Test Case 3.2: Password Authentication

```bash
# Test common attacks
# 1. Empty password
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":""}'

# 2. SQL injection in password
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"'\'' OR 1=1--"}'

# 3. NoSQL injection
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":{"$ne":null}}'

# All should fail with 401
```

**Pass Criteria:** All injection attempts rejected

---

### API3:2023 - Broken Object Property Level Authorization

**Test Objective:** Verify users cannot modify protected fields

#### Test Case 3.3: Role Escalation Prevention

```bash
# As regular user, attempt to set admin role
curl -X PATCH http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Expected: 403 or field ignored
```

**Pass Criteria:** Protected fields cannot be modified by unauthorized users

---

### API4:2023 - Unrestricted Resource Consumption

**Test Objective:** Verify rate limiting and resource controls

#### Test Case 3.4: API Rate Limiting

```bash
# Test global rate limiting
for i in {1..201}; do
  curl -X GET http://localhost:3001/api/health \
    -w "Request $i: %{http_code}\n" \
    -s -o /dev/null
done

# Expected: Requests 1-200 succeed, 201+ get 429
```

**Pass Criteria:** Rate limits prevent resource exhaustion

---

### API5:2023 - Broken Function Level Authorization

**Test Objective:** Verify role-based access control

#### Test Case 3.5: Admin Endpoint Protection

```bash
# As regular user, try admin endpoints
curl -X GET http://localhost:3001/api/admin/settings \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected: 403 Forbidden

# Test tariff management
curl -X PUT http://localhost:3001/api/tariff-settings/general \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"baseRate":1000}'

# Expected: 403 Forbidden (requires admin role)
```

**Pass Criteria:** All admin endpoints require appropriate permissions

---

### API6:2023 - Unrestricted Access to Sensitive Business Flows

**Test Objective:** Verify business logic protection

#### Test Case 3.6: Job State Manipulation

```bash
# Try to skip job workflow states
curl -X PATCH http://localhost:3001/api/jobs/JOB_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# Expected: Validation error (must follow proper workflow)
```

**Pass Criteria:** Business workflows cannot be bypassed

---

### API7:2023 - Server Side Request Forgery (SSRF)

**Test Objective:** Verify URL validation prevents SSRF

#### Test Case 3.7: SSRF in Document URLs

```bash
# Attempt internal network access
curl -X POST http://localhost:3001/api/documents/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:27017/admin"}'

# Expected: Rejected or proper validation
```

**Pass Criteria:** Internal URLs and cloud metadata endpoints blocked

---

### API8:2023 - Security Misconfiguration

**Test Objective:** Verify secure defaults and configuration

#### Test Case 3.8: Security Headers

```bash
# Check security headers
curl -I http://localhost:3001/api/health

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security (in production)
```

**Pass Criteria:** All security headers present

---

### API9:2023 - Improper Inventory Management

**Test Objective:** Verify API documentation and version control

#### Test Case 3.9: API Documentation

```bash
# Check for exposed debug endpoints
curl http://localhost:3001/debug
curl http://localhost:3001/api/debug
curl http://localhost:3001/api-docs

# Expected: 404 in production, protected in dev
```

**Pass Criteria:** No debug endpoints in production

---

### API10:2023 - Unsafe Consumption of APIs

**Test Objective:** Verify third-party API security

#### Test Case 3.10: External API Validation

```bash
# Test timeout handling for external APIs
# (If SimplePro calls external APIs)
# Verify:
# - Timeouts configured
# - SSL/TLS verification enabled
# - Response validation
# - Error handling
```

**Pass Criteria:** External API calls are secure and validated

---

## 4. Input Validation Testing

### 4.1 NoSQL Injection

**Test Cases:**

```bash
# MongoDB operator injection
curl -X POST http://localhost:3001/api/customers/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":{"$ne":null}}'

# JavaScript injection
curl -X POST http://localhost:3001/api/customers/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":{"$where":"this.name.length > 0"}}'
```

**Pass Criteria:** All MongoDB operators sanitized or rejected

---

### 4.2 XSS Prevention

**Test Cases:**

```bash
# Stored XSS
curl -X POST http://localhost:3001/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@test.com"}'

# Check response sanitization
curl -X GET http://localhost:3001/api/customers/CUSTOMER_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Script tags escaped or stripped
```

**Pass Criteria:** XSS payloads are sanitized

---

### 4.3 File Upload Validation

**Test Cases:**

```bash
# Upload malicious file
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@malicious.php"

# Upload oversized file
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@largefile.bin"

# Expected: Both rejected with proper error messages
```

**Pass Criteria:** File type validation and size limits enforced

---

## 5. Session Management Testing

### 5.1 Token Expiration

**Test Cases:**

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}' \
  | jq -r '.accessToken')

# Wait for expiration (1 hour for access token)
# Or manually expire in database

# Attempt to use expired token
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: 401 Unauthorized
```

**Pass Criteria:** Expired tokens are rejected

---

### 5.2 Token Refresh

**Test Cases:**

```bash
# Test refresh token flow
REFRESH_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}' \
  | jq -r '.refreshToken')

# Use refresh token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# Expected: New access token returned
```

**Pass Criteria:** Refresh token flow works correctly

---

## 6. Error Handling Testing

### 6.1 Information Disclosure

**Test Cases:**

```bash
# Invalid endpoint
curl -X GET http://localhost:3001/api/invalid-endpoint

# Database error simulation
curl -X GET http://localhost:3001/api/customers/invalid-id \
  -H "Authorization: Bearer $TOKEN"

# Expected: Generic error, no stack traces or DB details
```

**Pass Criteria:** Errors don't leak sensitive information

---

## 7. Testing Tools and Environment

### 7.1 Required Tools

- **curl** - API testing
- **wscat** - WebSocket testing
- **jq** - JSON parsing
- **Burp Suite Community** - Proxy and scanner (optional)
- **OWASP ZAP** - Vulnerability scanning (optional)
- **Artillery** - Load testing (optional)

### 7.2 Test Environment Setup

```bash
# 1. Start infrastructure
npm run docker:dev

# 2. Seed test data
npm run seed:dev

# 3. Start API
npm run dev:api

# 4. Verify health
curl http://localhost:3001/api/health
```

---

## 8. Success Criteria

### 8.1 Critical Requirements

| Test Category      | Pass Criteria                                   |
| ------------------ | ----------------------------------------------- |
| Hardcoded Secrets  | 0 secrets in code, all env vars required        |
| JWT Authentication | No weak fallbacks, all forged tokens rejected   |
| Document Sharing   | Rate limiting works, no passwords in logs       |
| WebSocket Security | Connection limits enforced, auth-first verified |
| OWASP Top 10       | All 10 categories pass                          |
| Input Validation   | All injection attempts blocked                  |

### 8.2 Overall Pass Criteria

- **100% of critical tests pass**
- **95%+ of all tests pass**
- **Zero critical vulnerabilities found**
- **All security fixes validated**
- **Comprehensive evidence collected**

---

## 9. Reporting Requirements

### 9.1 Test Evidence

For each test:

1. Screenshots of test execution
2. Command outputs (sanitized)
3. Log excerpts (no sensitive data)
4. Video recordings for complex scenarios

### 9.2 Report Sections

1. Executive Summary
2. Test Results by Vulnerability
3. OWASP Top 10 Compliance
4. New Issues Discovered
5. Risk Assessment
6. Recommendations
7. Appendix (Evidence)

---

## 10. Post-Testing Activities

### 10.1 Remediation Tracking

If issues found:

1. Log in issue tracking system
2. Assign severity and priority
3. Create remediation plan
4. Retest after fixes

### 10.2 Continuous Testing

1. Add tests to CI/CD pipeline
2. Schedule weekly automated scans
3. Quarterly manual pen tests
4. Annual third-party security audit

---

## Appendix A: Test Data

### A.1 Test Users

```javascript
const testUsers = [
  {
    username: 'testuser1',
    password: 'Test123!',
    role: 'user',
  },
  {
    username: 'testadmin',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    username: 'testsales',
    password: 'Sales123!',
    role: 'sales',
  },
];
```

### A.2 Test Tokens

```javascript
// Sample shared document tokens for testing
const testTokens = [
  'valid_token_12345',
  'expired_token_67890',
  'invalid_token_abcde',
];
```

---

## Appendix B: Attack Payloads

### B.1 NoSQL Injection Payloads

```javascript
const nosqlPayloads = [
  { $ne: null },
  { $gt: '' },
  { $where: 'this.password.length > 0' },
  { $regex: '.*' },
  { $exists: true },
];
```

### B.2 XSS Payloads

```javascript
const xssPayloads = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
];
```

### B.3 JWT Payloads

```javascript
const jwtPayloads = [
  // Algorithm none
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiI2NzA4YTBhM2RhNjliMGQzYWM2ZTU2M2YifQ.',

  // Weak signature
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiJ9.signature',
];
```

---

**Document Status:** APPROVED
**Version:** 1.0
**Next Review:** After test execution
**Owner:** Security Team
