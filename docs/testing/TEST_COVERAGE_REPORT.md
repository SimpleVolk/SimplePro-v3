# SimplePro-v3 Test Coverage Report

**Generated:** 2025-10-02
**Analysis Date:** October 2025

---

## Executive Summary

### Current State

- **Pricing Engine Coverage:** 45.66% statements, 36.13% branches, 58.18% functions (38/38 tests passing)
- **API Coverage:** ~12% overall (3 passing tests, 4 failing tests with compilation errors)
- **Web Coverage:** Test infrastructure broken (missing jest.setup.js)
- **Overall Project Coverage:** **~18% estimated**

### Critical Finding

**The CLAUDE.md claims are INCORRECT:**

- Claims "58% API coverage" → **Actual: ~12%**
- Claims "100% pricing engine coverage" → **Actual: 45.66%**
- Claims "15% frontend coverage" → **Actual: 0% (tests broken)**

---

## 1. Coverage Summary by Module

### Pricing Engine (`packages/pricing-engine`)

| File            | Statements | Branches | Functions | Lines  | Status          |
| --------------- | ---------- | -------- | --------- | ------ | --------------- |
| estimator.ts    | 46.9%      | 36.13%   | 60.37%    | 48.34% | ⚠️ Medium       |
| index.ts        | 0%         | 100%     | 0%        | 0%     | ❌ Critical     |
| rules.schema.ts | 0%         | 100%     | 100%      | 0%     | ✅ Low Priority |

**Test Status:** ✅ 38 tests passing
**Issues:** Large portions of estimator.ts uncovered (lines 17-85, 254-260, 268-272, etc.)

---

### API Backend (`apps/api`)

#### High Coverage Modules (>40%)

| Module                    | Coverage | Test Files | Status               |
| ------------------------- | -------- | ---------- | -------------------- |
| tariff-settings/seed-data | 44.06%   | 1 spec     | ⚠️ Needs improvement |
| estimates.controller      | ~60%     | 1 spec     | ✅ Good              |
| health.service            | ~70%     | 1 spec     | ✅ Good              |

#### Zero Coverage Modules (0% - CRITICAL)

| Module                  | Lines | Controllers | Services         | Test Files | Priority |
| ----------------------- | ----- | ----------- | ---------------- | ---------- | -------- |
| **documents**           | 1000+ | 1           | 1 (MinioService) | 0          | 🔴 P0    |
| **crew-schedule**       | 800+  | 1           | 4 services       | 0          | 🔴 P0    |
| **messages**            | 600+  | 1           | 3 services       | 0          | 🔴 P0    |
| **notifications**       | 800+  | 1           | 4 services       | 0          | 🔴 P0    |
| **customers**           | 400+  | 1           | 1                | 1 (broken) | 🔴 P0    |
| **jobs**                | 500+  | 1           | 1                | 1 (broken) | 🔴 P0    |
| **analytics**           | 600+  | 1           | 3 services       | 1 (broken) | 🔴 P0    |
| **tariff-settings**     | 1431  | 1           | 1                | 0          | 🔴 P1    |
| **opportunities**       | 400+  | 1           | 1                | 0          | 🔴 P1    |
| **lead-activities**     | 300+  | 1           | 1                | 0          | 🔴 P1    |
| **follow-up-rules**     | 300+  | 1           | 1                | 0          | 🔴 P1    |
| **follow-up-scheduler** | 200+  | 0           | 1                | 0          | 🟠 P2    |
| **partners**            | 300+  | 1           | 1                | 0          | 🟠 P2    |
| **referrals**           | 500+  | 1           | 1                | 0          | 🟠 P2    |
| **quote-history**       | 300+  | 1           | 1                | 0          | 🟠 P2    |
| **conversion-tracking** | 200+  | 1           | 1                | 0          | 🟠 P2    |
| **company**             | 200+  | 1           | 1                | 0          | 🟠 P2    |
| **audit-logs**          | 200+  | 1           | 1                | 0          | 🟠 P3    |
| **pricing-rules**       | 150+  | 1           | 1                | 0          | 🟠 P3    |
| **websocket**           | 300+  | 1 (gateway) | 1                | 0          | 🔴 P1    |
| **security**            | 16    | 0           | 1                | 0          | 🟢 P4    |

