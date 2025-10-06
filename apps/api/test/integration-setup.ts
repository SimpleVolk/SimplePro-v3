// Set environment variables BEFORE importing any modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-2024';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-2024';
process.env.JWT_EXPIRATION = '1h';
process.env.JWT_REFRESH_EXPIRATION = '7d';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/auth/interfaces/user.interface';

/**
 * Integration Test Setup and Utilities
 *
 * Provides comprehensive test infrastructure for SimplePro-v3 API integration tests:
 * - In-memory MongoDB database setup
 * - Authentication utilities with JWT token management
 * - Test data fixtures and factories
 * - Common test utilities for database operations
 *
 * Usage:
 * - Import test utilities in integration test files
 * - Use setupTestApp() to initialize test application
 * - Use createTestUser() and loginTestUser() for authentication flows
 * - Use test data factories for consistent test data creation
 */

// Global test variables
let mongod: MongoMemoryServer;
let app: INestApplication;
let moduleFixture: TestingModule;

// Test user credentials and JWT tokens
export interface TestAuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Test data factories
export const TestDataFactories = {
  /**
   * Create test user data with various roles
   */
  createUserData: (overrides: Partial<any> = {}) => ({
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    permissions: ['read:all', 'write:all', 'manage:users'],
    ...overrides,
  }),

  /**
   * Create test customer data
   */
  createCustomerData: (overrides: Partial<any> = {}) => ({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    type: 'residential',
    status: 'lead',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
    },
    notes: 'Test customer for integration testing',
    ...overrides,
  }),

  /**
   * Create test job data
   */
  createJobData: (customerId: string, overrides: Partial<any> = {}) => ({
    customerId,
    type: 'local',
    status: 'scheduled',
    priority: 'medium',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    pickupAddress: {
      street: '123 Old Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
    },
    deliveryAddress: {
      street: '456 New Avenue',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62703',
      country: 'USA',
    },
    estimatedCost: 750.0,
    actualCost: null,
    crewSize: 3,
    truckSize: 'medium',
    description: 'Test job for integration testing',
    ...overrides,
  }),

  /**
   * Create test estimate data
   */
  createEstimateData: (overrides: Partial<any> = {}) => ({
    customer: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '(555) 987-6543',
    },
    pickupLocation: {
      address: '123 Test Street, Springfield, IL 62701',
      accessDifficulty: 'easy',
      floorNumber: 1,
      elevatorAccess: true,
      parkingDistance: 50,
    },
    deliveryLocation: {
      address: '456 Test Avenue, Springfield, IL 62703',
      accessDifficulty: 'medium',
      floorNumber: 2,
      elevatorAccess: false,
      parkingDistance: 100,
    },
    moveDetails: {
      serviceType: 'local',
      moveDate: '2025-02-15',
      estimatedWeight: 5000,
      estimatedVolume: 800,
      crewSize: 3,
      truckSize: 'medium',
      isWeekend: false,
    },
    inventory: [
      {
        name: 'Sofa',
        category: 'Furniture',
        weight: 150,
        volume: 80,
        specialHandling: false,
      },
      {
        name: 'Refrigerator',
        category: 'Appliances',
        weight: 300,
        volume: 60,
        specialHandling: true,
      },
    ],
    additionalServices: ['packing'],
    ...overrides,
  }),
};

/**
 * Setup test application with in-memory database
 */
export async function setupTestApp(): Promise<INestApplication> {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'simplepro-test',
    },
  });
  const mongoUri = mongod.getUri();

  // Set test environment variables
  process.env.MONGODB_URI = mongoUri;
  process.env.DATABASE_URL = mongoUri;

  // Create testing module
  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  console.log('✅ Test application with in-memory database initialized');
  return app;
}

/**
 * Cleanup test application and database
 */
export async function teardownTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  if (moduleFixture) {
    await moduleFixture.close();
  }
  if (mongod) {
    await mongod.stop();
  }
  console.log('✅ Test application cleaned up');
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  userData: Partial<any> = {},
): Promise<User> {
  const authService = moduleFixture.get<AuthService>(AuthService);
  const testUserData = TestDataFactories.createUserData(userData);

  const user = await authService.createUser(testUserData);
  return user;
}

/**
 * Login test user and get authentication tokens
 */
export async function loginTestUser(
  email = 'test@example.com',
  password = 'Test123!@#',
): Promise<TestAuthData> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const { data } = response.body;
  return {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Create authenticated test user and return auth data
 */
export async function createAuthenticatedTestUser(
  userData: Partial<any> = {},
): Promise<TestAuthData> {
  const testUserData = TestDataFactories.createUserData(userData);
  await createTestUser(testUserData);
  return loginTestUser(testUserData.email, testUserData.password);
}

/**
 * Create multiple test users with different roles
 */
export async function createTestUsers(): Promise<{
  [role: string]: TestAuthData;
}> {
  const users = {
    admin: await createAuthenticatedTestUser({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read:all', 'write:all', 'manage:users', 'manage:system'],
    }),
    dispatcher: await createAuthenticatedTestUser({
      email: 'dispatcher@example.com',
      role: 'dispatcher',
      permissions: [
        'read:jobs',
        'write:jobs',
        'read:customers',
        'write:customers',
      ],
    }),
    crew: await createAuthenticatedTestUser({
      email: 'crew@example.com',
      role: 'crew',
      permissions: ['read:jobs', 'update:job:status'],
    }),
  };

  return users;
}

/**
 * Helper function to make authenticated requests
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  token: string,
) {
  return request(app.getHttpServer())
    [method](url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Database cleanup utility
 */
export async function cleanupDatabase(): Promise<void> {
  if (!moduleFixture) return;

  try {
    // Get database connection from the app
    const connection = moduleFixture.get('DatabaseConnection');
    if (connection) {
      // Drop all collections
      const collections = await connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
      console.log('✅ Database collections cleaned up');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Database cleanup warning:', errorMessage);
  }
}

/**
 * Wait for a specific condition to be met (useful for async operations)
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Assert response structure for common API responses
 */
export const ResponseAssertions = {
  /**
   * Assert standard success response structure
   */
  assertSuccessResponse: (response: any, expectedData?: any) => {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  },

  /**
   * Assert error response structure
   */
  assertErrorResponse: (
    response: any,
    expectedStatus: number,
    expectedMessage?: string,
  ) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
    if (expectedMessage) {
      expect(response.body.message).toMatch(expectedMessage);
    }
  },

  /**
   * Assert pagination response structure
   */
  assertPaginationResponse: (response: any) => {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('items');
    expect(response.body.data).toHaveProperty('total');
    expect(response.body.data).toHaveProperty('page');
    expect(response.body.data).toHaveProperty('limit');
    expect(Array.isArray(response.body.data.items)).toBe(true);
  },
};

// Export the app getter for tests that need direct access
export const getTestApp = (): INestApplication => app;
export const getTestModule = (): TestingModule => moduleFixture;

// Set extended timeout for integration tests
jest.setTimeout(30000);
