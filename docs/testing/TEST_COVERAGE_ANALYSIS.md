# SimplePro-v3 Testing Strategy & Coverage Analysis

**Date:** October 2025
**Analyst:** Test Automation Architect
**Project:** SimplePro-v3 Moving Company Management System

---

## Executive Summary

SimplePro-v3 currently has **38 passing unit tests** focused primarily on the pricing engine. While the pricing engine demonstrates excellent test coverage (45.66% statements, 36.13% branches), the overall system lacks comprehensive test coverage across API services and frontend components. This analysis identifies critical gaps and provides actionable recommendations for achieving production-ready test coverage.

### Current Test Distribution

| Layer                 | Tests        | Coverage | Status          |
| --------------------- | ------------ | -------- | --------------- |
| **Unit Tests**        | 38           | ~45%     | ⚠️ Partial      |
| **Integration Tests** | 9 test files | ~15%     | ⚠️ Minimal      |
| **E2E Tests**         | 1            | <5%      | ❌ Insufficient |
| **Component Tests**   | 4            | <10%     | ❌ Insufficient |

**Overall Assessment:** 🟡 **NEEDS IMPROVEMENT** - Critical production gaps identified

---

## 1. Current Test Coverage Analysis

### 1.1 Pricing Engine (Excellent Coverage)

**Location:** `packages/pricing-engine/src/estimator.test.ts`
**Test Count:** 38 passing tests
**Coverage:** 45.66% statements, 36.13% branches, 58.18% functions

#### ✅ Strengths

- Comprehensive input validation tests (5 tests)
- Deterministic calculation verification (3 tests)
- Base price calculations for all service types (4 tests)
- Pricing rule application (8 tests)
- Location handicap testing (5 tests)
- Price breakdown validation (3 tests)
- Edge case handling (4 tests)
- Rule priority and ordering (3 tests)
- Calculation metadata verification (3 tests)

#### Example Test Quality

```typescript
it('should maintain determinism across multiple executions', () => {
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(
      estimator.calculateEstimate(sampleInputs.weekendChallenge, 'test-user'),
    );
  }

  const firstPrice = results[0].calculations.finalPrice;
  const firstHash = results[0].metadata.hash;

  results.forEach((result) => {
    expect(result.calculations.finalPrice).toBe(firstPrice);
    expect(result.metadata.hash).toBe(firstHash);
  });
});
```

#### ⚠️ Coverage Gaps

- **Uncovered Lines:** 254-260, 268-272, 283-295, 317-318, 326-440, 475, 497, 501-520, 562, 572-578, 602-626, 661-686
- **Missing Scenarios:**
  - Storage service pricing
  - Multi-room inventory calculations
  - Seasonal peak period (summer) surcharges
  - Holiday pricing rules
  - Error recovery mechanisms
  - Performance benchmarking

---

### 1.2 API Services (Partial Coverage)

#### Authentication Service (Good Coverage)

**Location:** `apps/api/src/auth/auth.service.spec.ts`
**Test Count:** ~50 tests
**Coverage:** ~70% estimated

✅ **Well-Tested Areas:**

- User login flow with JWT token generation
- Token refresh mechanisms
- Session management and cleanup
- Password change workflows
- Role-based access control
- Permission validation
- User creation and updates
- Duplicate user prevention
- Security edge cases (malformed tokens, token reuse)

❌ **Missing Tests:**

- Rate limiting enforcement
- Concurrent session limits
- Password reset flow
- Email verification
- Account lockout after failed attempts
- Session expiration edge cases
- Multi-device session management

#### Integration Tests (Minimal Coverage)

**Location:** `apps/api/test/auth.integration.spec.ts`
**Test Count:** ~30 integration tests

✅ **Covered Scenarios:**

- Complete authentication flow
- User registration and management
- Profile updates
- Role-based endpoint access
- Concurrent login attempts
- Session cleanup
- Performance testing (10 concurrent requests)

❌ **Missing Integration Tests:**

- Customer management full workflow
- Job lifecycle from creation to completion
- Estimate calculation API integration
- Analytics data aggregation
- Real-time WebSocket events
- Database transaction rollbacks
- Cross-module data consistency

---

### 1.3 Other API Services (Incomplete)

| Service             | Test File                      | Status     | Priority |
| ------------------- | ------------------------------ | ---------- | -------- |
| **Customers**       | `customers.service.spec.ts`    | ⚠️ Partial | HIGH     |
| **Jobs**            | `jobs.service.spec.ts`         | ⚠️ Partial | HIGH     |
| **Analytics**       | `analytics.service.spec.ts`    | ⚠️ Partial | MEDIUM   |
| **Estimates**       | `estimates.controller.spec.ts` | ❌ Minimal | HIGH     |
| **Health**          | `health.service.spec.ts`       | ✅ Good    | LOW      |
| **Tariff Settings** | No tests                       | ❌ None    | HIGH     |
| **Pricing Rules**   | No tests                       | ❌ None    | HIGH     |
| **Audit Logs**      | No tests                       | ❌ None    | MEDIUM   |

---

### 1.4 Frontend Components (Critical Gap)

**Location:** `apps/web/__tests__/` and `apps/web/specs/`
**Test Count:** 4 test files
**Coverage:** <10%

#### ✅ Existing Tests

**1. NewOpportunity.test.tsx (Comprehensive)**

- 629 lines of thorough component testing
- Multi-step form workflow validation
- Customer information validation
- Move details form testing
- Inventory selection with move sizes
- Price summary integration
- Form persistence (localStorage auto-save)
- API error handling

**2. PricingEngineIntegration.test.ts**