#### Partially Covered Modules (Low Coverage)

| Module            | Coverage | Status      |
| ----------------- | -------- | ----------- |
| websocket.gateway | 8.73%    | ❌ Critical |
| realtime.service  | 9.25%    | ❌ Critical |
| auth.service      | ~15%     | ❌ Critical |

---

### Web Frontend (`apps/web`)

#### Test Infrastructure Status: ❌ BROKEN

**Error:** `Module <rootDir>/jest.setup.js in the setupFilesAfterEnv option was not found`

#### Existing Test Files (Non-Functional)

| Test File               | Component     | Status    |
| ----------------------- | ------------- | --------- |
| index.spec.tsx          | Root          | ❌ Broken |
| MoveSizes.test.tsx      | Settings      | ❌ Broken |
| DistanceRates.test.tsx  | Settings      | ❌ Broken |
| NewOpportunity.test.tsx | Opportunities | ❌ Broken |

#### Components with ZERO Tests (92 components)

| Category            | Count | Examples                                                                              |
| ------------------- | ----- | ------------------------------------------------------------------------------------- |
| **Core Business**   | 15    | EstimateForm, CustomerManagement, JobManagement, CalendarDispatch, AnalyticsDashboard |
| **Settings**        | 35    | TariffSettings, CompanySettings, UserManagement, RolesPermissions                     |
| **Documents**       | 5     | DocumentManagement, DocumentUpload, DocumentViewer, ShareDialog                       |
| **Crew Management** | 6     | CrewSchedule, CrewAvailability, CrewWorkload, AutoAssignment                          |
| **Messaging**       | 4     | MessageThread, NotificationCenter, NotificationBell                                   |
| **Partners/Leads**  | 8     | PartnerManagement, LeadActivities, FollowUpRules                                      |
| **Conversion**      | 5     | ConversionFunnel, SalesPerformance, QuoteTimeline                                     |
| **UI Components**   | 14    | AppLayout, Sidebar, TopBar, LoadingSkeleton, ErrorBoundary                            |

**Total Components:** ~92
**Tested Components:** 0 (all tests broken)
**Coverage:** 0%

---

## 2. Critical Untested Files (Top 20)

### Priority 0 (MUST FIX - Security/Data Loss Risk)

1. **`apps/api/src/customers/customers.service.ts`** (400+ lines)
   - **Risk:** MongoDB data operations, duplicate detection, business logic
   - **Impact:** Customer data integrity, CRM functionality

2. **`apps/api/src/jobs/jobs.service.ts`** (500+ lines)
   - **Risk:** Job lifecycle management, crew assignment, WebSocket integration
   - **Impact:** Core operations, real-time updates

3. **`apps/api/src/auth/auth.service.ts`** (400+ lines)
   - **Risk:** JWT tokens, password hashing, session management, default admin creation
   - **Impact:** Authentication security, unauthorized access

4. **`apps/api/src/documents/documents.service.ts`** (1000+ lines)
   - **Risk:** File upload/download, MinIO integration, share links, encryption
   - **Impact:** Document security, data leakage

5. **`apps/api/src/notifications/notifications.service.ts`** (600+ lines)
   - **Risk:** Multi-channel notifications (email/SMS/push), delivery tracking
   - **Impact:** Communication reliability

### Priority 1 (High Business Impact)

6. **`apps/api/src/tariff-settings/tariff-settings.service.ts`** (1431 lines)
   - **Risk:** Dynamic pricing configuration, rate calculations
   - **Impact:** Pricing accuracy, revenue

