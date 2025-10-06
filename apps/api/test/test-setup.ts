// Test setup for API module
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file before anything else
const envPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });

// Set test environment variables (these override .env.test if needed)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-32-characters-long-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-32-characters-long-for-testing';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simplepro-test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'test-redis-password';

// Mock crypto for UUID generation
if (!global.crypto) {
  global.crypto = require('crypto');
}

// Set up console mocks (optional, comment out to see logs)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Extended timeout for async operations
jest.setTimeout(30000);
