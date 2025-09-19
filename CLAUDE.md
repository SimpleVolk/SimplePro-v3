# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SimplePro-v3 is a **single-tenant internal web app** designed to fix ineffective sales, inaccurate estimates, and inefficient operations for moving companies. Built with NX monorepo architecture, it provides deterministic pricing estimates, centralized CRM, operations management, and mobile crew applications.

### Core Requirements

**Business Problems Solved:**

- **Ineffective Sales**: Centralized CRM with automated follow-ups, templates, partner ingestion, and full activity audit
- **Inaccurate Estimates**: Deterministic, auditable estimates from room-by-room inventory plus rules, location handicaps, and seeded evaluator
- **Inefficient Operations**: Dispatch calendar, drag-and-drop resource assignment, crew availability/checklists, real-time job status, payroll calculation

**Technical Requirements:**

- **Mobile-first dark UI** with offline-capable crew app
- **Signature and photo capture** for crew operations
- **SSO + RBAC** with PII masking and encrypted storage
- **Complete audit logs** and configurable mock integrations
- **Internal-only deployment** with enterprise security

**Deliverable Components:**

- ✅ Architecture diagram and ERD
- ✅ Rules JSON and deterministic estimator with unit tests
- 🔄 Next.js inventory→estimate page
- 🔄 React Native crew screen with offline capabilities
- 🔄 GraphQL resolver and API endpoints
- 🔄 Docker-compose deployment setup
- 🔄 Seed data for development
- 🔄 Observability and monitoring
- 🔄 Backup/DR procedures
- 🔄 ESIGN/UETA compliance features
- 🔄 Admin-only rules editing interface

## Architecture

This is a **NX monorepo** with the following structure:

- **apps/api**: NestJS backend API with GraphQL, REST endpoints, MongoDB integration
- **packages/pricing-engine**: Core deterministic pricing calculator with rules engine
- Future: **apps/web**: Next.js web dashboard, **apps/mobile**: React Native crew app

The system emphasizes **deterministic calculations** - same input always produces same output with SHA256 hash verification for auditability.

## Common Commands

### Development

```bash
# Start all services in development mode
npm run dev

# Start specific service
nx serve api
nx serve web

# Install dependencies for the entire workspace
npm install
```

### Building

```bash
# Build all projects
npm run build

# Build specific project
nx build pricing-engine
nx build api
```

### Testing

```bash
# Run all tests
npm test

# Test specific package
nx test pricing-engine

# Run tests in watch mode
cd packages/pricing-engine && npm run test:watch

# Run tests with coverage
nx test pricing-engine --coverage
```

### Linting & Formatting

```bash
# Lint and fix all code
npm run lint

# Format all code
npm run format

# Lint specific project
nx lint api
```

### Docker Infrastructure

```bash
# Start development infrastructure (MongoDB, Redis, MinIO)
npm run docker:up

# Stop infrastructure
npm run docker:down

# View logs
npm run docker:logs
```

### Database Operations

```bash
# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

## Key Architectural Concepts

### Deterministic Pricing Engine

The core of the system is the **DeterministicEstimator** in `packages/pricing-engine`. This calculator:

- Takes structured input (customer details, inventory, locations, services)
- Applies configurable pricing rules in priority order
- Applies location handicaps (stairs, parking, access difficulty)
- Returns identical results for identical inputs (SHA256 hash verified)
- Provides complete audit trail of applied rules and calculations

**Usage Pattern:**

```typescript
import { DeterministicEstimator, defaultRules } from '@simplepro/pricing-engine';

const estimator = new DeterministicEstimator(
  defaultRules.pricingRules,
  defaultRules.locationHandicaps
);

const result = estimator.calculateEstimate(inputData, userId);
```

### Rules Engine

Pricing rules are JSON-configurable with:

- **Conditions**: Field-based rules (weight > 8000, isWeekend = true, etc.)
- **Actions**: Price modifications (add_fixed, add_percentage, multiply, etc.)
- **Priority**: Execution order (lower numbers first)
- **Service Types**: Applicable to local, long_distance, storage, packing_only

Rules are located in `packages/pricing-engine/src/data/default-rules.json`.

### Data Flow Architecture

1. **Input Validation**: EstimateInput schema with comprehensive validation
2. **Rule Processing**: Sequential application by priority
3. **Location Analysis**: Geographic and access difficulty modifiers
4. **Price Breakdown**: Categorized cost components (labor, materials, transportation, etc.)
5. **Audit Trail**: Complete calculation history with rule impacts

### NX Workspace Configuration

- **TypeScript Path Mappings**: Use `@simplepro/pricing-engine` to import between packages
- **Shared Dependencies**: Common configs in root, specific deps in individual packages
- **Build Dependencies**: Pricing engine builds before API (dependency graph)

## Development Patterns

### Adding New Pricing Rules

1. Define rule in `packages/pricing-engine/src/data/default-rules.json`
2. Add test cases in `packages/pricing-engine/src/estimator.test.ts`
3. Rules are automatically loaded and applied by priority

### Working with Estimates

All estimate calculations should flow through the DeterministicEstimator to ensure:

- Consistency across the application
- Complete audit trails
- Reproducible results for the same input

### API Development

The API follows NestJS patterns with:

- Module-based architecture (users, customers, estimates, jobs, crews)
- MongoDB with Mongoose ODM
- GraphQL + REST endpoints
- JWT authentication with RBAC
- Comprehensive input validation with class-validator

## Environment Requirements

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **Docker**: Required for development infrastructure
- **MongoDB**: 7.0+ (via Docker)
- **Redis**: 7+ (via Docker)

## Testing Strategy

- **Unit Tests**: Individual component testing with Jest
- **Integration Tests**: API endpoint testing
- **Deterministic Testing**: Pricing engine validation with known inputs/outputs
- **Test Data**: Comprehensive scenarios in `packages/pricing-engine/src/test-data/`

The pricing engine includes extensive test coverage with multiple scenarios (studio moves, large moves with pianos, long distance, etc.) to ensure calculation accuracy.

## Monorepo Dependencies

When working across packages:

- Import using TypeScript path mappings: `@simplepro/pricing-engine`
- Build dependencies are managed by NX automatically
- Shared configurations inherit from workspace root
- Each package maintains its own test configuration