7. **`apps/api/src/analytics/analytics.service.ts`** (600+ lines)
   - **Risk:** Business metrics, revenue calculations, dashboard data
   - **Impact:** Business intelligence accuracy

8. **`apps/api/src/crew-schedule/services/crew-schedule.service.ts`** (400+ lines)
   - **Risk:** Crew availability, job assignment, scheduling conflicts
   - **Impact:** Operations efficiency

9. **`apps/api/src/messages/messages.service.ts`** (300+ lines)
   - **Risk:** Message delivery, threading, real-time chat
   - **Impact:** Internal communication

10. **`apps/api/src/websocket/websocket.gateway.ts`** (500+ lines)
    - **Risk:** Real-time job updates, crew communication, connection management
    - **Impact:** Real-time features, user experience

### Priority 2 (Core Business Logic)

11. **`apps/api/src/opportunities/opportunities.service.ts`** (400+ lines)
12. **`apps/api/src/lead-activities/lead-activities.service.ts`** (300+ lines)
13. **`apps/api/src/partners/partners.service.ts`** (300+ lines)
14. **`apps/api/src/referrals/referrals.service.ts`** (500+ lines)
15. **`apps/api/src/follow-up-rules/follow-up-rules.service.ts`** (300+ lines)

### Priority 3 (Supporting Features)

16. **`apps/api/src/conversion-tracking/conversion-tracking.service.ts`** (200+ lines)
17. **`apps/api/src/quote-history/quote-history.service.ts`** (300+ lines)
18. **`apps/api/src/company/company.service.ts`** (200+ lines)
19. **`apps/api/src/audit-logs/audit-logs.service.ts`** (200+ lines)
20. **`apps/api/src/pricing-rules/pricing-rules.service.ts`** (150+ lines)

---

## 3. Test Issues Found

### Broken Test Files

1. **`customers.service.spec.ts`** - TypeScript compilation errors (lines 118, 169, 821)
2. **`analytics.service.spec.ts`** - Dependency injection issues (CustomerModel not available)
3. **`jobs.service.spec.ts`** - Similar dependency issues
4. **Web tests (all)** - Missing `jest.setup.js` file

### Mongoose Schema Warnings

- Duplicate index definitions on 13 schemas (jobId, revenue, email, tags, etc.)
- Should consolidate schema index declarations

### Integration Test Issues

- 6 integration test files exist but have limited coverage
- Most integration tests focus on happy paths only
- Missing edge case and error scenario testing

---

## 4. Test Improvement Plan

### Phase 1: Fix Broken Infrastructure (Week 1)

**Effort: 8 hours**

1. **Web Test Setup** (2 hours)
   - Create missing `jest.setup.js`
   - Fix Jest configuration in `apps/web/jest.config.ts`
   - Verify all 4 existing tests pass

2. **API Test Compilation** (3 hours)
   - Fix TypeScript errors in `customers.service.spec.ts`
   - Fix dependency injection in `analytics.service.spec.ts`
   - Fix `jobs.service.spec.ts` test setup

3. **Schema Optimization** (3 hours)
   - Remove duplicate index definitions in 13 schemas
   - Add unique constraints where missing

### Phase 2: Critical Security Tests (Week 2-3)

**Effort: 40 hours**

1. **Authentication & Authorization** (12 hours)
   - `auth.service.spec.ts` - JWT generation, token refresh, password hashing
   - `auth.controller.spec.ts` - Login, logout, profile endpoints
   - Role-based access control (RBAC) tests
   - Session management tests

2. **Data Security** (12 hours)
   - `documents.service.spec.ts` - File upload/download, encryption, share links
   - `security.service.spec.ts` - PII masking, data sanitization

3. **Core Business Services** (16 hours)
   - `customers.service.spec.ts` - CRUD operations, MongoDB queries
   - `jobs.service.spec.ts` - Job lifecycle, crew assignment, WebSocket events

### Phase 3: Business Logic Tests (Week 4-6)

**Effort: 60 hours**

