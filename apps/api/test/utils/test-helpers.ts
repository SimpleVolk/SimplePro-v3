/**
 * Test Helper Utilities
 *
 * Common utilities and helper functions for writing tests.
 */

import { Types } from 'mongoose';

/**
 * Generates a valid MongoDB ObjectId
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Creates a mock user object
 */
export function createMockUser(overrides: any = {}) {
  return {
    _id: generateObjectId(),
    id: generateObjectId(),
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: {
      id: 'role_admin',
      name: 'admin',
      displayName: 'Administrator',
      permissions: [
        { id: 'perm_all', resource: 'all', action: 'all' }
      ]
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock date offset by days
 */
export function mockDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Waits for promises to resolve (useful for testing async events)
 */
export function waitForPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Asserts that a function throws an error with specific message
 */
export async function expectToThrowAsync(
  fn: () => Promise<any>,
  errorClass: any,
  message?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (!(error instanceof errorClass)) {
      const errorName = error instanceof Error ? error.constructor.name : String(error);
      throw new Error(
        `Expected ${errorClass.name} but got ${errorName}`
      );
    }
    if (message && error instanceof Error && !error.message.includes(message)) {
      throw new Error(
        `Expected error message to include "${message}" but got "${error.message}"`
      );
    }
  }
}

/**
 * Creates a mock request object
 */
export function createMockRequest(data: any = {}) {
  return {
    user: createMockUser(),
    body: {},
    params: {},
    query: {},
    headers: {},
    ...data,
  };
}

/**
 * Creates a mock response object
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Strips Mongoose-specific properties from object
 */
export function stripMongooseProps(obj: any): any {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj;
  return rest;
}

/**
 * Compares two dates ignoring milliseconds
 */
export function datesEqualIgnoreMs(date1: Date, date2: Date): boolean {
  return Math.abs(date1.getTime() - date2.getTime()) < 1000;
}

/**
 * Creates a mock file object
 */
export function createMockFile(overrides: any = {}) {
  return {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
    ...overrides,
  };
}

/**
 * Sleeps for specified milliseconds (use sparingly in tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generates random number between min and max
 */
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates a spy on console methods to suppress logs during tests
 */
export function suppressConsoleLogs() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
}
