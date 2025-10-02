# SimplePro-v3 Testing Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
npm install              # Install dependencies
npm run docker:dev       # Start MongoDB, Redis, MinIO
npm test                 # Run all unit tests (~30 sec)
```

---

## 📋 Common Test Commands

### Unit Tests (Fast - Use Daily)
```bash
npm test                          # All unit tests
npm run test:pricing              # Pricing engine (38 tests)
npm run test:api:unit             # API unit tests
npm run test:web                  # Web component tests
npm run test:watch                # Watch mode (TDD)
```

### Integration Tests (Use Before PR)
```bash
npm run test:api:integration      # All integration tests (~30 sec)
```

### E2E Tests (Use Before Merge)
```bash
npm run test:e2e:api              # Complete job lifecycle (~60 sec)
npm run test:e2e:web              # Web workflow tests (~120 sec)
npm run test:e2e:web:ui           # Playwright UI mode (debugging)
```

### Load Tests (Use Weekly/Before Release)
```bash
# Prerequisites: Start API server
npm run dev:api

# Get auth token
export JWT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

# Run tests
npm run test:load:api             # API endpoints (~15 min)
npm run test:load:websocket       # WebSocket (~15 min)
```

### Coverage Reports
```bash
npm run test:coverage             # All projects with coverage
npm run test:coverage:api         # API only
open coverage/apps/api/index.html # View HTML report
```

---

## 🎯 What Each Test Type Validates

### Unit Tests
- ✅ Function logic and business rules
- ✅ Component rendering
- ✅ Input validation
- ⚡ Fast (< 1 second each)

### Integration Tests
- ✅ API + Database interactions
- ✅ WebSocket real-time features
- ✅ Offline sync behavior
- ⚡ Medium speed (~30 seconds total)

### E2E Tests
- ✅ Complete user workflows
- ✅ Cross-system integration
- ✅ End-to-end data flow
- ⚡ Slower (~60-120 seconds)

### Load Tests
- ✅ Performance under load
- ✅ Scalability limits
- ✅ Error rates
- ⚡ Very slow (~15 minutes)

---

## 🔥 Critical Workflows Tested

### Workflow 1: Complete Job Lifecycle ✅
**File:** `apps/api/test/e2e/complete-job-lifecycle.e2e-spec.ts`

Customer → Opportunity → Estimate → Job → Crew Assignment → Notifications → Check-in → Photos → Signature → Completion → Payroll

**Run:** `npm run test:e2e:api`

### Workflow 2: Offline Sync ✅
**File:** `apps/api/test/integration/offline-sync.integration-spec.ts`

Online → Offline → Queue Actions → Reconnect → Background Sync → Verify

**Run:** `npm run test:api:integration`

### Workflow 3: Real-time Messaging ✅
**File:** `apps/api/test/integration/websocket-realtime.integration-spec.ts`

WebSocket → Subscribe → Messages → Notifications → Typing → Read Receipts

**Run:** `npm run test:api:integration`

---

## 🐛 Troubleshooting (30-Second Fixes)

### MongoDB Connection Failed
```bash
npm run docker:dev:down && npm run docker:dev
```

### Port Already in Use (Windows)
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Port Already in Use (Mac/Linux)
```bash
lsof -ti:3001 | xargs kill -9
```

### Playwright Browsers Missing
```bash
npx playwright install
```

### Tests Timing Out
Add to test: `, 30000);` for 30-second timeout

---

## 📊 Coverage Thresholds

| Project | Target | Current Status |
|---------|--------|----------------|
| Pricing Engine | 80% | ✅ Passing (38 tests) |
| API | 80% | ⚠️ ~40% (expand tests) |
| Web | 75% | ⚠️ ~20% (expand tests) |

---

## 🤖 CI/CD Integration

### Automatic Test Runs
- ✅ Push to main/develop
- ✅ Pull requests
- ✅ Nightly at 2 AM UTC

### Manual Triggers
- Add `[load-test]` to commit message for load tests
- Add `[mobile-test]` to commit message for mobile tests

### View Results
GitHub Actions → Workflow → Comprehensive Test Suite

---

## 📁 Test File Locations

```
apps/api/test/
├── e2e/                          # E2E tests
│   └── complete-job-lifecycle.e2e-spec.ts
├── integration/                  # Integration tests
│   ├── offline-sync.integration-spec.ts
│   └── websocket-realtime.integration-spec.ts
├── load/                         # Load tests
│   ├── api-endpoints.test.js
│   └── websocket-load.test.js
├── mocks/                        # Mock services
│   ├── email.mock.ts
│   ├── sms.mock.ts
│   ├── push-notification.mock.ts
│   └── minio.mock.ts
└── seed/                         # Test data
    └── test-data.seed.ts

apps/web-e2e/src/
└── opportunity-workflow.spec.ts  # Web E2E tests
```

---

## 🎓 Best Practices

### Before Committing
```bash
npm test                          # Run unit tests
npm run test:api:integration      # Run integration tests
npm run lint                      # Fix linting issues
```

### Before Creating PR
```bash
npm run test:coverage             # Ensure coverage meets threshold
npm run test:e2e:api              # Validate E2E workflows
```

### Before Deploying
```bash
npm run test:ci                   # Run full CI test suite
npm run test:load:api             # Performance validation
```

---

## 📚 Documentation

- **TESTING_STRATEGY.md** - Complete testing architecture and strategy
- **TEST_EXECUTION_GUIDE.md** - Detailed execution guide with troubleshooting
- **E2E_TEST_SUITE_SUMMARY.md** - Implementation summary and roadmap

---

## 🎯 Performance Targets

### API Latency (P95)
- Estimate calculation: < 1000ms
- Job queries: < 200ms
- Customer operations: < 400ms
- Calendar queries: < 300ms

### WebSocket
- Connection time: < 2000ms
- Message delivery: < 100ms
- Concurrent connections: 5000+

### Error Rates
- HTTP request failures: < 1%
- WebSocket failures: < 1%
- Check success rate: > 95%

---

## 🔑 Test Data Credentials

**Admin Login:**
- Username: `admin`
- Password: `Admin123!`

**Test Users:**
- Dispatcher: `testdispatcher` / `Test123!`
- Crew Lead: `testcrewlead` / `Test123!`

---

## 💡 Tips

1. **Use watch mode** during development: `npm run test:watch`
2. **Debug Playwright tests** with UI mode: `npm run test:e2e:web:ui`
3. **Generate coverage** regularly to track progress
4. **Clean test data** by restarting Docker: `npm run docker:dev:down && npm run docker:dev`
5. **Run tests in parallel** for faster feedback (unit tests only)

---

**Need Help?** Check the detailed guides:
- `TESTING_STRATEGY.md` - Architecture and workflows
- `TEST_EXECUTION_GUIDE.md` - Step-by-step instructions
- `E2E_TEST_SUITE_SUMMARY.md` - Implementation details

**Last Updated:** October 2, 2025