- Cross-platform pricing engine validation
- 2BR apartment weekend move scenario
- Heavy move complex calculations
- Long distance pricing verification
- Edge cases and rounding

**3. Basic Tests**

- `index.spec.tsx` - Minimal page render test
- `MoveSizes.test.tsx` - Component exists
- `DistanceRates.test.tsx` - Component exists

#### ❌ **CRITICAL MISSING COMPONENT TESTS**

**No tests exist for:**

- Dashboard.tsx (main landing page)
- Sidebar.tsx (navigation)
- AppLayout.tsx (layout wrapper)
- CustomerManagement.tsx (CRUD operations)
- JobManagement.tsx (job lifecycle)
- CalendarDispatch.tsx (scheduling)
- AnalyticsDashboard.tsx (data visualization)
- Settings components (30+ pages)
- EstimateForm.tsx (estimate creation)
- EstimateResult.tsx (price display)
- Login.tsx (authentication UI)

**45 React components** with **0 test coverage** - This is a production blocker!

---

### 1.5 E2E Tests (Insufficient)

**Location:** `apps/web-e2e/src/example.spec.ts`
**Test Count:** 1 basic test
**Status:** ❌ Placeholder only

Current test:

```typescript
test('has title', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('h1').innerText()).toContain('Welcome');
});
```

This is not production-ready E2E testing.

---

## 2. Test Quality and Patterns Analysis

### 2.1 ✅ Good Patterns Observed

1. **AAA Pattern (Arrange-Act-Assert)**

```typescript
it('should create user successfully', async () => {
  // Arrange
  mockUserModel.findOne.mockResolvedValue(null);
  const mockNewUser = { ...mockUser, save: jest.fn() };

  // Act
  const result = await service.create(createUserDto, 'admin123');

  // Assert
  expect(result).toEqual(
    expect.objectContaining({
      username: 'newuser',
      email: 'newuser@example.com',
    }),
  );
});
```

2. **Comprehensive Test Factories**

```typescript
export const TestDataFactories = {
  createUserData: (overrides = {}) => ({ ...defaults, ...overrides }),
  createCustomerData: (overrides = {}) => ({ ...defaults, ...overrides }),
  createJobData: (customerId, overrides = {}) => ({
    ...defaults,
    ...overrides,
  }),
  createEstimateData: (overrides = {}) => ({ ...defaults, ...overrides }),
};
```

3. **Proper Mock Setup**

- bcryptjs mocking for password hashing
- JWT service mocking for token operations
- MongoDB in-memory database for integration tests
- Fetch API mocking for frontend tests

4. **Descriptive Test Names**

- "should apply weekend surcharge for weekend moves"
- "should reject duplicate email addresses"
- "should handle concurrent login attempts"

### 2.2 ⚠️ Areas for Improvement

1. **Test Organization**

- Some tests mix unit and integration concerns
- Inconsistent file naming (`.test.ts` vs `.spec.ts`)
- Missing test suites for critical modules

2. **Mock Strategies**

- Over-mocking in some unit tests (reduces confidence)
- Missing integration test coverage for real database operations
- No contract testing for API boundaries

3. **Test Data Management**

- Limited seed data for development/testing
- No fixture management system
- Hard-coded test values scattered across files

4. **Performance Testing**

- Only basic performance tests (10 concurrent requests)
- No load testing infrastructure
- No stress testing for pricing calculations

---

## 3. Integration Test Coverage

### 3.1 Existing Integration Tests

**Setup Infrastructure:** `apps/api/test/integration-setup.ts`

✅ **Excellent Integration Test Utilities:**

- MongoDB memory server setup
- Authentication helper functions
- Test data factories
- Response assertion utilities
- Database cleanup functions
- Authenticated request helpers

**Integration Test Files:**

1. `auth.integration.spec.ts` - ✅ Comprehensive (30+ tests)
2. `customers.integration.spec.ts` - ⚠️ Exists but incomplete
3. `jobs.integration.spec.ts` - ⚠️ Exists but incomplete
4. `analytics.integration.spec.ts` - ⚠️ Exists but incomplete
5. `estimates.integration.spec.ts` - ⚠️ Exists but incomplete
6. `simple-integration.spec.ts` - Basic smoke tests

### 3.2 ❌ Missing Integration Tests

**Critical Workflows Not Tested:**

1. Complete opportunity creation flow:
   - Create customer → Generate estimate → Create job → Assign crew → Complete job
2. Settings changes affecting pricing:
   - Update tariff settings → Calculate estimate → Verify price change
3. Real-time job updates:
   - WebSocket connection → Job status change → Client receives update
4. Multi-user scenarios:
   - Admin creates job → Dispatcher assigns crew → Crew updates status
5. Data consistency:
   - Customer deactivation → Associated jobs handling → Estimate history preservation

---

## 4. E2E Test Strategy

### 4.1 Current State: Minimal

**Playwright Configuration:** ✅ Configured
**Test Coverage:** ❌ <1%
**Critical User Journeys:** ❌ Untested

### 4.2 Missing Critical E2E Scenarios

1. **Complete Sales Flow**
   - Navigate to New Opportunity
   - Fill customer information
   - Enter move details
   - Select inventory/move size
   - Review estimate
   - Submit opportunity
   - Verify customer created in database
   - Verify estimate saved

2. **Job Management Flow**
   - Login as dispatcher
   - View calendar
   - Create new job
   - Assign crew members
   - Set job details
   - Crew logs in on mobile
   - Updates job status
   - Admin views completion

3. **Settings Management Flow**
   - Login as admin
   - Navigate to Tariff Settings
   - Update distance rates
   - Save changes
   - Create new estimate
   - Verify new rates applied

