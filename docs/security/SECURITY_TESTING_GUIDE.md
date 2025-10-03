# Security Testing Guide

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Purpose:** Ongoing security testing procedures for SimplePro-v3
**Audience:** Development Team, Security Team, QA Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Quick Start](#2-quick-start)
3. [Automated Security Testing](#3-automated-security-testing)
4. [Manual Testing Procedures](#4-manual-testing-procedures)
5. [CI/CD Integration](#5-cicd-integration)
6. [Testing Schedule](#6-testing-schedule)
7. [Incident Response](#7-incident-response)
8. [Tools and Resources](#8-tools-and-resources)

---

## 1. Introduction

### 1.1 Purpose

This guide provides standardized procedures for security testing of SimplePro-v3. It ensures consistent, repeatable security validation across development cycles.

### 1.2 Scope

- **API Security Testing**
- **Authentication/Authorization Testing**
- **Input Validation Testing**
- **Rate Limiting Verification**
- **WebSocket Security Testing**
- **Configuration Security**

### 1.3 Testing Philosophy

**Shift-Left Security:** Test early, test often
- Security tests run on every commit
- Automated tests in CI/CD pipeline
- Manual tests before major releases
- Continuous monitoring in production

---

## 2. Quick Start

### 2.1 Prerequisites

```bash
# Install required tools
npm install -g wscat

# Verify environment
node --version  # Should be >= 20.0.0
curl --version
```

### 2.2 Run Automated Tests (5 minutes)

```bash
# 1. Start infrastructure
npm run docker:dev

# 2. Start API
npm run dev:api

# 3. Run security tests
node scripts/security-pentest.js

# Expected output: All tests pass
```

### 2.3 Quick Security Check

```bash
# Health check
curl http://localhost:3001/api/health

# Authentication test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Expected: Returns JWT tokens
```

---

## 3. Automated Security Testing

### 3.1 Running the Test Suite

**Full Test Suite:**
```bash
# Run all security tests
node scripts/security-pentest.js

# Expected output:
# ✓ Hardcoded Secrets: X/X passed
# ✓ JWT Security: X/X passed
# ✓ Document Sharing: X/X passed
# ✓ WebSocket Security: X/X passed
# ✓ Input Validation: X/X passed
```

**Category-Specific Tests:**
```bash
# Test only JWT security
node scripts/security-pentest.js --category=jwt

# Test only WebSocket security
node scripts/security-pentest.js --category=websocket

# Test only document sharing
node scripts/security-pentest.js --category=documents

# Test only hardcoded secrets
node scripts/security-pentest.js --category=secrets

# Test only input validation
node scripts/security-pentest.js --category=input
```

**Verbose Mode:**
```bash
# Get detailed output
node scripts/security-pentest.js --verbose

# Shows:
# - Each test execution
# - Response details
# - Timing information
# - Detailed failure messages
```

### 3.2 Understanding Test Results

**Test Output Format:**
```
╔════════════════════════════════════════════════════════════╗
║   SimplePro-v3 Security Penetration Testing Suite         ║
║   Sprint 1 Week 1 - Security Fixes Validation             ║
╚════════════════════════════════════════════════════════════╝

Category 1: Hardcoded Secrets Testing

ℹ Test 1.1: Scanning for hardcoded secrets...
✓ No hardcoded secrets in Docker Compose files
✓ .env.docker.example exists with security guidance
✓ Docker Compose has no fallback defaults

Category 2: JWT Security Testing
...

Test Results Summary

Total Tests: 50
Passed: 50
Failed: 0
Pass Rate: 100%
Duration: 45.2s

Results by Category:
  ✓ hardcoded-secrets: 3/3 (100%)
  ✓ jwt-security: 10/10 (100%)
  ✓ document-sharing: 12/12 (100%)
  ✓ websocket-security: 15/15 (100%)
  ✓ input-validation: 10/10 (100%)
```

**Test Result File:**
```bash
# Detailed results saved to
cat security-pentest-results.json

# Contains:
# - Summary statistics
# - Individual test results
# - Timing information
# - Failure details (if any)
```

### 3.3 Test Failure Investigation

**When Tests Fail:**

1. **Review the error message:**
   ```bash
   node scripts/security-pentest.js --verbose
   ```

2. **Check the detailed results:**
   ```bash
   cat security-pentest-results.json | jq '.tests[] | select(.passed == false)'
   ```

3. **Verify environment:**
   ```bash
   # Is API running?
   curl http://localhost:3001/api/health

   # Are services up?
   docker ps | grep simplepro
   ```

4. **Check logs:**
   ```bash
   tail -f apps/api/logs/app.log
   ```

5. **Rerun specific category:**
   ```bash
   node scripts/security-pentest.js --category=jwt --verbose
   ```

---

## 4. Manual Testing Procedures

### 4.1 Pre-Release Security Checklist

Use the manual checklist before every release:

```bash
# Location
docs/security/MANUAL_PENTEST_CHECKLIST.md
```

**Key Areas to Test:**

1. **Authentication**
   - Login with valid credentials
   - Login with invalid credentials
   - Token expiration
   - Token refresh

2. **Authorization**
   - Access control enforcement
   - Role-based permissions
   - Resource ownership validation

3. **Rate Limiting**
   - Document sharing (5/hour)
   - WebSocket connections (5/user, 10/IP)
   - WebSocket events (100/minute)

4. **Input Validation**
   - XSS attempts
   - NoSQL injection
   - SQL injection (if applicable)
   - Path traversal

### 4.2 OWASP API Top 10 Testing

**Schedule:** Before major releases (monthly)

**Procedure:**
1. Review OWASP API Security Top 10 checklist
2. Test each category systematically
3. Document findings
4. Create tickets for issues
5. Retest after fixes

**Checklist Location:**
```
docs/security/MANUAL_PENTEST_CHECKLIST.md
Section 3: OWASP API Security Top 10
```

### 4.3 Penetration Testing

**Schedule:** Quarterly or before major releases

**Procedure:**
1. Review penetration testing plan
2. Execute automated tests
3. Perform manual testing
4. Document all findings
5. Generate report
6. Remediate issues
7. Retest

**Documentation:**
- Plan: `docs/security/PENETRATION_TESTING_PLAN.md`
- Checklist: `docs/security/MANUAL_PENTEST_CHECKLIST.md`
- Report Template: `docs/security/PENETRATION_TEST_REPORT.md`

---

## 5. CI/CD Integration

### 5.1 GitHub Actions Workflow

Create `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    # Run daily at 2 AM
    - cron: '0 2 * * *'

jobs:
  security-tests:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpass
        ports:
          - 27017:27017

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build API
        run: npm run build

      - name: Start API
        run: |
          cd apps/api
          npm run start:prod &
          sleep 10
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://testuser:testpass@localhost:27017/simplepro-test?authSource=admin
          JWT_SECRET: ${{ secrets.JWT_SECRET_TEST }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET_TEST }}

      - name: Run security tests
        run: node scripts/security-pentest.js

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: security-pentest-results.json

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('security-pentest-results.json'));

            const body = `## Security Test Results

            - **Total Tests:** ${results.summary.total}
            - **Passed:** ${results.summary.passed}
            - **Failed:** ${results.summary.failed}
            - **Pass Rate:** ${results.summary.passRate}

            ${results.summary.failed > 0 ? '⚠️ **Security tests failed. Please review.**' : '✅ **All security tests passed.**'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Fail if security tests failed
        run: |
          FAILED=$(cat security-pentest-results.json | jq '.summary.failed')
          if [ "$FAILED" -gt 0 ]; then
            echo "❌ Security tests failed"
            exit 1
          fi
```

### 5.2 Pre-commit Hooks

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run quick security checks on commit
echo "Running security checks..."

# 1. Check for hardcoded secrets
if git diff --cached | grep -i "password.*=.*['\"]" > /dev/null; then
  echo "❌ Possible hardcoded password detected!"
  echo "Please use environment variables instead."
  exit 1
fi

# 2. Check for debug code
if git diff --cached | grep -i "console.log\|debugger" > /dev/null; then
  echo "⚠️  Warning: Debug code detected"
  echo "Please remove before committing to main."
fi

# 3. Scan for common secrets
if git diff --cached | grep -iE "(api[_-]?key|secret[_-]?key|access[_-]?token).*=.*['\"]" > /dev/null; then
  echo "❌ Possible API key or secret detected!"
  exit 1
fi

echo "✅ Security checks passed"
```

### 5.3 Required Secrets in CI/CD

**GitHub Secrets to Configure:**

```
JWT_SECRET_TEST=<64-character-random-string>
JWT_REFRESH_SECRET_TEST=<64-character-random-string>
```

**Generate Secrets:**
```bash
# Generate test secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Testing Schedule

### 6.1 Continuous Testing (Every Commit)

**Automated Tests:**
- ✅ Run on every pull request
- ✅ Run on merge to main
- ✅ Block merge if tests fail

**What's Tested:**
- Hardcoded secret scanning
- JWT security validation
- Input validation
- Basic authentication tests

**Duration:** ~2-3 minutes

---

### 6.2 Daily Testing

**Schedule:** 2:00 AM UTC
**Type:** Automated
**Scope:** Full security test suite

**Tests Run:**
- All automated security tests
- Rate limiting verification
- WebSocket security tests
- OWASP Top 10 quick scan

**Duration:** ~10-15 minutes

**Notifications:**
- Email on failure
- Slack alert on failure
- GitHub issue created for failures

---

### 6.3 Weekly Testing

**Schedule:** Every Monday 9:00 AM
**Type:** Manual + Automated
**Scope:** Comprehensive security review

**Checklist:**
1. Run full automated test suite
2. Review security logs for anomalies
3. Check rate limit metrics
4. Review authentication failures
5. Scan dependencies for vulnerabilities
6. Update security documentation

**Duration:** 1-2 hours
**Owner:** Security Team Lead

---

### 6.4 Monthly Testing

**Schedule:** First Friday of each month
**Type:** Manual penetration testing
**Scope:** OWASP API Top 10 + Custom tests

**Procedure:**
1. Execute automated test suite
2. Perform manual OWASP API Top 10 testing
3. Test new features for security issues
4. Review and update security documentation
5. Generate monthly security report
6. Plan remediation for findings

**Duration:** 4-8 hours
**Owner:** Security Team

**Deliverables:**
- Monthly security report
- Updated risk assessment
- Remediation tickets
- Updated security metrics

---

### 6.5 Quarterly Testing

**Schedule:** End of each quarter
**Type:** Full penetration testing
**Scope:** Comprehensive security audit

**Procedure:**
1. Full penetration testing engagement
2. Third-party security assessment (optional)
3. Comprehensive OWASP compliance check
4. Infrastructure security review
5. Incident response drill
6. Security awareness training

**Duration:** 2-3 days
**Owner:** CISO / Security Director

**Deliverables:**
- Comprehensive penetration test report
- Executive summary for management
- Updated security roadmap
- Compliance certification

---

### 6.6 Before Major Releases

**Type:** Mandatory security gate
**Scope:** Release-specific security validation

**Checklist:**
1. ✅ All automated tests passing
2. ✅ Manual OWASP Top 10 testing complete
3. ✅ No critical or high vulnerabilities
4. ✅ Security review of new features
5. ✅ Configuration security validated
6. ✅ Dependency vulnerabilities addressed
7. ✅ Penetration test report approved

**Duration:** 1 day
**Owner:** Release Manager + Security Team

---

## 7. Incident Response

### 7.1 Security Test Failure Response

**When Automated Tests Fail:**

1. **Immediate Actions** (within 1 hour):
   ```bash
   # 1. Check test results
   cat security-pentest-results.json | jq '.tests[] | select(.passed == false)'

   # 2. Review logs
   tail -f apps/api/logs/app.log

   # 3. Verify environment
   curl http://localhost:3001/api/health
   ```

2. **Investigation** (within 4 hours):
   - Identify root cause
   - Assess impact
   - Determine severity
   - Create incident ticket

3. **Resolution** (timeline based on severity):
   - **Critical:** Fix within 24 hours
   - **High:** Fix within 1 week
   - **Medium:** Fix within 1 month
   - **Low:** Plan for next sprint

4. **Verification**:
   - Rerun failed tests
   - Execute full test suite
   - Update documentation

5. **Post-Incident**:
   - Document lessons learned
   - Update tests if needed
   - Share with team

### 7.2 Security Incident During Testing

**If Vulnerability Discovered:**

1. **Do NOT disclose publicly**
2. **Immediately notify:**
   - Security team lead
   - Development team lead
   - CTO/CISO

3. **Document:**
   - Vulnerability details
   - Reproduction steps
   - Potential impact
   - Affected systems

4. **Follow incident response playbook:**
   ```
   docs/security/INCIDENT_RESPONSE_PLAYBOOK.md
   ```

---

## 8. Tools and Resources

### 8.1 Testing Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **curl** | API testing | Pre-installed on most systems |
| **wscat** | WebSocket testing | `npm install -g wscat` |
| **jq** | JSON processing | `apt-get install jq` (Linux) |
| **Postman** | API testing UI | Download from postman.com |
| **Burp Suite** | Proxy/Scanner | Download Community Edition |
| **OWASP ZAP** | Vulnerability scanning | Download from zaproxy.org |

### 8.2 npm Scripts

```bash
# Security testing
npm run test:security          # Run automated security tests
npm run test:security:verbose  # Run with detailed output
npm run test:security:jwt      # Test only JWT security
npm run test:security:ws       # Test only WebSocket security

# Dependency security
npm audit                      # Check for vulnerable dependencies
npm audit fix                  # Automatically fix vulnerabilities
npm audit --audit-level=high   # Only show high+ severity

# Code scanning
npm run lint:security          # Run security-focused linting
npm run scan:secrets           # Scan for hardcoded secrets
```

### 8.3 Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Penetration Testing Plan | Detailed test plan | `docs/security/PENETRATION_TESTING_PLAN.md` |
| Manual Test Checklist | Manual testing guide | `docs/security/MANUAL_PENTEST_CHECKLIST.md` |
| Test Report Template | Report format | `docs/security/PENETRATION_TEST_REPORT.md` |
| Security Fixes Week 1 | Recent fixes | `docs/security/SECURITY_FIXES_WEEK1.md` |
| Incident Response | Incident handling | `docs/security/INCIDENT_RESPONSE_PLAYBOOK.md` |
| Security Metrics | Dashboard spec | `docs/security/SECURITY_METRICS_DASHBOARD.md` |

### 8.4 External Resources

**OWASP Resources:**
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

**Security Testing:**
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [HackerOne Security Testing](https://www.hackerone.com/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

**Compliance:**
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [GDPR Security](https://gdpr.eu/security/)
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security.html)

---

## 9. Best Practices

### 9.1 Security Testing Principles

1. **Test Early, Test Often**
   - Integrate security tests in development workflow
   - Don't wait for QA to find security issues

2. **Automate Everything Possible**
   - Use automated tests for repetitive checks
   - Reserve manual testing for complex scenarios

3. **Document Everything**
   - Record all test results
   - Maintain audit trail
   - Share findings with team

4. **Fail Fast**
   - Block deployments on security test failures
   - Fix critical issues immediately

5. **Continuous Improvement**
   - Update tests based on new threats
   - Learn from incidents
   - Share knowledge

### 9.2 Common Pitfalls to Avoid

❌ **Don't:**
- Skip security tests to meet deadlines
- Test only in production
- Ignore test failures
- Use weak test credentials
- Share test results publicly
- Test production systems without permission

✅ **Do:**
- Run tests in isolated environment
- Use strong test credentials
- Document all findings
- Follow responsible disclosure
- Get permission before testing
- Keep security reports confidential

### 9.3 Security Testing Checklist

**Before Testing:**
- [ ] Environment is isolated
- [ ] Test data is prepared
- [ ] Backups are current
- [ ] Team is notified
- [ ] Tools are configured

**During Testing:**
- [ ] Document all actions
- [ ] Take screenshots
- [ ] Save logs
- [ ] Note timestamps
- [ ] Record findings

**After Testing:**
- [ ] Generate report
- [ ] Create remediation tickets
- [ ] Notify stakeholders
- [ ] Update documentation
- [ ] Schedule retesting

---

## 10. Troubleshooting

### 10.1 Common Issues

**Issue: Tests fail with "API not available"**
```bash
# Solution: Start API
npm run docker:dev
npm run dev:api

# Verify
curl http://localhost:3001/api/health
```

**Issue: WebSocket tests timeout**
```bash
# Solution: Check WebSocket is accessible
wscat -c ws://localhost:3001/realtime

# If fails, check API logs
tail -f apps/api/logs/app.log
```

**Issue: Rate limiting tests fail**
```bash
# Solution: Wait for rate limit window to reset
# Document sharing: 1 hour
# WebSocket events: 1 minute

# Or restart API to reset counters
```

**Issue: Authentication tests fail**
```bash
# Solution: Verify test user exists
# If using seeded data:
npm run seed:dev

# Or create test user manually
```

### 10.2 Getting Help

**Internal Resources:**
- Security Team Slack: #security-team
- Development Team: #dev-team
- Documentation: `/docs/security/`

**External Resources:**
- GitHub Issues: Create issue with `security` label
- Stack Overflow: Tag with `simplepro-security`

---

## 11. Appendix

### 11.1 Quick Reference Commands

```bash
# Start environment
npm run docker:dev
npm run dev:api

# Run tests
node scripts/security-pentest.js
node scripts/security-pentest.js --verbose
node scripts/security-pentest.js --category=jwt

# Check results
cat security-pentest-results.json
cat security-pentest-results.json | jq '.summary'

# Manual testing
curl http://localhost:3001/api/health
wscat -c ws://localhost:3001/realtime

# Logs
tail -f apps/api/logs/app.log
tail -f apps/api/logs/error.log
```

### 11.2 Environment Variables

```bash
# Required for testing
export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export JWT_REFRESH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export MONGODB_URI="mongodb://admin:password123@localhost:27017/simplepro?authSource=admin"
```

### 11.3 Test Data Generation

```bash
# Generate test JWT token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' \
  | jq -r '.accessToken')

# Use token
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Next Review:** 2025-11-02
**Owner:** Security Team
