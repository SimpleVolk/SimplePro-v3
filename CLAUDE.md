# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SimplePro-v3 Developer Guide

**Status**: Production-ready moving company business management platform

## Quick Start

```bash
npm run docker:dev    # Start MongoDB, Redis, MinIO
npm run dev           # Start API (3001) + Web (3009)
# Login: admin / Admin123!
```

**Architecture**: NX monorepo with 3 apps (API, Web, Mobile) + pricing-engine package
**Stack**: NestJS API, Next.js 14 Web, React Native Mobile, MongoDB, Redis, MinIO
**Key Features**: 28 backend modules, 37+ frontend pages, deterministic pricing engine, real-time WebSocket

---

## Repository Structure

```
simplepro-v3/
├── apps/
│   ├── api/              # NestJS backend (28 modules, 50+ endpoints)
│   ├── web/              # Next.js 14 frontend (37+ pages)
│   └── mobile/           # React Native crew app (offline-first)
├── packages/
│   └── pricing-engine/   # Deterministic calculator (100% test coverage)
├── scripts/              # Database seeding, deployment, backups
├── monitoring/           # Prometheus, Grafana configurations
└── docker-compose.*.yml  # Dev/prod infrastructure
```

---

## Essential Commands

### Development

```bash
npm run dev              # Start API + Web concurrently
npm run dev:api          # API only (port 3001)
npm run dev:web          # Web only (port 3009)
```

### Testing

```bash
npm test                      # Run all tests
npm run test:pricing          # Pricing engine (38 tests)
npm run test:api:unit         # API unit tests
npm run test:coverage         # All tests with coverage
nx test <project>             # Test specific project
```

### Building

```bash
npm run build                 # Build all projects
nx build <project>            # Build specific (api, web, pricing-engine)
npm run lint                  # Lint and fix all code
```

### Docker & Infrastructure

```bash
npm run docker:dev            # Start MongoDB + Redis + MinIO
npm run docker:dev:down       # Stop infrastructure
npm run docker:dev:logs       # View container logs
npm run monitoring:start      # Start Prometheus + Grafana
```

### Database Management

```bash
npm run db:seed:dev           # Seed development data
npm run db:seed:dev:clear     # Clear and reseed all data
npm run db:seed:tariffs       # Seed tariff settings only
npm run replica:setup         # Set up MongoDB replica set
```

### NX Specific Commands

```bash
nx build <project>            # Build: api, web, pricing-engine
nx test <project>             # Test specific project
nx lint <project>             # Lint specific project
nx affected:build             # Build only affected projects
nx graph                      # View dependency graph
```

---

## Architecture Highlights

### 1. Deterministic Pricing Engine

**Location**: `packages/pricing-engine/`
**Import**: `import { DeterministicEstimator, defaultRules } from '@simplepro/pricing-engine';`

**Core Principle**: Identical inputs → identical outputs (SHA256 verified)

```typescript
// Usage example
const estimator = new DeterministicEstimator(
  defaultRules.pricingRules,
  defaultRules.locationHandicaps,
);
const result = estimator.calculateEstimate(inputData, userId);
// result.metadata.hash provides SHA256 audit trail
```

**Key Files**:

- `src/estimator.ts` - Main calculator with 100-point crew assignment logic
- `src/data/default-rules.json` - 15+ configurable pricing rules (priority 1-50)
- `src/schemas/rules.schema.ts` - TypeScript interfaces for type safety
- `src/test-data/sample-inputs.ts` - Test scenarios (studio, large, long-distance)

**Rule System**:

- **Priority-based execution**: Lower numbers run first (1-50)
- **Condition operators**: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `between`, `exists`, `regex`
- **Action types**: `add_fixed`, `add_percentage`, `multiply`, `set_minimum`, `set_maximum`, `replace`
- **Service types**: `local`, `long_distance`, `storage`, `packing_only`

**Critical Design Note**: Rules are executed in priority order. If you add new rules, ensure priority doesn't conflict with existing logic.

---

### 2. NestJS API Architecture

**Module Pattern**: Self-contained feature modules with controller → service → schema layers

**28 Backend Modules**:

1. `auth` - JWT (1h access, 7d refresh), bcrypt, RBAC, session management
2. `customers` - CRM with lead scoring, contact history, multi-source attribution
3. `jobs` - Full lifecycle (scheduled → in_progress → completed), crew assignment
4. `opportunities` - Sales pipeline with win/loss tracking
5. `lead-activities` - Activity tracking (call, email, meeting, follow-up)
6. `follow-up-rules` - Automated follow-up rule engine
7. `estimates` - Pricing engine integration
8. `pricing-rules` - JSON rule management with versioning
9. `tariff-settings` - Hourly rates, materials catalog, location handicaps
10. `crew-schedule` - 100-point auto-assignment algorithm
11. `messages` - WebSocket chat with typing indicators
12. `notifications` - Multi-channel (Email/SMS/Push/WebSocket) with retry logic
13. `documents` - MinIO S3 storage with presigned URLs
14. `analytics` - Business metrics, revenue tracking, geographic analysis
15. `conversion-tracking` - Sales funnel analytics
16. `quote-history` - Quote versioning and customer interaction tracking
17. `partners` - Partner management with commission tracking
18. `referrals` - Referral lifecycle (pending → won/lost)
19. `partner-portal` - Separate JWT auth for partners
20. `audit-logs` - Compliance-ready audit trail (90-day TTL)
21. `company` - Company profile and settings
22. `websocket` - Real-time job updates, message delivery
23. `graphql` - Apollo Server integration (50% complete)
24. `health` - MongoDB/Redis/MinIO health checks
25. `monitoring` - Prometheus metrics endpoint
26. `security` - Rate limiting, NoSQL injection protection
27. `cache` - Redis caching with TTL management
28. `database` - MongoDB connection, seeding, foreign key validation

**Critical Security Patterns**:

- **Rate Limiting**: 5 login attempts/min, 10 req/sec, 50 req/10sec, 200 req/min
- **NoSQL Injection Protection**: `QueryFiltersDto` sanitizes all inputs
- **Password Hashing**: bcrypt with 12 rounds
- **Session Management**: MongoDB TTL indexes for automatic cleanup
- **CORS**: Configurable via `ALLOWED_ORIGINS` env variable

**File Locations**:

- Controllers: `apps/api/src/<module>/<module>.controller.ts`
- Services: `apps/api/src/<module>/<module>.service.ts`
- Schemas: `apps/api/src/<module>/schemas/*.schema.ts`
- DTOs: `apps/api/src/<module>/dto/*.dto.ts`

---

### 3. Next.js 14 Web Frontend

**Rendering Strategy**: `force-dynamic` (no static generation due to auth context)

**37+ Pages Across 14 Sections**:

1. **Dashboard** (`/dashboard`) - Real-time KPIs with WebSocket updates
2. **New Opportunity** (`/new-opportunity`) - 4-step wizard with draft persistence
3. **Customers** (`/customers`) - CRM with multi-filter search
4. **Jobs** (`/jobs`) - Job lifecycle management
5. **Calendar** (`/calendar`) - Multi-view (month/week/day) dispatch
6. **Leads & Follow-up** (`/leads`) - Activity tracking and automation
7. **Partners** (`/partners`) - Partner/referral management
8. **Documents** (`/documents`) - File management with MinIO
9. **Crew Schedule** (`/crew-schedule`) - Drag-drop scheduling with auto-assignment
10. **Notifications** (`/notifications`) - Multi-channel notification center
11. **Conversion Analytics** (`/conversion`) - Sales funnel analysis
12. **Reports** (`/reports`) - Business intelligence dashboard
13. **Settings** (`/settings/*`) - 33-page hierarchical configuration
14. **Shared Documents** (`/shared/[token]`) - Public document access

**Settings System** (33 pages):

```
/settings/
├── company/           # 8 pages (company details, users, roles, audit logs, branding, branches, payment, SMS)
├── estimates/         # 11 pages (service types, property types, inventory, parking, regions, tags, config, custom fields, sizes, price ranges)
├── tariffs/           # 8 pages (hourly rates, distance, materials, packing, handicaps, valuation, opportunity types, auto-pricing)
└── operations/        # 4 pages (crew management, dispatch settings, mobile config, notifications)
```

**Key UI Patterns**:

- **AppLayout** (`src/app/components/AppLayout.tsx`) - Collapsible sidebar, role-based navigation
- **Loading Strategy**: Lazy loading with `React.lazy()` and `Suspense` for large components
- **Theme**: Dark theme only (no light mode switch)
- **Styling**: CSS Modules with BEM-like naming
- **State Management**: React Context API (AuthContext, WebSocketContext)
- **API Integration**: Centralized `getApiUrl()` helper with token-based auth

**WebSocket Integration**:

```typescript
// WebSocket events received by frontend
- job.updated - Job modifications
- job.status_changed - Status transitions
- message.created - New messages
- notification.new - Push notifications
- crew.checkin - Crew check-in events
```

---

### 4. Mobile App (React Native 0.79.3)

**Target**: Crew members only (no customer-facing features)

**Offline-First Architecture**:

- **Redux Persist** with AsyncStorage for offline data
- **Action Queue**: Queues GPS check-ins, photos, signatures when offline
- **Sync Mechanism**: Exponential backoff (1s, 2s, 4s), 3 retry attempts
- **NetInfo Integration**: Automatic sync on reconnection

**Key Features**:

1. **GPS Check-In/Out** - 500m geofence verification with override option
2. **Photo Capture** - Multiple types (before, during, after, damage), batch upload
3. **Signature Capture** - Customer acknowledgment with PNG export
4. **Schedule Viewing** - Daily job assignments with pull-to-refresh
5. **Time Tracking** - Clock in/out with break management
6. **Job Details** - Customer info, addresses, special instructions
7. **Checklist Management** - Task completion tracking

**Redux Slices**:

- `authSlice` - Crew authentication
- `jobsSlice` - Job data with offline persistence
- `shiftsSlice` - Schedule management
- `offlineSlice` - Action queue and sync state
- `notificationsSlice` - Push notification handling
- `documentsSlice` - Photo/signature upload queue
- `timeTrackingSlice` - Time entry tracking

**WebSocket Events** (receive-only):

```typescript
('job.updated',
  'job.assigned',
  'job.status_changed',
  'notification.new',
  'message.new');
```

**Critical Note**: Mobile app is crew-only. Customer mobile app is not implemented (identified as high-priority gap).

---

## Database Schemas (Key Patterns)

**MongoDB with Mongoose ODM** - All schemas follow these patterns:

### Core Schemas

- **User** (`apps/api/src/auth/schemas/user.schema.ts`)
  - Roles: `super_admin`, `admin`, `dispatcher`, `sales_rep`, `crew_member`
  - Permissions: Granular RBAC (e.g., `customers:create`, `jobs:read`)
  - FCM tokens for push notifications

- **Customer** (`apps/api/src/customers/schemas/customer.schema.ts`)
  - Unique email constraint
  - Text search index (weighted: name, email, phone, address, city, state)
  - Lead sources: `website`, `referral`, `advertising`, `social_media`, `partner`, `other`
  - Status lifecycle: `lead` → `prospect` → `active` → `inactive`

- **Job** (`apps/api/src/jobs/schemas/job.schema.ts`)
  - Unique job number auto-generation
  - Compound indexes: `[status, scheduledDate]`, `[customerId, createdAt]`
  - Foreign key validation via middleware
  - Document size limit: 10MB (middleware enforced)
  - Types: `local`, `long_distance`, `storage`, `packing_only`

- **Message** (`apps/api/src/messages/schemas/message.schema.ts`)
  - Thread-based architecture
  - Read receipts array (userId + timestamp)
  - Typing indicators stored in Redis (10s TTL)

- **Notification** (`apps/api/src/notifications/schemas/notification.schema.ts`)
  - Multi-channel delivery tracking
  - Retry logic: 3 attempts with exponential backoff
  - Channels: `in_app`, `email`, `sms`, `push`

### Schema Middleware Patterns

**Foreign Key Validation** (`apps/api/src/database/middleware/foreign-key-validation.middleware.ts`):

```typescript
// Automatically validates references before save
- customerId → Customer
- jobId → Job
- userId → User
- opportunityId → Opportunity
```

**Document Size Monitoring** (`apps/api/src/database/middleware/document-size-monitor.middleware.ts`):

```typescript
// Prevents MongoDB 16MB document limit
- Warns at 10MB
- Throws error at 15MB
```