4. **Reporting Flow**
   - Navigate to Analytics
   - Select date range
   - Generate revenue report
   - Export to PDF
   - Verify data accuracy

---

## 5. Test Organization and Structure

### 5.1 Current Structure

```
SimplePro-v3/
├── packages/pricing-engine/
│   ├── src/
│   │   ├── estimator.test.ts          ✅ 38 tests
│   │   └── test-data/                 ✅ Sample data
│   └── jest.config.js                 ✅ Configured
├── apps/api/
│   ├── src/
│   │   ├── auth/auth.service.spec.ts              ✅ ~50 tests
│   │   ├── customers/customers.service.spec.ts    ⚠️ Partial
│   │   ├── jobs/jobs.service.spec.ts              ⚠️ Partial
│   │   ├── analytics/analytics.service.spec.ts    ⚠️ Partial
│   │   ├── health/health.service.spec.ts          ✅ Good
│   │   └── estimates/estimates.controller.spec.ts ❌ Minimal
│   ├── test/
│   │   ├── integration-setup.ts       ✅ Excellent utilities
│   │   ├── auth.integration.spec.ts   ✅ Comprehensive
│   │   ├── customers.integration.spec.ts  ⚠️ Incomplete
│   │   ├── jobs.integration.spec.ts       ⚠️ Incomplete
│   │   ├── analytics.integration.spec.ts  ⚠️ Incomplete
│   │   └── estimates.integration.spec.ts  ⚠️ Incomplete
│   └── jest.config.ts                 ✅ Configured
├── apps/web/
│   ├── __tests__/
│   │   ├── NewOpportunity.test.tsx           ✅ Comprehensive
│   │   ├── PricingEngineIntegration.test.ts  ✅ Good
│   │   ├── MoveSizes.test.tsx                ❌ Stub
│   │   └── DistanceRates.test.tsx            ❌ Stub
│   ├── specs/
│   │   └── index.spec.tsx             ❌ Minimal
│   └── jest.config.ts                 ⚠️ Setup issues
└── apps/web-e2e/
    ├── src/example.spec.ts            ❌ Placeholder
    └── playwright.config.ts           ✅ Configured
```

### 5.2 Recommended Structure

```
apps/api/
├── test/
│   ├── unit/                          # Pure unit tests
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── jobs/
│   │   └── pricing/
│   ├── integration/                   # Integration tests
│   │   ├── workflows/
│   │   ├── database/
│   │   └── api/
│   ├── e2e/                          # API E2E tests
│   ├── fixtures/                      # Test data
│   │   ├── users.json
│   │   ├── customers.json
│   │   └── jobs.json
│   └── helpers/                       # Test utilities
│       ├── setup.ts
│       ├── factories.ts
│       └── assertions.ts

apps/web/
├── __tests__/
│   ├── unit/                          # Component unit tests
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── integration/                   # Component integration
│   │   ├── forms/
│   │   ├── workflows/
│   │   └── data-fetching/
│   └── fixtures/                      # Mock data
└── test-utils/                        # Testing utilities
    ├── render-utils.tsx
    ├── mock-providers.tsx
    └── test-data.ts

apps/web-e2e/
├── tests/
│   ├── auth/                          # Authentication flows
│   ├── opportunities/                 # Opportunity creation
│   ├── jobs/                          # Job management
│   ├── settings/                      # Settings management
│   └── analytics/                     # Reporting flows
└── fixtures/                          # E2E test data
```

---

## 6. Mock Strategies and Test Data

### 6.1 ✅ Good Practices

**1. Service Mocking**

```typescript
const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  constructor: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(mockUser),
  })),
};
```

**2. Authentication Helpers**

```typescript
export async function createAuthenticatedTestUser(
  userData: Partial<any> = {},
): Promise<TestAuthData> {
  const testUserData = TestDataFactories.createUserData(userData);
  await createTestUser(testUserData);
  return loginTestUser(testUserData.email, testUserData.password);
}
```

**3. Response Assertions**

```typescript
export const ResponseAssertions = {
  assertSuccessResponse: (response: any, expectedData?: any) => {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  },
  // ... more assertion utilities
};
```

### 6.2 ❌ Missing Test Data Infrastructure

**Needed:**

1. **Seed Data System**
   - Realistic customer profiles
   - Sample job histories
   - Historical pricing data
   - User roles and permissions

2. **Fixture Management**
   - JSON fixtures for common scenarios
   - Builder pattern for complex objects
   - Snapshot testing for UI components

3. **Mock Service Layer**
   - Consistent API mocking
   - Simulated delays for async operations
   - Error scenario generators

---

## 7. CI/CD Test Automation

### 7.1 Current Configuration

**Jest Setup:**

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

**Current Reality:** ❌ Not meeting thresholds

### 7.2 ❌ Missing CI/CD Features

1. **Automated Test Runs**
   - No GitHub Actions workflow for tests
   - No pre-commit test hooks
   - No test coverage reporting
   - No failed test notifications

2. **Quality Gates**
   - No test-based deployment blocking
   - No coverage regression detection
   - No performance regression testing

3. **Test Reporting**
   - No test result dashboard
   - No coverage trend tracking
   - No flaky test detection

---

## 8. Missing Critical Test Cases

### 8.1 API Services

#### Pricing Rules Service (NO TESTS)

```typescript
// CRITICAL: Zero test coverage
describe('Pricing Rules Service', () => {
  it('should create new pricing rule');
  it('should update existing rule');
  it('should deactivate rule');
  it('should validate rule conditions');
  it('should check rule conflicts');
  it('should apply rules in priority order');
  it('should handle invalid rule JSON');
  it('should audit rule changes');
});
```

