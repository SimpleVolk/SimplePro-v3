// Root Jest setup file
// This file is referenced by jest.preset.js and provides base configuration

// Add any global test setup here
global.console = {
  ...console,
  // Suppress console logs during tests (optional)
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock common global APIs if needed
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}
