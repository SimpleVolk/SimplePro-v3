# Test Execution Quick Reference Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Load Tests](#load-tests)
- [Coverage Reports](#coverage-reports)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

```bash
# Node.js and npm
node --version  # Should be >= 20.0.0
npm --version   # Should be >= 10.0.0

# Docker (for MongoDB, Redis, MinIO)
docker --version

# k6 (for load testing)
k6 version
```

### Install k6 (Load Testing Tool)

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

### Install Playwright (Web E2E Testing)

```bash
npx playwright install
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Infrastructure

```bash
# Start MongoDB, Redis, MinIO
npm run docker:dev
```

### 3. Run All Tests

```bash
# Run all unit tests (fast)
npm test

# Run all tests with coverage
npm run test:coverage
```

---

## Unit Tests

### Run All Unit Tests

```bash
npm test
```

### Run Specific Project

```bash
# Pricing engine (38 tests, ~5 seconds)
npm run test:pricing

# API unit tests
npm run test:api:unit

# Web component tests
npm run test:web
```

### Watch Mode (for TDD)

```bash
npm run test:watch
```

### With Coverage

```bash
# All projects
npm run test:coverage

# Specific project
npm run test:coverage:api
npm run test:coverage:web
npm run test:coverage:pricing
```

**Coverage Output:**
```
File                 | % Stmts | % Branch | % Funcs | % Lines |
---------------------|---------|----------|---------|---------|
All files            |   82.45 |    75.32 |   80.12 |   83.67 |
```

---

## Integration Tests

### Prerequisites

```bash
# Ensure MongoDB is running
npm run docker:dev

# Verify connection
docker ps | grep mongo
```

### Run Integration Tests

```bash
# All integration tests
npm run test:api:integration
```

**Test Files:**
- `apps/api/test/integration/offline-sync.integration-spec.ts` - Offline mode and background sync
- `apps/api/test/integration/websocket-realtime.integration-spec.ts` - Real-time messaging and notifications
- `apps/api/test/integration/pricing-engine.integration-spec.ts` - Deterministic pricing calculations

**Expected Output:**
```
PASS apps/api/test/integration/offline-sync.integration-spec.ts (15.234 s)
  Offline Mobile App Sync (Integration)
    Offline Queue and Background Sync
      ✓ should fetch job schedule while online (124 ms)
      ✓ should queue check-in action while offline (5 ms)
      ✓ should queue photo uploads while offline (3 ms)
      ✓ should sync all queued actions when network reconnects (456 ms)
```

---

## E2E Tests

### API E2E Tests

**Complete Job Lifecycle Test:**
```bash
npm run test:e2e:api
```

**Test Coverage:**
- ✅ Customer creation
- ✅ Opportunity with inventory
- ✅ Estimate calculation (deterministic)
- ✅ Job creation and crew assignment
- ✅ Multi-channel notifications
- ✅ WebSocket real-time updates
- ✅ GPS check-in verification
- ✅ Photo/signature capture
- ✅ Job completion and payroll

**Expected Runtime:** ~60 seconds

### Web E2E Tests (Playwright)

**Prerequisites:**
```bash
# Install Playwright browsers (one-time)
npx playwright install

# Start API and Web servers
npm run dev:api  # Terminal 1
npm run dev:web  # Terminal 2
```

**Run Tests:**
```bash
# Headless mode
npm run test:e2e:web

# Interactive UI mode (debugging)
npm run test:e2e:web:ui

# Specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**Test Files:**
- `apps/web-e2e/src/opportunity-workflow.spec.ts` - Complete opportunity → job workflow
- `apps/web-e2e/src/customer-management.spec.ts` - CRUD operations
- `apps/web-e2e/src/job-scheduling.spec.ts` - Calendar and dispatch

**View Test Report:**
```bash
npx playwright show-report
```

---

## Load Tests

### Prerequisites

```bash
# 1. Start infrastructure
npm run docker:dev

# 2. Start API server
npm run dev:api

# 3. Get authentication token
JWT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

# Export token for tests
export JWT_TOKEN
```

### API Load Tests

```bash
# Run API endpoint load test
npm run test:load:api

# Or with k6 directly
k6 run apps/api/test/load/api-endpoints.test.js \
  --env API_URL=http://localhost:3001 \
  --env JWT_TOKEN=$JWT_TOKEN
```

**Load Profile:**
- Ramp up: 50 → 100 → 200 users over 9 minutes
- Hold: 5 minutes at peak
- Ramp down: 2 minutes

**Performance Targets:**
- P95 latency: < 500ms
- Error rate: < 1%
- Throughput: > 100 req/sec

**Sample Output:**
```
     ✓ customer created successfully
     ✓ estimate calculated successfully
     ✓ job created successfully

     checks.........................: 98.5%  ✓ 2955      ✗ 45
     customer_creations.............: 985    65.67/s
     estimate_calculations..........: 1023   68.20/s
     http_req_duration..............: avg=245ms  p(95)=478ms
     http_req_failed................: 0.98%  ✓ 29        ✗ 2971
```

### WebSocket Load Tests

```bash
# Run WebSocket load test
npm run test:load:websocket

# Or with k6 directly
k6 run apps/api/test/load/websocket-load.test.js \
  --env API_URL=http://localhost:3001 \
  --env JWT_TOKEN=$JWT_TOKEN
```

**Load Profile:**
- Ramp up: 100 → 1000 → 5000 connections
- Hold: 2 minutes at 5000 connections
- Ramp down: 2 minutes

**Performance Targets:**
- Connection time P95: < 2000ms
- Message delivery: < 100ms
- No connection failures

---

## Coverage Reports

### Generate Coverage

```bash
# All projects with coverage
npm run test:coverage
```

### View HTML Reports

```bash
# Open in browser (macOS)
open coverage/apps/api/index.html
open coverage/apps/web/index.html
open coverage/packages/pricing-engine/index.html

# Or navigate to:
# - coverage/apps/api/index.html
# - coverage/apps/web/index.html
# - coverage/packages/pricing-engine/index.html
```

### CI Coverage

```bash
# Run tests in CI mode (non-interactive)
npm run test:ci
```

**Coverage Thresholds:**
- **API:** 80% lines, 75% branches
- **Web:** 75% lines, 70% branches
- **Pricing Engine:** 80% lines, 80% branches

---

## Troubleshooting

### Issue: MongoDB Connection Failed

**Symptoms:**
```
MongoServerError: Authentication failed
```

**Solution:**
```bash
# Stop and restart MongoDB
npm run docker:dev:down
npm run docker:dev

# Verify MongoDB is running
docker ps | grep mongo

# Check logs
npm run docker:dev:logs
```

### Issue: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution (Windows):**
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Solution (macOS/Linux):**
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9
```

### Issue: Playwright Browser Not Installed

**Symptoms:**
```
browserType.launch: Executable doesn't exist
```

**Solution:**
```bash
npx playwright install
```

### Issue: k6 Not Found

**Symptoms:**
```
k6: command not found
```

**Solution:**
```bash
# macOS
brew install k6

# Ubuntu/Debian (see Prerequisites section)

# Windows
choco install k6
```

### Issue: Test Timeout

**Symptoms:**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution:**
```bash
# Increase timeout in test file
test('my test', async () => {
  // ...
}, 30000); // 30 second timeout

# Or increase Jest timeout globally in jest.config.ts
testTimeout: 30000
```

### Issue: WebSocket Connection Failed in Tests

**Symptoms:**
```
WebSocket connection to 'ws://localhost:3001' failed
```

**Solution:**
```bash
# Ensure API server is running
npm run dev:api

# Verify WebSocket endpoint
curl http://localhost:3001/api/health

# Check firewall settings (allow port 3001)
```

### Issue: Load Test JWT Token Expired

**Symptoms:**
```
http_req_failed: 100% (401 Unauthorized)
```

**Solution:**
```bash
# Get fresh token before running load test
JWT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

# Export and verify
export JWT_TOKEN
echo $JWT_TOKEN
```

---

## Test File Locations

### Unit Tests
```
apps/api/src/**/*.spec.ts
apps/web/src/**/*.test.tsx
packages/pricing-engine/src/estimator.test.ts
```

### Integration Tests
```
apps/api/test/integration/
├── offline-sync.integration-spec.ts
├── websocket-realtime.integration-spec.ts
└── pricing-engine.integration-spec.ts
```

### E2E Tests
```
apps/api/test/e2e/
└── complete-job-lifecycle.e2e-spec.ts

apps/web-e2e/src/
├── opportunity-workflow.spec.ts
├── customer-management.spec.ts
└── job-scheduling.spec.ts
```

### Load Tests
```
apps/api/test/load/
├── api-endpoints.test.js
└── websocket-load.test.js
```

### Mock Services
```
apps/api/test/mocks/
├── email.mock.ts
├── sms.mock.ts
├── push-notification.mock.ts
└── minio.mock.ts
```

---

## CI/CD Test Execution

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests
- Nightly schedule (2 AM UTC)

**Workflow:** `.github/workflows/comprehensive-tests.yml`

**Jobs:**
1. Unit Tests (parallel: pricing-engine, api, web)
2. Integration Tests (with MongoDB, Redis)
3. E2E API Tests
4. Web E2E Tests (Playwright)
5. Load Tests (nightly or `[load-test]` in commit message)
6. Coverage Report (merged from all jobs)

### Trigger Load Tests Manually

```bash
# Include [load-test] in commit message
git commit -m "feat: add feature [load-test]"
git push
```

---

## Performance Benchmarks

### Expected Test Execution Times

| Test Suite | Duration | Parallel? |
|------------|----------|-----------|
| Pricing Engine Unit | ~5 sec | Yes |
| API Unit Tests | ~15 sec | Yes |
| Web Component Tests | ~10 sec | Yes |
| Integration Tests | ~30 sec | Sequential |
| E2E API Tests | ~60 sec | Sequential |
| Web E2E Tests | ~120 sec | Parallel |
| Load Tests (API) | ~15 min | N/A |
| Load Tests (WebSocket) | ~15 min | N/A |

### Total CI Pipeline Time

- **Fast Path (Unit + Integration):** ~2 minutes
- **Full Suite (excluding load tests):** ~5 minutes
- **Complete (with load tests):** ~35 minutes

---

## Best Practices

### 1. Test Locally Before Pushing

```bash
# Always run tests before committing
npm test
npm run test:api:integration
```

### 2. Use Watch Mode for Development

```bash
# Run tests automatically on file changes
npm run test:watch
```

### 3. Check Coverage Regularly

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### 4. Clean Test Data

Tests automatically clean up, but if needed:
```bash
# Clear test database
npm run docker:dev:down
npm run docker:dev
```

### 5. Debug Failing Tests

```bash
# Run single test with verbose output
npm test -- --testNamePattern="should create customer" --verbose

# Playwright debugging
npx playwright test --debug
```

---

**Last Updated:** October 2, 2025
**Maintained By:** Test Automation Team