#### Tariff Settings Service (NO TESTS)

```typescript
// CRITICAL: Zero test coverage
describe('Tariff Settings Service', () => {
  it('should update distance rates');
  it('should update handicap multipliers');
  it('should update packing rates');
  it('should validate rate ranges');
  it('should seed default settings');
  it('should apply settings to estimates');
  it('should track settings history');
});
```

#### Audit Logs Service (NO TESTS)

```typescript
// IMPORTANT: Zero test coverage
describe('Audit Logs Service', () => {
  it('should log user actions');
  it('should log data changes');
  it('should track field-level changes');
  it('should query logs by date range');
  it('should filter logs by entity type');
  it('should export audit trail');
});
```

### 8.2 Frontend Components

#### Dashboard Component (NO TESTS)

```typescript
describe('Dashboard Component', () => {
  it('should display KPI cards');
  it('should fetch real-time metrics');
  it('should handle loading states');
  it('should display error messages');
  it('should navigate to sections');
  it('should filter by date range');
  it('should update on data refresh');
});
```

#### CustomerManagement Component (NO TESTS)

```typescript
describe('CustomerManagement Component', () => {
  it('should list customers with pagination');
  it('should filter by status');
  it('should search by name/email');
  it('should create new customer');
  it('should update customer details');
  it('should deactivate customer');
  it('should display customer history');
  it('should handle API errors gracefully');
});
```

#### CalendarDispatch Component (NO TESTS)

```typescript
describe('CalendarDispatch Component', () => {
  it('should render month view');
  it('should switch to week view');
  it('should display jobs on calendar');
  it('should create new job');
  it('should drag and drop job');
  it('should assign crew to job');
  it('should update job status');
  it('should filter jobs by status');
});
```

### 8.3 Integration Scenarios

#### Complete Workflow Tests (MISSING)

```typescript
describe('Complete Opportunity to Job Workflow', () => {
  it('should create opportunity from NewOpportunity form');
  it('should generate estimate with pricing engine');
  it('should convert opportunity to customer');
  it('should create job from estimate');
  it('should assign crew to job');
  it('should update job status');
  it('should record actual costs');
  it('should generate invoice');
  it('should track profitability');
});
```

---

## 9. Test Performance and Reliability

### 9.1 Current Performance

**Pricing Engine Tests:**

- ✅ Fast execution (~3.4 seconds for 38 tests)
- ✅ No flaky tests observed
- ✅ Deterministic results

**API Integration Tests:**

- ⚠️ Slower (MongoDB memory server startup)
- ⚠️ No performance benchmarks
- ⚠️ Potential for timeout issues

### 9.2 Recommendations

1. **Test Parallelization**
   - Run independent test suites in parallel
   - Separate fast unit tests from slow integration tests
   - Use test sharding for large suites

2. **Performance Benchmarking**

```typescript
describe('Pricing Engine Performance', () => {
  it('should calculate 1000 estimates in under 1 second', () => {
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      estimator.calculateEstimate(sampleInput, 'test-user');
    }
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });
});
```

3. **Flaky Test Detection**
   - Run tests multiple times to detect intermittent failures
   - Add retry logic for network-dependent tests
   - Implement test result tracking

---

## 10. Testing Best Practices Compliance

### 10.1 ✅ Following Best Practices

1. **Descriptive Test Names** - Clear, behavior-focused names
2. **AAA Pattern** - Arrange, Act, Assert structure
3. **Test Isolation** - No shared state between tests
4. **Mock External Dependencies** - Database, APIs, external services
5. **Comprehensive Assertions** - Testing return values, side effects, errors

### 10.2 ⚠️ Areas for Improvement

1. **Test Coverage Gaps** - Many critical modules untested
2. **Limited Integration Testing** - Missing workflow tests
3. **No E2E Testing** - User journeys not validated
4. **Inconsistent Mocking** - Some tests over-mock, reducing confidence
5. **Missing Performance Tests** - No load or stress testing

---

## 11. Recommendations for Production Readiness

### Priority 1: CRITICAL (Blockers)

#### 1.1 Frontend Component Tests

**Impact:** HIGH | **Effort:** HIGH | **Timeline:** 2-3 weeks

**Action Items:**

- [ ] Create test utilities (render helpers, mock providers)
- [ ] Test Dashboard component (KPI display, navigation)
- [ ] Test CustomerManagement (CRUD operations, filtering)
- [ ] Test JobManagement (lifecycle, status updates)
- [ ] Test CalendarDispatch (scheduling, drag-drop)
- [ ] Test AnalyticsDashboard (charts, data visualization)
- [ ] Test EstimateForm (validation, calculation)
- [ ] Test Settings components (30+ pages)

**Example Test Template:**

```typescript
// apps/web/__tests__/unit/components/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/app/components/Dashboard';
import { MockAuthProvider, MockAPIProvider } from '@/test-utils/mock-providers';

describe('Dashboard Component', () => {
  it('should display KPI metrics', async () => {
    render(
      <MockAuthProvider>
        <MockAPIProvider mockData={{ kpis: mockKPIs }}>
          <Dashboard />
        </MockAPIProvider>
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$125,450')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    render(
      <MockAuthProvider>
        <MockAPIProvider mockError={new Error('API Error')}>
          <Dashboard />
        </MockAPIProvider>
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
```

#### 1.2 API Service Unit Tests

**Impact:** HIGH | **Effort:** MEDIUM | **Timeline:** 1-2 weeks

**Action Items:**

