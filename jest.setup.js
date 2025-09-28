// Global test setup for Jest
// This file is referenced in jest configurations

// Mock global fetch if needed
global.fetch = require('node-fetch');

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/simplepro-test';

// Suppress console.log in tests unless explicitly needed
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalConsoleLog(...args);
  }
};

// Mock crypto for Node.js environments where it might not be available
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto');
}

// Set longer timeout for integration tests
jest.setTimeout(10000);