1. **Pricing & Tariffs** (16 hours)
   - `tariff-settings.service.spec.ts` - Rate calculations, configuration
   - `pricing-rules.service.spec.ts` - Rule application, validation
   - Complete pricing-engine coverage (remaining 55%)

2. **Operations Management** (20 hours)
   - `crew-schedule.service.spec.ts` - Availability, assignment
   - `websocket.gateway.spec.ts` - Real-time updates, connection handling
   - `messages.service.spec.ts` - Threading, delivery

3. **Analytics & Reporting** (12 hours)
   - `analytics.service.spec.ts` - Metrics calculation, aggregation
   - `reports.service.spec.ts` - Report generation, export formats

4. **Sales & CRM** (12 hours)
   - `opportunities.service.spec.ts` - Lead management
   - `lead-activities.service.spec.ts` - Activity tracking
   - `follow-up-rules.service.spec.ts` - Automation rules

### Phase 4: Frontend Testing (Week 7-9)

**Effort: 80 hours**

1. **Critical UI Components** (24 hours)
   - EstimateForm, EstimateResult (form validation, calculations)
   - CustomerManagement (CRUD operations, filtering)
   - JobManagement (lifecycle, status updates)
   - CalendarDispatch (scheduling, drag-drop)

2. **Analytics & Dashboards** (16 hours)
   - AnalyticsDashboard (chart rendering, data visualization)
   - DashboardOverview (KPI cards, real-time updates)
   - ReportsManagement (generation, export)

3. **Settings & Configuration** (20 hours)
   - TariffSettings (35 pages - test 10 most critical)
   - CompanySettings, UserManagement
   - RolesPermissions (RBAC UI)

4. **Supporting Features** (20 hours)
   - Document management (upload, viewer, sharing)
   - Crew management (schedule, availability, workload)
   - Messaging & notifications (threads, preferences)

### Phase 5: Integration & E2E Tests (Week 10-12)

**Effort: 60 hours**

1. **API Integration Tests** (24 hours)
   - Complete customer lifecycle (create → estimate → job → completion)
   - Authentication flows (login → token refresh → logout)
   - Real-time WebSocket scenarios

2. **E2E User Workflows** (24 hours)
   - New opportunity → estimate → job → crew assignment → completion
   - Settings changes → pricing calculation verification
   - Document upload → sharing → download

3. **Performance & Load Tests** (12 hours)
   - API endpoint benchmarks
   - Database query optimization
   - WebSocket connection limits

---

## 5. Sample Test Structures

### Example 1: Customer Service Unit Tests