- [ ] Test PricingRulesService (create, update, validate, apply)
- [ ] Test TariffSettingsService (CRUD, seed data, validation)
- [ ] Test AuditLogsService (logging, querying, export)
- [ ] Complete CustomersService tests (all CRUD operations)
- [ ] Complete JobsService tests (lifecycle, crew assignment)
- [ ] Complete EstimatesController tests (calculation, history)

**Example Test:**

```typescript
// apps/api/src/pricing-rules/pricing-rules.service.spec.ts
describe('PricingRulesService', () => {
  it('should create new pricing rule with validation', async () => {
    const newRule = {
      name: 'Holiday Surcharge',
      conditions: [{ field: 'isHoliday', operator: 'equals', value: true }],
      actions: [{ type: 'add_percentage', value: 15 }],
      priority: 50,
      isActive: true,
    };

    const result = await service.create(newRule, 'admin-user');

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Holiday Surcharge');
    expect(mockAuditLog).toHaveBeenCalledWith(
      'RULE_CREATED',
      expect.any(Object),
    );
  });

  it('should detect conflicting rules', async () => {
    const conflictingRule = {
      name: 'Duplicate Holiday Rule',
      conditions: [{ field: 'isHoliday', operator: 'equals', value: true }],
      actions: [{ type: 'add_percentage', value: 10 }],
      priority: 50,
    };

    await expect(service.create(conflictingRule, 'admin-user')).rejects.toThrow(
      'Conflicting rule detected',
    );
  });
});
```

#### 1.3 E2E Critical User Journeys

**Impact:** HIGH | **Effort:** HIGH | **Timeline:** 2 weeks

**Action Items:**

- [ ] Opportunity creation flow (customer → estimate → job)
- [ ] Job management flow (create → assign → complete)
- [ ] Settings update flow (change tariffs → verify estimate)
- [ ] Reporting flow (generate → export → verify)
- [ ] Authentication flow (login → access control → logout)

**Example E2E Test:**

```typescript
// apps/web-e2e/tests/opportunities/complete-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Opportunity Creation Flow', () => {
  test('should create opportunity from start to finish', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@simplepro.com');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Step 2: Navigate to New Opportunity
    await page.click('text=New Opportunity');
    await expect(page).toHaveURL('/opportunities/new');

    // Step 3: Fill Customer Information
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"]', '(555) 123-4567');
    await page.click('button:has-text("Next")');

    // Step 4: Fill Move Details
    await page.fill('[name="pickupAddress"]', '123 Main St, Boston, MA 02101');
    await page.fill(
      '[name="deliveryAddress"]',
      '456 Oak Ave, Cambridge, MA 02138',
    );
    await page.selectOption('[name="serviceType"]', 'local');
    await page.click('button:has-text("Next")');

    // Step 5: Select Move Size
    await page.selectOption('[name="moveSize"]', '4'); // 2BR Apartment
    await page.click('button:has-text("Next")');

    // Step 6: Review and Submit
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Estimated Total')).toBeVisible();
    await page.click('button:has-text("Create Opportunity")');

    // Step 7: Verify Success
    await expect(
      page.locator('text=Opportunity created successfully'),
    ).toBeVisible();

    // Step 8: Verify Customer Created
    await page.goto('/customers');
    await expect(page.locator('text=john.doe@example.com')).toBeVisible();
  });
});
```

### Priority 2: HIGH (Production Quality)

#### 2.1 Integration Test Completion

**Impact:** HIGH | **Effort:** MEDIUM | **Timeline:** 1 week

- [ ] Complete customers.integration.spec.ts (all CRUD operations)
- [ ] Complete jobs.integration.spec.ts (full lifecycle)
- [ ] Complete analytics.integration.spec.ts (data aggregation)
- [ ] Complete estimates.integration.spec.ts (calculation accuracy)
- [ ] Add cross-module integration tests (customer + job + estimate)

#### 2.2 Test Infrastructure Improvements

**Impact:** MEDIUM | **Effort:** LOW | **Timeline:** 3 days

- [ ] Fix web Jest configuration (setupFilesAfterEnv error)
- [ ] Create shared test utilities library
- [ ] Implement consistent test data factories
- [ ] Add test coverage reporting
- [ ] Configure parallel test execution

### Priority 3: MEDIUM (Quality Enhancements)

#### 3.1 Performance Testing

**Impact:** MEDIUM | **Effort:** LOW | **Timeline:** 3 days

- [ ] Pricing engine performance benchmarks
- [ ] API endpoint load testing (100+ concurrent requests)
- [ ] Database query performance tests
- [ ] Frontend render performance tests
- [ ] Memory leak detection tests

#### 3.2 Visual Regression Testing

**Impact:** MEDIUM | **Effort:** MEDIUM | **Timeline:** 1 week

- [ ] Setup Playwright screenshot testing
- [ ] Create baseline screenshots for all pages
- [ ] Add visual regression to CI pipeline
- [ ] Test responsive breakpoints
- [ ] Test dark theme consistency

### Priority 4: LOW (Nice to Have)

#### 4.1 Accessibility Testing

- [ ] ARIA label validation
- [ ] Keyboard navigation tests
- [ ] Screen reader compatibility
- [ ] Color contrast validation
- [ ] Focus management tests

#### 4.2 Security Testing

- [ ] SQL injection prevention tests
- [ ] XSS vulnerability tests
- [ ] CSRF token validation
- [ ] Rate limiting tests
- [ ] Session security tests

---

## 12. Specific Test Examples

### Example 1: CustomerManagement Component Test

