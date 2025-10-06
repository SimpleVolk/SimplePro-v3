// Test setup for API module

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/simplepro-test';

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
