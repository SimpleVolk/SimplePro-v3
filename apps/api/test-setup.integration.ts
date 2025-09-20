/**
 * Integration test setup
 * Configures test environment and global settings for integration tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-integration';

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Only show errors during tests, suppress info logs
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});