```typescript
// apps/web/__tests__/unit/components/CustomerManagement.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerManagement } from '@/app/components/CustomerManagement';
import { MockAuthProvider } from '@/test-utils/mock-providers';

const mockCustomers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    type: 'residential',
    status: 'active',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-5678',
    type: 'commercial',
    status: 'lead',
  },
];

describe('CustomerManagement Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ customers: mockCustomers }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Customer Listing', () => {
    it('should display list of customers', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display customer count', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/2 customers/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Filtering', () => {
    it('should filter by status', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter by status/i);
      fireEvent.change(statusFilter, { target: { value: 'lead' } });

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should search by name', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search customers/i);
      fireEvent.change(searchInput, { target: { value: 'Jane' } });

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should filter by customer type', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const typeFilter = screen.getByLabelText(/customer type/i);
      fireEvent.change(typeFilter, { target: { value: 'commercial' } });

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Customer Creation', () => {
    it('should open create customer modal', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      const createButton = screen.getByText(/new customer/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/create customer/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });
    });

    it('should create new customer successfully', async () => {
      const newCustomer = {
        id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        phone: '555-9999',
        type: 'residential',
        status: 'lead',
      };

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ customers: mockCustomers }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ customer: newCustomer }),
        }) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/new customer/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: 'Bob' },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: 'Johnson' },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'bob@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: '555-9999' },
      });

      fireEvent.click(screen.getByText(/^create$/i));

      await waitFor(() => {
        expect(screen.getByText(/customer created successfully/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/new customer/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      // Try to submit without filling fields
      fireEvent.click(screen.getByText(/^create$/i));

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Updates', () => {
    it('should open edit customer modal', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit customer/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit customer/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });
    });

    it('should update customer successfully', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ customers: mockCustomers }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            customer: { ...mockCustomers[0], phone: '555-0000' },
          }),
        }) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit customer/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      const phoneInput = screen.getByLabelText(/phone/i);
      fireEvent.change(phoneInput, { target: { value: '555-0000' } });

      fireEvent.click(screen.getByText(/^save$/i));

      await waitFor(() => {
        expect(screen.getByText(/customer updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Deletion', () => {
    it('should show confirmation dialog', async () => {
      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete customer/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
        expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
      });
    });

    it('should deactivate customer successfully', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ customers: mockCustomers }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete customer/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/^confirm$/i));

      await waitFor(() => {
        expect(screen.getByText(/customer deactivated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      ) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load customers/i)).toBeInTheDocument();
      });
    });

    it('should display loading state', () => {
      global.fetch = jest.fn(
        () => new Promise(() => {}) // Never resolves
      ) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      const manyCustomers = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        firstName: `Customer ${i + 1}`,
        lastName: 'Test',
        email: `customer${i + 1}@example.com`,
        phone: '555-0000',
        type: 'residential',
        status: 'active',
      }));

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ customers: manyCustomers, total: 25 }),
        })
      ) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      const manyCustomers = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        firstName: `Customer ${i + 1}`,
        lastName: 'Test',
        email: `customer${i + 1}@example.com`,
        phone: '555-0000',
        type: 'residential',
        status: 'active',
      }));

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ customers: manyCustomers.slice(0, 10), total: 25 }),
        })
      ) as jest.Mock;

      render(
        <MockAuthProvider>
          <CustomerManagement />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Customer 1 Test')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });
  });
});
```

### Example 2: Pricing Rules Service Test