**File:** `apps/api/src/customers/customers.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer, CustomerDocument } from './schemas/customer.schema';

describe('CustomersService', () => {
  let service: CustomersService;
  let model: Model<CustomerDocument>;

  const mockCustomerModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    new: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    model = module.get<Model<CustomerDocument>>(getModelToken(Customer.name));
  });

  describe('create', () => {
    it('should create a new customer successfully', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
      };

      mockCustomerModel.findOne.mockResolvedValue(null);
      mockCustomerModel.save = jest.fn().mockResolvedValue({
        ...createDto,
        id: '123',
        status: 'lead',
      });

      const result = await service.create(createDto, 'user123');

      expect(mockCustomerModel.findOne).toHaveBeenCalledWith({
        email: expect.any(RegExp),
      });
      expect(result).toMatchObject({
        firstName: 'John',
        email: 'john@example.com',
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      const createDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'existing@example.com',
        phone: '555-5678',
      };

      mockCustomerModel.findOne.mockResolvedValue({
        email: 'existing@example.com',
      });

      await expect(service.create(createDto, 'user123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle case-insensitive email duplicates', async () => {
      // Test that JOHN@EXAMPLE.COM and john@example.com are treated as duplicates
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'JOHN@EXAMPLE.COM',
        phone: '555-1234',
      };

      mockCustomerModel.findOne.mockResolvedValue({
        email: 'john@example.com',
      });

      await expect(service.create(createDto, 'user123')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return filtered customers by status', async () => {
      const mockCustomers = [
        { id: '1', firstName: 'John', status: 'lead' },
        { id: '2', firstName: 'Jane', status: 'lead' },
      ];

      mockCustomerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockCustomers),
          }),
        }),
      });

      const result = await service.findAll({ status: 'lead' });

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('lead');
    });

    it('should handle search query across multiple fields', async () => {
      const filters = { search: 'john' };

      mockCustomerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await service.findAll(filters);

      // Verify that $or query is constructed for firstName, lastName, email
      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ firstName: expect.any(RegExp) }),
            expect.objectContaining({ lastName: expect.any(RegExp) }),
            expect.objectContaining({ email: expect.any(RegExp) }),
          ]),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update customer and return updated document', async () => {
      const updateDto = { firstName: 'John Updated' };
      const existingCustomer = {
        id: '123',
        firstName: 'John',
        save: jest.fn().mockResolvedValue({
          id: '123',
          firstName: 'John Updated',
        }),
      };

      mockCustomerModel.findById.mockResolvedValue(existingCustomer);

      const result = await service.update('123', updateDto, 'user123');

      expect(result.firstName).toBe('John Updated');
      expect(existingCustomer.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid customer ID', async () => {
      mockCustomerModel.findById.mockResolvedValue(null);

      await expect(service.update('invalid', {}, 'user123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete customer by setting status to inactive', async () => {
      const customer = {
        id: '123',
        status: 'active',
        save: jest.fn().mockResolvedValue({ id: '123', status: 'inactive' }),
      };

      mockCustomerModel.findById.mockResolvedValue(customer);

      await service.delete('123');

      expect(customer.status).toBe('inactive');
      expect(customer.save).toHaveBeenCalled();
    });
  });
});
```

**Coverage Target:** 80%+ statements, 70%+ branches
**Test Count:** 15-20 tests
**Effort:** 6-8 hours

---

### Example 2: Job Service Tests with WebSocket Integration

