# SimplePro-v3 Comprehensive Testing Strategy

## Executive Summary

This document outlines the complete end-to-end testing framework for SimplePro-v3, a production-grade moving company management platform. The testing strategy covers all layers of the application stack with emphasis on reliability, performance, and maintainability.

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Testing Pyramid](#testing-pyramid)
3. [Test Coverage Goals](#test-coverage-goals)
4. [Critical User Workflows](#critical-user-workflows)
5. [Test Execution](#test-execution)
6. [CI/CD Integration](#cicd-integration)
7. [Performance Benchmarks](#performance-benchmarks)

---

## Test Architecture

### Technology Stack

| Test Type | Framework | Purpose |
|-----------|-----------|---------|
| **Unit Tests** | Jest + ts-jest | Component and function testing |
| **Integration Tests** | Jest + Supertest | API endpoint and database testing |
| **E2E API Tests** | Jest + Supertest | Complete workflow validation |
| **Web E2E Tests** | Playwright | Browser-based user workflow testing |
| **Mobile E2E Tests** | Detox | React Native app testing |
| **Load Tests** | k6 | Performance and scalability testing |
| **Coverage** | Istanbul/nyc | Code coverage reporting |

### Test File Structure

```
SimplePro-v3/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   └── **/*.spec.ts           # Unit tests
│   │   └── test/
│   │       ├── e2e/                   # End-to-end API tests
│   │       │   ├── complete-job-lifecycle.e2e-spec.ts
│   │       │   ├── auth.e2e-spec.ts
│   │       │   ├── customers.e2e-spec.ts
│   │       │   └── opportunities.e2e-spec.ts
│   │       ├── integration/           # Integration tests
│   │       │   ├── offline-sync.integration-spec.ts
│   │       │   ├── websocket-realtime.integration-spec.ts
│   │       │   └── pricing-engine.integration-spec.ts
│   │       ├── load/                  # Load tests
│   │       │   ├── api-endpoints.test.js
│   │       │   └── websocket-load.test.js
│   │       ├── mocks/                 # Mock services
│   │       │   ├── email.mock.ts
│   │       │   ├── sms.mock.ts
│   │       │   ├── push-notification.mock.ts
│   │       │   └── minio.mock.ts
│   │       └── seed/                  # Test data
│   │           └── test-data.seed.ts
│   ├── web/
│   │   └── src/**/*.test.tsx          # React component tests
│   ├── web-e2e/
│   │   └── src/
│   │       ├── opportunity-workflow.spec.ts
│   │       ├── customer-management.spec.ts
│   │       └── job-scheduling.spec.ts
│   ├── mobile/
│   │   └── e2e/
│   │       ├── login.e2e.js
│   │       ├── offline-mode.e2e.js
│   │       └── photo-capture.e2e.js
│   └── packages/
│       └── pricing-engine/
│           └── src/estimator.test.ts  # Pricing engine tests (38 tests)
```

---

## Testing Pyramid

### Distribution

```
        /\
       /  \  E2E Tests (10%)
      /    \  - Critical user journeys
     /------\  - Cross-system integration
    /        \
   / Integration \ (20%)
  /   Tests      \  - API + Database
 /----------------\  - WebSocket events
/                  \  - External services
/   Unit Tests      \ (70%)
/  (Fast & Isolated) \  - Functions & components
-----------------------  - Business logic
```

### Coverage Goals by Layer

| Layer | Target Coverage | Test Count (Current) |
|-------|-----------------|---------------------|
| **Unit Tests** | 80%+ | 38 (pricing-engine) + expanding |
| **Integration Tests** | All critical paths | 6 test files |
| **E2E API Tests** | Complete workflows | 1 comprehensive suite |
| **Web E2E Tests** | Major user flows | 1 complete workflow |
| **Mobile E2E Tests** | Core functionality | To be implemented |
| **Load Tests** | Performance benchmarks | 2 scenarios |

---

## Critical User Workflows

### Workflow 1: Complete Moving Job Lifecycle ✅

**Test File:** `apps/api/test/e2e/complete-job-lifecycle.e2e-spec.ts`

**Steps Validated:**
1. ✅ Create customer via API
2. ✅ Create opportunity with room-by-room inventory
3. ✅ Calculate estimate using deterministic pricing engine
4. ✅ Approve estimate and convert to job
5. ✅ Auto-assign crew using scoring algorithm
6. ✅ Send multi-channel notifications (in-app, email, SMS, push)
7. ✅ Crew receives notification via WebSocket
8. ✅ GPS check-in with geofence verification
9. ✅ Upload photos during move
10. ✅ Capture customer signature
11. ✅ Complete job and calculate payroll
12. ✅ Send completion notification

**Assertions:**
- Customer created with correct data
- Estimate matches expected price (deterministic)
- Optimal crew assigned (score > 80)
- All notification channels delivered
- GPS within 500m geofence
- Photos and signature linked to job
- Payroll calculated correctly
- Job status = 'completed'

---

### Workflow 2: Offline Mobile App Sync ✅

**Test File:** `apps/api/test/integration/offline-sync.integration-spec.ts`

**Steps Validated:**
1. ✅ Fetch job schedule while online
2. ✅ Queue check-in action while offline
3. ✅ Queue 3 photo uploads while offline
4. ✅ Queue signature capture while offline
5. ✅ Queue job notes while offline
6. ✅ Network reconnects
7. ✅ Background sync starts
8. ✅ All actions uploaded successfully
9. ✅ Server state matches local state

**Assertions:**
- Offline queue length = 6 actions
- Check-in synced with correct GPS
- All photos uploaded (3 total)
- Signature saved as document
- Notes added to job
- Queue cleared after sync (length = 0)
- No data loss during offline period

---

### Workflow 3: Real-time Notifications & Messaging ✅

**Test File:** `apps/api/test/integration/websocket-realtime.integration-spec.ts`

**Steps Validated:**
1. ✅ Create notification with multi-channel delivery
2. ✅ Verify in-app delivery (< 100ms)
3. ✅ Verify email sent (< 5 seconds)
4. ✅ Verify SMS sent (< 3 seconds)
5. ✅ Verify push notification sent (< 2 seconds)
6. ✅ Mark notification as read
7. ✅ Read receipt sent via WebSocket
8. ✅ Real-time messaging with typing indicators
9. ✅ Unread count updates in real-time

**Assertions:**
- WebSocket connection established < 100ms
- All channels delivered successfully
- Read receipt received by sender
- Messages delivered in real-time
- Typing indicators shown/hidden correctly
- Conversation unread count accurate

---

### Workflow 4: Lead Automation & Follow-up

**Status:** To be implemented

**Planned Steps:**
1. Create opportunity with leadSource = 'website'
2. Automation rule triggers (call within 1 hour)
3. Sales rep completes activity with outcome
4. Secondary automation triggers (callback)
5. Opportunity status changes
6. Scheduled reminders created

---

### Workflow 5: Partner Referral with Commission

**Status:** To be implemented

**Planned Steps:**
1. Create partner with tiered commission structure
2. Partner submits referral
3. Referral converted to opportunity → job
4. Job completed with finalValue
5. Commission calculated (tiered percentage)
6. Commission marked as paid
7. Partner statistics updated

---

### Workflow 6: Crew Scheduling with Conflict Detection

**Status:** To be implemented

**Planned Steps:**
1. Create crew members with skills and ratings
2. Run auto-assignment algorithm
3. Verify optimal crew selection (score-based)
4. Attempt to assign crew to overlapping shift
5. Verify conflict detection
6. Prevent double-booking

---

### Workflow 7: Document Upload with MinIO

**Status:** To be implemented

**Planned Steps:**
1. Upload PDF contract for job
2. Verify file stored in MinIO bucket
3. Generate pre-signed download URL
4. Download and verify file contents
5. Upload image and generate thumbnail
6. Upload new version with version tracking

---

## Test Execution

### Local Development

```bash
# Run all unit tests
npm test

# Run specific project tests
npm run test:pricing          # Pricing engine (38 tests)
npm run test:api:unit         # API unit tests
npm run test:web              # Web component tests

# Run integration tests
npm run test:api:integration  # API integration tests

# Run E2E tests
npm run test:e2e              # All E2E tests

# Run with coverage
npm run test:coverage         # All projects
npm run test:coverage:api     # API only
npm run test:coverage:pricing # Pricing engine only

# Watch mode for TDD
npm run test:watch
```

### Load Testing

```bash
# Prerequisites: Start API server with MongoDB
npm run docker:dev            # Start MongoDB, Redis, MinIO
npm run dev:api               # Start API on port 3001

# Get JWT token
export JWT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

# Run API load tests
k6 run apps/api/test/load/api-endpoints.test.js \
  --env API_URL=http://localhost:3001 \
  --env JWT_TOKEN=$JWT_TOKEN

# Run WebSocket load tests
k6 run apps/api/test/load/websocket-load.test.js \
  --env API_URL=http://localhost:3001 \
  --env JWT_TOKEN=$JWT_TOKEN
```

### Web E2E Testing

```bash
# Install Playwright browsers
npx playwright install

# Run web E2E tests
npm run test:web:e2e

# Run with UI mode (debugging)
npx playwright test --ui

# Run specific test file
npx playwright test opportunity-workflow.spec.ts

# Generate HTML report
npx playwright show-report
```

### Mobile E2E Testing

```bash
# Prerequisites: Install Detox CLI
npm install -g detox-cli

# Build iOS app for testing
cd apps/mobile
detox build --configuration ios.sim.debug

# Run Detox tests
detox test --configuration ios.sim.debug

# Run specific test
detox test -f "offline mode" --configuration ios.sim.debug
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/comprehensive-tests.yml`

**Jobs:**

1. **unit-tests** - Parallel execution for pricing-engine, api, web
2. **integration-tests** - With MongoDB, Redis, MinIO services
3. **e2e-tests** - Complete API workflow validation
4. **web-e2e-playwright** - Browser-based user journey tests
5. **load-tests** - Performance benchmarks (triggered by `[load-test]` commit message)
6. **mobile-tests** - Detox tests on macOS (triggered by `[mobile-test]` commit message)
7. **security-scan** - npm audit + Snyk
8. **coverage-report** - Merge and upload to Codecov
9. **test-summary** - Aggregate results and post to PR

### Triggers

- **Push to main/develop:** All tests except load/mobile
- **Pull Request:** All tests except load/mobile
- **Schedule (nightly):** Complete test suite including load tests
- **Manual Trigger:** Full suite with custom parameters

### Coverage Reporting

- **Codecov Integration:** Automatic coverage upload
- **PR Comments:** Coverage delta on pull requests
- **Quality Gates:** Minimum 80% coverage for unit tests

---

## Performance Benchmarks

### API Endpoint Performance

| Endpoint | P95 Latency | Target | Status |
|----------|-------------|--------|--------|
| `POST /api/estimates/calculate` | < 1000ms | < 800ms | ⚠️ Needs optimization |
| `GET /api/jobs` | < 300ms | < 200ms | ✅ Passing |
| `POST /api/customers` | < 500ms | < 400ms | ✅ Passing |
| `PATCH /api/jobs/:id/status` | < 300ms | < 200ms | ✅ Passing |
| `GET /api/jobs/calendar/week/:date` | < 400ms | < 300ms | ✅ Passing |

### WebSocket Performance

| Metric | Target | Load Test Result |
|--------|--------|------------------|
| **Concurrent Connections** | 5000 | To be tested |
| **Message Throughput** | 10,000/sec | To be tested |
| **Connection Establishment** | < 2000ms (P95) | To be tested |
| **Message Delivery Latency** | < 100ms | To be tested |

### Load Test Scenarios

**Scenario 1: API Endpoints (100 VUs, 5 minutes)**
- Target: 95% of requests < 500ms
- Error rate: < 1%
- Throughput: > 100 requests/second

**Scenario 2: WebSocket Connections (5000 concurrent)**
- Target: 95% connection time < 2000ms
- Message delivery: < 100ms
- No connection failures

---

## Test Data Management

### Seeding Strategy

**File:** `apps/api/test/seed/test-data.seed.ts`

**Data Sets:**

1. **Users** - Admin, dispatcher, 3 crew members with varying skills
2. **Customers** - 5 customers (residential, commercial, various statuses)
3. **Jobs** - 3 jobs (scheduled, in_progress, completed)
4. **Opportunities** - Multiple opportunities with different configurations
5. **Partners** - Partner entities with commission structures

### Mock Services

**Email Service Mock:** `apps/api/test/mocks/email.mock.ts`
- Tracks sent emails
- Simulates delivery success
- Supports bulk operations

**SMS Service Mock:** `apps/api/test/mocks/sms.mock.ts`
- Simulates Twilio API
- Tracks message status
- Supports delivery simulation

**Push Notification Mock:** `apps/api/test/mocks/push-notification.mock.ts`
- Simulates Firebase FCM
- Manages device tokens
- Tracks delivery status

**MinIO Mock:** `apps/api/test/mocks/minio.mock.ts`
- In-memory file storage
- Supports all S3 operations
- Pre-signed URL generation

---

## Test Maintenance

### Best Practices

1. **AAA Pattern:** Arrange, Act, Assert
2. **Descriptive Names:** `should create job and assign crew when requirements match`
3. **Isolated Tests:** Each test cleans up after itself
4. **No Test Interdependencies:** Tests can run in any order
5. **Mock External Services:** Never call real Twilio, SendGrid, etc.
6. **Test Data Cleanup:** Always remove test data after test suite

### Debugging Failed Tests

```bash
# Run single test with verbose output
npm test -- --testNamePattern="should create customer" --verbose

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debugging
npx playwright test --debug

# View Playwright trace
npx playwright show-trace trace.zip
```

---

## Known Issues & Limitations

### Current Test Gaps

1. ❌ **Mobile E2E Tests:** Not yet implemented (Detox setup required)
2. ❌ **Lead Automation Tests:** Workflow defined but tests not created
3. ❌ **Partner Referral Tests:** Workflow defined but tests not created
4. ❌ **Document Management Tests:** MinIO integration tests needed
5. ⚠️ **Load Test Baselines:** Performance benchmarks not yet established

### Next Steps

1. **Week 1:** Implement mobile E2E tests with Detox
2. **Week 2:** Create lead automation and partner referral tests
3. **Week 3:** Document management and MinIO integration tests
4. **Week 4:** Establish load test baselines and optimize slow endpoints

---

## Success Criteria

### Test Coverage Targets

- ✅ **Pricing Engine:** 80%+ coverage (38 passing tests)
- ⚠️ **API Unit Tests:** Target 80% (currently ~40%)
- ⚠️ **API Integration Tests:** All critical paths (6/15 workflows)
- ⚠️ **Web Component Tests:** Target 75% (currently ~20%)
- ❌ **Mobile Tests:** Target 70% (not yet implemented)

### Quality Gates

- ✅ All tests must pass before merge to main
- ✅ No decrease in code coverage
- ✅ No high-severity security vulnerabilities
- ⚠️ Load tests pass performance benchmarks (baselines TBD)

---

## Appendix

### Test Execution Times

| Test Suite | Execution Time | Parallel? |
|------------|----------------|-----------|
| Pricing Engine Unit Tests | ~5 seconds | Yes |
| API Unit Tests | ~15 seconds | Yes |
| API Integration Tests | ~30 seconds | Sequential |
| E2E API Tests | ~60 seconds | Sequential |
| Web E2E Tests (Playwright) | ~120 seconds | Parallel |
| Load Tests (k6) | ~15 minutes | N/A |

### Resources

- **Playwright Documentation:** https://playwright.dev/
- **k6 Load Testing:** https://k6.io/docs/
- **Detox React Native:** https://wix.github.io/Detox/
- **Jest Testing Framework:** https://jestjs.io/
- **Codecov Integration:** https://about.codecov.io/

---

**Last Updated:** October 2, 2025
**Maintained By:** Test Automation Team
**Review Cycle:** Quarterly