```typescript
// apps/api/src/pricing-rules/pricing-rules.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PricingRulesService } from './pricing-rules.service';
import { PricingRule } from './schemas/pricing-rule.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('PricingRulesService', () => {
  let service: PricingRulesService;
  let ruleModel: any;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  const mockRule = {
    _id: 'rule123',
    id: 'weekend_surcharge',
    name: 'Weekend Surcharge',
    description: 'Additional charge for weekend moves',
    conditions: [{ field: 'isWeekend', operator: 'equals', value: true }],
    actions: [{ type: 'add_percentage', value: 10 }],
    priority: 50,
    isActive: true,
    applicableServices: ['local', 'long_distance'],
    effectiveStartDate: new Date('2025-01-01'),
    effectiveEndDate: null,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  const mockRuleModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    constructor: jest.fn().mockImplementation(() => ({
      ...mockRule,
      save: jest.fn().mockResolvedValue(mockRule),
    })),
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingRulesService,
        {
          provide: getModelToken(PricingRule.name),
          useValue: mockRuleModel,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<PricingRulesService>(PricingRulesService);
    ruleModel = module.get(getModelToken(PricingRule.name));
    auditLogsService = module.get(AuditLogsService);
  });

  describe('create', () => {
    const createRuleDto = {
      id: 'holiday_surcharge',
      name: 'Holiday Surcharge',
      description: 'Extra charge for holiday moves',
      conditions: [{ field: 'isHoliday', operator: 'equals', value: true }],
      actions: [{ type: 'add_percentage', value: 15 }],
      priority: 60,
      applicableServices: ['local'],
    };

    it('should create new pricing rule', async () => {
      mockRuleModel.findOne.mockResolvedValue(null);
      const mockNewRule = {
        ...mockRule,
        ...createRuleDto,
        save: jest.fn().mockResolvedValue({ ...mockRule, ...createRuleDto }),
      };
      mockRuleModel.constructor = jest.fn().mockReturnValue(mockNewRule);

      const result = await service.create(createRuleDto, 'admin-user');

      expect(result.id).toBe('holiday_surcharge');
      expect(result.name).toBe('Holiday Surcharge');
      expect(mockAuditLogsService.log).toHaveBeenCalledWith({
        action: 'PRICING_RULE_CREATED',
        entityType: 'pricing_rule',
        entityId: expect.any(String),
        userId: 'admin-user',
        changes: expect.any(Object),
      });
    });

    it('should throw ConflictException for duplicate rule ID', async () => {
      mockRuleModel.findOne.mockResolvedValue(mockRule);

      await expect(service.create(createRuleDto, 'admin-user')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate rule conditions format', async () => {
      const invalidRuleDto = {
        ...createRuleDto,
        conditions: [{ field: 'invalid', operator: 'unknown', value: 'bad' }],
      };

      await expect(
        service.create(invalidRuleDto, 'admin-user'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate priority range', async () => {
      const invalidPriorityDto = {
        ...createRuleDto,
        priority: 150, // Out of range (0-100)
      };

      await expect(
        service.create(invalidPriorityDto, 'admin-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all active pricing rules', async () => {
      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockRule]),
      });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('weekend_surcharge');
      expect(mockRuleModel.find).toHaveBeenCalledWith({ isActive: true });
    });

    it('should return rules sorted by priority', async () => {
      const rule2 = { ...mockRule, id: 'rule2', priority: 30 };
      const rule3 = { ...mockRule, id: 'rule3', priority: 70 };

      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([rule2, mockRule, rule3]),
      });

      const result = await service.findAll();

      expect(result[0].priority).toBe(30);
      expect(result[1].priority).toBe(50);
      expect(result[2].priority).toBe(70);
    });

    it('should filter by service type', async () => {
      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockRule]),
      });

      const result = await service.findAll({ serviceType: 'local' });

      expect(mockRuleModel.find).toHaveBeenCalledWith({
        isActive: true,
        applicableServices: { $in: ['local'] },
      });
    });
  });

  describe('findById', () => {
    it('should return rule by ID', async () => {
      mockRuleModel.findById.mockResolvedValue(mockRule);

      const result = await service.findById('rule123');

      expect(result.id).toBe('weekend_surcharge');
      expect(mockRuleModel.findById).toHaveBeenCalledWith('rule123');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockRuleModel.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateRuleDto = {
      name: 'Updated Weekend Surcharge',
      actions: [{ type: 'add_percentage', value: 12 }],
    };

    it('should update existing rule', async () => {
      const mockUpdatableRule = {
        ...mockRule,
        save: jest.fn().mockResolvedValue({ ...mockRule, ...updateRuleDto }),
      };
      mockRuleModel.findById.mockResolvedValue(mockUpdatableRule);

      const result = await service.update(
        'rule123',
        updateRuleDto,
        'admin-user',
      );

      expect(result.name).toBe('Updated Weekend Surcharge');
      expect(mockAuditLogsService.log).toHaveBeenCalledWith({
        action: 'PRICING_RULE_UPDATED',
        entityType: 'pricing_rule',
        entityId: 'rule123',
        userId: 'admin-user',
        changes: expect.any(Object),
      });
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockRuleModel.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateRuleDto, 'admin-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate updated conditions format', async () => {
      const invalidUpdateDto = {
        conditions: [{ field: 'bad', operator: 'invalid', value: 'wrong' }],
      };

      mockRuleModel.findById.mockResolvedValue(mockRule);

      await expect(
        service.update('rule123', invalidUpdateDto, 'admin-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate rule', async () => {
      const mockDeactivatableRule = {
        ...mockRule,
        isActive: true,
        save: jest.fn().mockResolvedValue({ ...mockRule, isActive: false }),
      };
      mockRuleModel.findById.mockResolvedValue(mockDeactivatableRule);

      await service.deactivate('rule123', 'admin-user');

      expect(mockDeactivatableRule.isActive).toBe(false);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith({
        action: 'PRICING_RULE_DEACTIVATED',
        entityType: 'pricing_rule',
        entityId: 'rule123',
        userId: 'admin-user',
        changes: expect.any(Object),
      });
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockRuleModel.findById.mockResolvedValue(null);

      await expect(
        service.deactivate('nonexistent', 'admin-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('should activate inactive rule', async () => {
      const mockInactiveRule = {
        ...mockRule,
        isActive: false,
        save: jest.fn().mockResolvedValue({ ...mockRule, isActive: true }),
      };
      mockRuleModel.findById.mockResolvedValue(mockInactiveRule);

      await service.activate('rule123', 'admin-user');

      expect(mockInactiveRule.isActive).toBe(true);
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });
  });

  describe('validateRule', () => {
    it('should validate rule structure', () => {
      const validRule = {
        id: 'test_rule',
        name: 'Test Rule',
        conditions: [
          { field: 'totalWeight', operator: 'greaterThan', value: 1000 },
        ],
        actions: [{ type: 'add_fixed', value: 100 }],
        priority: 50,
      };

      const result = service.validateRule(validRule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid operators', () => {
      const invalidRule = {
        id: 'test_rule',
        name: 'Test Rule',
        conditions: [
          { field: 'totalWeight', operator: 'invalid_op', value: 1000 },
        ],
        actions: [{ type: 'add_fixed', value: 100 }],
        priority: 50,
      };

      const result = service.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid operator: invalid_op');
    });

    it('should detect invalid action types', () => {
      const invalidRule = {
        id: 'test_rule',
        name: 'Test Rule',
        conditions: [
          { field: 'totalWeight', operator: 'greaterThan', value: 1000 },
        ],
        actions: [{ type: 'invalid_action', value: 100 }],
        priority: 50,
      };

      const result = service.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid action type: invalid_action');
    });
  });

  describe('checkConflicts', () => {
    it('should detect conflicting rules', async () => {
      const newRule = {
        id: 'duplicate_weekend',
        conditions: [{ field: 'isWeekend', operator: 'equals', value: true }],
        actions: [{ type: 'add_percentage', value: 15 }],
        priority: 50,
      };

      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockRule]),
      });

      const conflicts = await service.checkConflicts(newRule);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('weekend_surcharge');
    });

    it('should not detect conflicts for different conditions', async () => {
      const newRule = {
        id: 'weekday_discount',
        conditions: [{ field: 'isWeekend', operator: 'equals', value: false }],
        actions: [{ type: 'subtract_percentage', value: 5 }],
        priority: 50,
      };

      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockRule]),
      });

      const conflicts = await service.checkConflicts(newRule);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('applyRulesToEstimate', () => {
    it('should apply matching rules in priority order', async () => {
      const estimateData = {
        isWeekend: true,
        totalWeight: 5000,
        service: 'local',
        basePrice: 1000,
      };

      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockRule]),
      });

      const result = await service.applyRulesToEstimate(estimateData);

      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].ruleId).toBe('weekend_surcharge');
      expect(result.finalPrice).toBeGreaterThan(1000); // 10% surcharge applied
    });

    it('should skip inactive rules', async () => {
      const inactiveRule = { ...mockRule, isActive: false };

      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([inactiveRule]),
      });

      const result = await service.applyRulesToEstimate({
        isWeekend: true,
        service: 'local',
        basePrice: 1000,
      });

      expect(result.appliedRules).toHaveLength(0);
    });

    it('should skip rules for inapplicable services', async () => {
      const localOnlyRule = {
        ...mockRule,
        applicableServices: ['local'],
      };

      mockRuleModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([localOnlyRule]),
      });

      const result = await service.applyRulesToEstimate({
        isWeekend: true,
        service: 'packing_only', // Different service
        basePrice: 1000,
      });

      expect(result.appliedRules).toHaveLength(0);
    });
  });
});
```