**TTL Indexes** (Automatic Cleanup):

- User sessions: 7 days
- Audit logs: 90 days
- Typing indicators (Redis): 10 seconds

---

## Environment Configuration

### Required Environment Files

**API** (`apps/api/.env.local`):

```bash
# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/simplepro?authSource=admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# CORS
ALLOWED_ORIGINS=http://localhost:3009,http://localhost:3010,http://localhost:3000

# MinIO (defaults work with Docker)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Optional: Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

**Web** (`apps/web/.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Docker Services (via `npm run docker:dev`)

- **MongoDB**: port 27017 (admin/password123)
- **Redis**: port 6379
- **MinIO**: ports 9000 (API), 9001 (Console at http://localhost:9001 - minioadmin/minioadmin)

---

## Default Credentials (Development Only)

**Admin Login**:

- Username: `admin` or `admin@simplepro.com`
- Password: `Admin123!` (case-sensitive, includes exclamation mark)

**Other Test Users** (after running `npm run db:seed:dev`):

- Sales Rep: `sarah.sales` / `Test123!`
- Dispatcher: `danny.dispatch` / `Test123!`
- Crew: `crew1` / `Crew123!`

**Important**: The exclamation mark is part of the password. Login failures are often due to incorrect password entry.

---

## Key Workflows & Integration Points

### Creating an Estimate → Job Flow

1. **New Opportunity Page** (`/new-opportunity`) - 4-step wizard
2. **Pricing Engine** calculates estimate with SHA256 hash
3. **Quote History** tracks all estimate versions
4. **Conversion to Job** creates Job record with crew assignment
5. **Crew Schedule** auto-assigns crew using 100-point algorithm
6. **WebSocket** notifies crew of assignment
7. **Mobile App** crew checks in with GPS verification
8. **Documents** stores photos/signatures in MinIO
9. **Notifications** sends multi-channel updates
10. **Analytics** tracks conversion metrics

### Crew Auto-Assignment Algorithm

**Location**: `apps/api/src/crew-schedule/crew-schedule.service.ts` (line ~200)

**100-Point Scoring System**:

```typescript
Skills Match: 30 points        // Crew has required skills
Availability: 20 points        // Crew available on job date
Distance: 20 points            // Proximity to job site
Performance History: 15 points // Past job completion rating
Workload Balance: 10 points    // Not overloaded
Preferences: 5 points          // Crew prefers this job type
```

**Critical Note**: Algorithm prefers balanced workload distribution over always assigning top performers.

### Real-Time Updates Architecture

1. **API Event Emission** → `EventEmitter2` in NestJS services
2. **WebSocket Gateway** → Listens to events, broadcasts to connected clients
3. **Redis Pub/Sub** → For multi-instance scaling (not yet implemented)
4. **Frontend Context** → `WebSocketContext` manages connection and updates
5. **Redux Store (Mobile)** → Updates job/notification state

---

## Testing Strategy

### Current Coverage

- **Pricing Engine**: 100% (38/38 tests passing)
- **API**: 58% (93/159 tests passing) - needs improvement
- **Web**: <10% - needs significant improvement

### Running Tests

```bash
# Full test suite
npm test

# Individual components
npm run test:pricing          # Pricing engine only
npm run test:api:unit         # API unit tests
npm run test:api:integration  # API integration tests
npm run test:coverage         # Coverage reports

# Watch mode
npm run test:watch

# CI mode (non-interactive)
npm run test:ci
```

### Test Patterns

- **Pricing Engine**: Pure function tests with deterministic assertions
- **API**: Jest with MongoDB Memory Server for integration tests
- **Web**: React Testing Library (minimal coverage currently)

### Adding New Tests

When adding features, follow these patterns:

1. **Unit tests**: For services and utilities
2. **Integration tests**: For API endpoints with database operations
3. **E2E tests**: For critical user workflows (payment, job creation)

---

## Common Workflows

### Adding a New API Module

1. Generate module: `nx generate @nx/nest:module <module-name> --project=api`
2. Create schema in `apps/api/src/<module>/schemas/`
3. Add DTOs in `apps/api/src/<module>/dto/`
4. Implement service with business logic
5. Create controller with endpoints
6. Register module in `apps/api/src/app.module.ts`
7. Add tests in `apps/api/src/<module>/<module>.service.spec.ts`

### Adding a New Web Page

1. Create page in `apps/web/src/app/<route>/page.tsx`
2. Add route to sidebar in `apps/web/src/app/components/Sidebar.tsx`
3. Implement component with Next.js 14 patterns (`force-dynamic` for auth)
4. Add API integration using `getApiUrl()` helper
5. Use lazy loading for large components: `const Component = lazy(() => import('./Component'))`

### Modifying Pricing Rules

1. Edit `packages/pricing-engine/src/data/default-rules.json`
2. Add new rule with unique `id` and appropriate `priority`
3. Ensure `isActive: true`
4. Add test case in `packages/pricing-engine/src/estimator.test.ts`
5. Run tests: `npm run test:pricing`
6. Rebuild package: `cd packages/pricing-engine && npm run build`

### Database Seeding Workflow

```bash
# Seed all development data (users, customers, jobs, etc.)
npm run db:seed:dev

# Clear all data and reseed
npm run db:seed:dev:clear

# Seed only tariff settings (pricing rules, rates, materials)
npm run db:seed:tariffs

# Reset tariff settings (useful after rule changes)
npm run db:seed:tariffs:reset
```

**Seed Data Locations**:

- Users: `apps/api/src/database/seeders/seed-data.ts`
- Tariffs: `apps/api/src/tariff-settings/seed-data/default-tariff-data.ts`
- Sample Jobs/Customers: Generated via `@faker-js/faker` in seed scripts

---

## Troubleshooting

### Port Conflicts

**Symptom**: "Port 3001 already in use"
**Solution**:

```bash
# Windows
TASKKILL /F /IM node.exe

# Linux/Mac
lsof -ti:3001 | xargs kill -9
killall node

# Check ports
netstat -ano | findstr :3001   # Windows
lsof -i :3001                   # Mac/Linux
```

### MongoDB Connection Failures

**Symptom**: "MongoServerError: Authentication failed"
**Solution**:

```bash
# 1. Ensure Docker containers are running
npm run docker:dev

# 2. Check container logs
docker logs simplepro-mongodb-dev

# 3. Verify credentials in .env.local match docker-compose.dev.yml
# Default: MONGODB_USERNAME=admin, MONGODB_PASSWORD=password123

# 4. Restart containers if needed
npm run docker:dev:down
npm run docker:dev
```

### TypeScript Build Errors

**Symptom**: "Cannot find module '@simplepro/pricing-engine'"
**Solution**:

```bash
# 1. Build pricing engine first
cd packages/pricing-engine
npm run build
cd ../..

# 2. Clean NX cache
nx reset

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Rebuild all projects
npm run build
```

### WebSocket Connection Issues

**Symptom**: Dashboard not updating in real-time
**Solution**:

1. Check WebSocket URL in `apps/web/.env.local`: `NEXT_PUBLIC_WS_URL=ws://localhost:3001`
2. Verify API WebSocket is running (check browser console for connection errors)
3. Check CORS settings in `apps/api/src/main.ts` (allowedOrigins includes frontend port)
4. Restart both API and Web: `npm run dev`

### Login Failures

**Symptom**: "Invalid credentials" despite correct username
**Cause**: Password is `Admin123!` with exclamation mark (most common mistake)
**Solution**: Use exact password `Admin123!` - case-sensitive with `!` at end

### Pricing Engine Import Errors

**Symptom**: Type errors when importing pricing engine
**Solution**: Use ES modules, not CommonJS:

```typescript
// ✅ Correct
import {
  DeterministicEstimator,
  defaultRules,
} from '@simplepro/pricing-engine';

// ❌ Incorrect
const { DeterministicEstimator } = require('@simplepro/pricing-engine');
```

---

## Production Deployment Notes

### Pre-Deployment Checklist

1. ✅ All tests passing: `npm run test:ci`
2. ✅ Build successful: `npm run build`
3. ✅ Environment variables configured (see README.md)
4. ✅ MongoDB replica set configured: `npm run replica:setup`
5. ✅ SSL certificates generated: `npm run ssl:generate`
6. ✅ Secrets rotated: `npm run secrets:rotate`
7. ✅ Backup system tested: `npm run backup:create`

### Docker Production Deployment

```bash
# Build and start production stack
npm run docker:prod

# With enhanced security (SSL, secrets)
npm run docker:prod:secure

# View logs
npm run docker:prod:logs
```

### Environment Variables (Production)

**Critical**: Change these defaults in production:

- `JWT_SECRET` - Generate strong random secret
- `JWT_REFRESH_SECRET` - Different from JWT_SECRET
- `MONGODB_PASSWORD` - Change from default `password123`
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` - Change from `minioadmin`

### Security Hardening

1. **Rate Limiting**: Already configured (5 login/min, multi-tier throttling)
2. **NoSQL Injection**: `QueryFiltersDto` sanitizes all inputs
3. **CORS**: Restrict `ALLOWED_ORIGINS` to production domains only
4. **Secrets**: Store in `.secrets/` directory (gitignored), use `npm run secrets:setup`
5. **Audit Logs**: Enabled by default, 90-day retention

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **No Payment Processing** - Stripe integration is placeholder only (health check exists, no actual payment flow)
2. **No Customer Portal** - Backend ready, no frontend implementation
3. **GraphQL 50% Complete** - Schema defined, but subscription resolvers missing
4. **Limited Mobile Features** - Crew app only, no customer mobile app
5. **No Accounting Integration** - QuickBooks/Xero integration not implemented
6. **Price Ranges Not Supported** - Pricing engine generates single price, not low/high range
7. **No Binding Estimates** - Cannot generate binding/non-binding/binding-not-to-exceed estimates (regulatory compliance gap)

### Planned Enhancements (See Gap Analysis)

**Phase 1 (Critical - 12-14 weeks)**:

- Payment processing & invoicing
- Customer self-service portal
- Online booking with deposit payment
- Binding/non-binding estimate support
- Valuation/insurance options

**Phase 2 (High Priority - 8-10 weeks)**:

- Crew mobile app enhancements (navigation, barcode scanner, two-way messaging)
- Review & reputation management
- Customer mobile app (iOS/Android)

**Phase 3 (Medium Priority - 8-12 weeks)**:

- QuickBooks/accounting integration
- Marketing automation
- Advanced storage pricing
- Mileage-based pricing integration

---

## Important Development Notes

### CORS Configuration

API is configured to accept requests from these development ports:

- 3000, 3004, 3007, 3008, 3009, 3010, 4000

If running web app on different port, update `apps/api/src/main.ts` line ~96:

```typescript
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:3009' /* add your port */];
```

### Database Indexes

Critical compound indexes for performance:

- Jobs: `[status, scheduledDate]`, `[customerId, createdAt]`
- Customers: Text search index on `[name, email, phone, address, city, state]`
- Messages: `[threadId, createdAt]`

**When adding new queries**, ensure appropriate indexes exist to prevent slow queries.

### WebSocket Event Naming Convention

All events follow pattern: `<entity>.<action>`

```typescript
('job.updated', 'job.assigned', 'job.status_changed');
('message.created', 'message.send');
('notification.new');
('typing.start', 'typing.stop');
```

### Module Dependencies

Pricing engine is independent (zero dependencies), but API modules have these critical dependencies:

- All modules → `database` module (MongoDB connection)
- Most modules → `auth` module (authentication/authorization)
- Real-time features → `websocket` module
- Automated workflows → `notifications` module

---

## File Naming Conventions

- **Schemas**: `*.schema.ts` (e.g., `user.schema.ts`)
- **DTOs**: `*.dto.ts` (e.g., `create-user.dto.ts`)
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Tests**: `*.spec.ts` (unit), `*.test.ts` (integration)
- **Interfaces**: `*.interface.ts`
- **Types**: `*.types.ts`

---

## Additional Resources

- **Detailed Backend Analysis**: See agent analysis output (28 modules breakdown)
- **Frontend Page Catalog**: 37+ pages across 14 sections (see analysis)
- **Pricing Engine Deep Dive**: Rule system, schemas, test scenarios
- **Mobile App Architecture**: Offline-first design, Redux slices
- **Gap Analysis**: Feature comparison with SmartMoving (industry standard)
- **Implementation Roadmap**: 3-phase plan to SmartMoving feature parity