**File:** `apps/api/src/jobs/jobs.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobsService } from './jobs.service';
import { Job, JobDocument } from './schemas/job.schema';
import { RealtimeService } from '../websocket/realtime.service';

describe('JobsService', () => {
  let service: JobsService;
  let jobModel: Model<JobDocument>;
  let realtimeService: RealtimeService;

  const mockJobModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  const mockRealtimeService = {
    emitJobUpdate: jest.fn(),
    emitJobStatusChange: jest.fn(),
    notifyCrewAssignment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getModelToken(Job.name),
          useValue: mockJobModel,
        },
        {
          provide: RealtimeService,
          useValue: mockRealtimeService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobModel = module.get<Model<JobDocument>>(getModelToken(Job.name));
    realtimeService = module.get<RealtimeService>(RealtimeService);
  });

  describe('create', () => {
    it('should generate unique job number in format JOB-YYYY-NNNN', async () => {
      const createDto = {
        customerId: 'cust123',
        type: 'local',
        scheduledDate: new Date(),
        pickupAddress: { street: '123 Main St' },
        deliveryAddress: { street: '456 Oak Ave' },
      };

      const savedJob = {
        ...createDto,
        jobNumber: 'JOB-2025-0001',
        status: 'scheduled',
      };

      mockJobModel.save = jest.fn().mockResolvedValue(savedJob);

      const result = await service.create(createDto, 'user123');

      expect(result.jobNumber).toMatch(/^JOB-\d{4}-\d{4}$/);
      expect(result.status).toBe('scheduled');
    });

    it('should throw BadRequestException when customerId is missing', async () => {
      const createDto = { type: 'local' } as any;

      await expect(service.create(createDto, 'user123')).rejects.toThrow(
        'Customer ID is required',
      );
    });

    it('should emit WebSocket event after job creation', async () => {
      const createDto = {
        customerId: 'cust123',
        type: 'local',
        scheduledDate: new Date(),
      };

      mockJobModel.save = jest.fn().mockResolvedValue({
        ...createDto,
        jobNumber: 'JOB-2025-0001',
      });

      await service.create(createDto, 'user123');

      expect(mockRealtimeService.emitJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          jobNumber: 'JOB-2025-0001',
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and create milestone', async () => {
      const job = {
        id: 'job123',
        status: 'scheduled',
        milestones: [],
        save: jest.fn().mockResolvedValue({
          id: 'job123',
          status: 'in_progress',
          milestones: [{ status: 'in_progress', timestamp: expect.any(Date) }],
        }),
      };

      mockJobModel.findById.mockResolvedValue(job);

      await service.updateStatus('job123', 'in_progress', 'user123');

      expect(job.status).toBe('in_progress');
      expect(job.milestones).toHaveLength(1);
      expect(mockRealtimeService.emitJobStatusChange).toHaveBeenCalled();
    });

    it('should prevent invalid status transitions', async () => {
      const job = {
        id: 'job123',
        status: 'completed',
      };

      mockJobModel.findById.mockResolvedValue(job);

      await expect(
        service.updateStatus('job123', 'scheduled', 'user123'),
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('assignCrew', () => {
    it('should assign crew and notify via WebSocket', async () => {
      const job = {
        id: 'job123',
        crew: [],
        save: jest.fn().mockResolvedValue({
          id: 'job123',
          crew: [{ userId: 'crew1', role: 'lead' }],
        }),
      };

      mockJobModel.findById.mockResolvedValue(job);

      const crewAssignment = {
        userId: 'crew1',
        role: 'lead',
        assignedAt: new Date(),
      };

      await service.assignCrew('job123', crewAssignment, 'user123');

      expect(job.crew).toHaveLength(1);
      expect(mockRealtimeService.notifyCrewAssignment).toHaveBeenCalledWith(
        'crew1',
        expect.objectContaining({ id: 'job123' }),
      );
    });
  });

  describe('onModuleInit', () => {
    it('should initialize job counter from latest job number', async () => {
      const latestJob = {
        jobNumber: 'JOB-2025-0042',
      };

      mockJobModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(latestJob),
          }),
        }),
      });

      await service.onModuleInit();

      // Next job should be 0043
      const newJob = await service.create(
        { customerId: 'test', type: 'local' } as any,
        'user123',
      );

      expect(newJob.jobNumber).toContain('0043');
    });
  });
});
```

**Coverage Target:** 75%+ statements, 65%+ branches
**Test Count:** 20-25 tests
**Effort:** 8-10 hours

---

### Example 3: Analytics Dashboard Component Tests

**File:** `apps/web/src/app/components/AnalyticsDashboard.spec.tsx`