---

## 13. CI/CD Integration Plan

### 13.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit

      - name: Check coverage thresholds
        run: npm run test:coverage-check

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/test

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: test-results/

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-screenshots
          path: apps/web-e2e/test-results/

  quality-gate:
    name: Quality Gate
    needs: [unit-tests, integration-tests, e2e-tests]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Check test results
        run: |
          echo "All test suites passed!"
          echo "Ready for deployment"
```

### 13.2 Package.json Scripts

```json
{
  "scripts": {
    "test": "nx run-many --target=test --all --parallel",
    "test:unit": "nx run-many --target=test --all --parallel --exclude=*-e2e",
    "test:integration": "nx run-many --target=test:integration --all",
    "test:e2e": "nx run-many --target=e2e --all",
    "test:watch": "nx run-many --target=test --all --watch",
    "test:coverage": "nx run-many --target=test --all --coverage",
    "test:coverage-check": "node scripts/check-coverage.js",
    "test:pricing-engine": "nx test pricing-engine",
    "test:api": "nx test api",
    "test:web": "nx test web",
    "test:mobile": "nx test mobile"
  }
}
```

---

## 14. Conclusion and Action Plan

### Summary

SimplePro-v3 has a **solid foundation** in testing with the pricing engine demonstrating excellent coverage and test quality. However, **critical gaps** exist in frontend component testing, API service coverage, and E2E user journey validation.

### Production Readiness Score: 🟡 60/100

**Breakdown:**

- Unit Tests: 70/100 (good coverage in pricing engine, gaps elsewhere)
- Integration Tests: 50/100 (infrastructure exists, incomplete coverage)
- E2E Tests: 20/100 (minimal coverage, placeholder tests)
- Component Tests: 30/100 (4 tests out of 45+ components)
- Test Infrastructure: 80/100 (excellent setup, minor config issues)

### Immediate Action Items (Next 2 Weeks)

1. **Week 1: Critical Frontend Tests**
   - Create test utilities and mock providers
   - Test Dashboard component (3 days)
   - Test CustomerManagement component (2 days)
   - Test JobManagement component (2 days)

2. **Week 2: API Service Tests + E2E Foundation**
   - Test PricingRulesService (1 day)
   - Test TariffSettingsService (1 day)
   - Complete customer/job integration tests (1 day)
   - Create 3 critical E2E journeys (2 days)

### 30-Day Roadmap

**Week 3: Component Test Completion**

- CalendarDispatch tests
- AnalyticsDashboard tests
- Settings components tests
- EstimateForm/Result tests

**Week 4: Integration + Performance**

- Complete all integration tests
- Add performance benchmarks
- Setup CI/CD pipeline
- Fix test configuration issues

### Success Metrics

**Target Test Distribution (Production Ready):**

- 70% Unit Tests (currently ~45%)
- 20% Integration Tests (currently ~15%)
- 10% E2E Tests (currently <5%)

**Coverage Targets:**

- Overall: 80%+ (currently ~40%)
- Pricing Engine: 90%+ (currently 45%)
- API Services: 85%+ (currently ~60%)
- Frontend Components: 75%+ (currently <10%)

### Final Recommendation

**Priority:** ⚠️ **HIGH - Address before production deployment**

The lack of frontend component tests and E2E coverage represents a **significant production risk**. While the pricing engine is well-tested, the user-facing interfaces and critical workflows remain largely untested. Recommend dedicating **2-4 weeks** to comprehensive test coverage before production release.

**Next Steps:**

1. Review this analysis with development team
2. Prioritize test creation based on business-critical features
3. Implement CI/CD pipeline with quality gates
4. Track test coverage metrics weekly
5. Establish test maintenance procedures

---

**Document Version:** 1.0
**Last Updated:** October 2025
**Author:** Test Automation Architect