```typescript
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import * as analyticsApi from '../services/analytics.api';

// Mock the analytics API
jest.mock('../services/analytics.api');

describe('AnalyticsDashboard', () => {
  const mockAnalyticsData = {
    overview: {
      totalRevenue: 125000,
      totalJobs: 45,
      activeJobs: 12,
      completionRate: 94.5,
    },
    revenueByService: [
      { service: 'Local Move', revenue: 75000, percentage: 60 },
      { service: 'Long Distance', revenue: 40000, percentage: 32 },
      { service: 'Packing', revenue: 10000, percentage: 8 },
    ],
    jobsByStatus: [
      { status: 'Completed', count: 30 },
      { status: 'In Progress', count: 12 },
      { status: 'Scheduled', count: 3 },
    ],
  };

  beforeEach(() => {
    (analyticsApi.fetchAnalytics as jest.Mock).mockResolvedValue(
      mockAnalyticsData
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      render(<AnalyticsDashboard />);
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard after data loads', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });

    it('should display KPI cards with correct values', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('94.5%')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      const revenueTab = screen.getByText('Revenue Analysis');
      fireEvent.click(revenueTab);

      expect(screen.getByTestId('revenue-chart')).toBeInTheDocument();
    });

    it('should load tab-specific data when switching', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      const performanceTab = screen.getByText('Performance Tracking');
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(analyticsApi.fetchPerformanceMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('Chart Rendering', () => {
    it('should render pie chart with service breakdown', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const pieChart = screen.getByTestId('service-revenue-pie-chart');
        expect(pieChart).toBeInTheDocument();
      });
    });

    it('should render bar chart with job status counts', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const barChart = screen.getByTestId('job-status-bar-chart');
        expect(barChart).toBeInTheDocument();
      });
    });

    it('should format currency values correctly in charts', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('$75,000')).toBeInTheDocument();
        expect(screen.getByText('$40,000')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (analyticsApi.fetchAnalytics as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load analytics data')
        ).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (analyticsApi.fetchAnalytics as jest.Mock).mockRejectedValue(
        new Error('Network Error')
      );

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('should update charts when date range changes', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const dateRangePicker = screen.getByTestId('date-range-picker');
      fireEvent.change(dateRangePicker, {
        target: { value: '2025-09-01_2025-09-30' },
      });

      await waitFor(() => {
        expect(analyticsApi.fetchAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2025-09-01',
            endDate: '2025-09-30',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for charts', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const pieChart = screen.getByLabelText('Revenue by service type');
        expect(pieChart).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation between tabs', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const overviewTab = screen.getByText('Overview');
        overviewTab.focus();
        expect(document.activeElement).toBe(overviewTab);
      });
    });
  });
});
```

**Coverage Target:** 70%+ statements, 60%+ branches
**Test Count:** 15-20 tests
**Effort:** 6-8 hours

---

## 6. Effort Estimation to Reach 80% Coverage

### Total Effort Breakdown

| Phase                        | Duration     | Effort (hours) | Priority |
| ---------------------------- | ------------ | -------------- | -------- |
| **Phase 1: Infrastructure**  | Week 1       | 8              | P0       |
| **Phase 2: Security Tests**  | Week 2-3     | 40             | P0       |
| **Phase 3: Business Logic**  | Week 4-6     | 60             | P1       |
| **Phase 4: Frontend Tests**  | Week 7-9     | 80             | P1       |
| **Phase 5: Integration/E2E** | Week 10-12   | 60             | P2       |
| **TOTAL**                    | **12 weeks** | **248 hours**  | -        |

### Resource Requirements

- **1 Senior QA Engineer** (full-time, 12 weeks)
- **OR 2 Mid-level QA Engineers** (6 weeks each, parallel work)
- **Code Review Support:** 1-2 hours/week from Tech Lead

### Expected Coverage After Completion

- **API:** 80%+ (from current ~12%)
- **Pricing Engine:** 90%+ (from current 46%)
- **Web:** 70%+ (from current 0%)
- **Overall Project:** **75-80%**

---

## 7. High-Priority Quick Wins (Week 1)

### Immediate Actions (8 hours total)

1. **Fix Web Test Setup** (2 hours)
   - Create `apps/web/jest.setup.js`:
     ```javascript
     import '@testing-library/jest-dom';
     ```
   - Update `apps/web/jest.config.ts` to use correct setup path
   - Verify existing 4 tests pass

2. **Fix API Test Compilation** (3 hours)
   - Fix syntax error in `customers.service.spec.ts` line 118
   - Add CustomerModel to `analytics.service.spec.ts` providers
   - Fix `jobs.service.spec.ts` dependency injection

3. **Complete Pricing Engine Coverage** (3 hours)
   - Add tests for uncovered estimator.ts lines (254-260, 268-272, etc.)
   - Test edge cases: extreme values, invalid rules, missing data
   - Achieve 85%+ coverage (from 46%)

**Immediate ROI:** 15% overall coverage increase with minimal effort

---

## 8. Recommended Testing Tools & Libraries

### Backend Testing Stack

- **Jest** (current) - Unit test framework
- **@nestjs/testing** (current) - NestJS test utilities
- **Supertest** - HTTP integration testing
- **mongodb-memory-server** - In-memory MongoDB for tests
- **faker** - Generate realistic test data

### Frontend Testing Stack

- **Jest** (current) - Test runner
- **@testing-library/react** - Component testing
- **@testing-library/user-event** - User interaction simulation
- **MSW (Mock Service Worker)** - API mocking
- **Playwright** - E2E testing (replace Cypress)

### Additional Tools

- **Istanbul/NYC** - Enhanced coverage reporting
- **Codecov** - Coverage tracking and PR checks
- **Stryker** - Mutation testing (validate test quality)
- **k6** - Performance/load testing

---

## 9. CI/CD Integration Recommendations

### Test Execution Strategy

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    - Run pricing-engine tests (2 min)
    - Run API unit tests (5 min)
    - Run web unit tests (3 min)

  integration-tests:
    - Start test MongoDB container
    - Run API integration tests (8 min)
    - Run E2E tests (15 min)

  coverage-check:
    - Enforce 80% minimum coverage
    - Block PR if coverage drops
    - Generate coverage reports
```

### Quality Gates

- **PR Requirements:**
  - All tests pass
  - Coverage ≥ 80% overall
  - No decrease in coverage from base branch
  - Critical files (auth, payments, data services) ≥ 90% coverage

---

## 10. Maintenance Strategy

### Ongoing Test Maintenance

1. **Test-First Development:** Write tests before implementing new features
2. **Coverage Monitoring:** Weekly coverage reports in team meetings
3. **Flaky Test Tracking:** Automated detection and notification
4. **Test Performance:** Monitor and optimize slow tests (>500ms)

### Test Documentation

- Maintain test plan document for each module
- Document complex test scenarios and edge cases
- Create testing guidelines for new developers

---

## Appendices

### Appendix A: Test File Inventory

**API Test Files (14 total):**

- ✅ `estimates.controller.spec.ts` (passing)
- ✅ `health.service.spec.ts` (passing)
- ✅ `tariff-settings/seed-data/seed-tariff-settings.spec.ts` (passing)
- ❌ `customers.service.spec.ts` (broken - TypeScript errors)
- ❌ `analytics.service.spec.ts` (broken - dependency injection)
- ❌ `jobs.service.spec.ts` (broken - dependency injection)
- ❌ `auth.service.spec.ts` (broken - dependency injection)
- ✅ `api.integration.spec.ts` (integration)
- ✅ `auth.integration.spec.ts` (integration)
- ✅ `customers.integration.spec.ts` (integration)
- ✅ `jobs.integration.spec.ts` (integration)
- ✅ `analytics.integration.spec.ts` (integration)
- ✅ `estimates.integration.spec.ts` (integration)
- ✅ `simple-integration.spec.ts` (integration)

**Web Test Files (4 total - all broken):**

- ❌ `index.spec.tsx` (broken - missing jest.setup.js)
- ❌ `MoveSizes.test.tsx` (broken - missing jest.setup.js)
- ❌ `DistanceRates.test.tsx` (broken - missing jest.setup.js)
- ❌ `NewOpportunity.test.tsx` (broken - missing jest.setup.js)

### Appendix B: Coverage by File Type

| File Type        | Total Files | With Tests | Coverage % |
| ---------------- | ----------- | ---------- | ---------- |
| Services         | 42          | 4          | 9.5%       |
| Controllers      | 24          | 1          | 4.2%       |
| React Components | 92          | 0          | 0%         |
| Schemas          | 30+         | 0          | N/A        |
| DTOs             | 50+         | 0          | N/A        |
| Interfaces       | 40+         | 0          | N/A        |

---

**Report Compiled By:** Test Automation Architect
**Next Review Date:** 2025-10-09
**Status:** 🔴 Critical - Immediate action required
