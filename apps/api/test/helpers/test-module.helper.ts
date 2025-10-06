/**
 * Test Module Helper
 *
 * Provides utilities for creating test modules with properly mocked dependencies
 * to avoid external service connections (Redis, MongoDB, etc.) in unit tests.
 */

import { ConfigService } from '@nestjs/config';
import { createMockCacheService } from '../mocks/cache.mock';

/**
 * Create a mock ConfigService with test configuration
 */
export function createMockConfigService(overrides: Record<string, any> = {}) {
  const defaultConfig = {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/simplepro-test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: 'test-redis-password',
    REDIS_DB: 0,
    REDIS_CONNECT_TIMEOUT: 10000,
    REDIS_TTL: 300,
    REDIS_SHORT_TTL: 60,
    REDIS_MEDIUM_TTL: 300,
    REDIS_LONG_TTL: 3600,
    REDIS_EXTRA_LONG_TTL: 86400,
    REDIS_MAX_ITEMS: 100000,
    REDIS_TLS_ENABLED: false,
    REDIS_CLUSTER_MODE: false,
    JWT_SECRET: 'test-jwt-secret-key-32-characters-long-for-testing-purposes',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-32-characters-long-for-testing',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '7d',
    STORAGE_PROVIDER: 's3',
    STORAGE_ENDPOINT: 'localhost',
    STORAGE_PORT: 9000,
    STORAGE_ACCESS_KEY: 'test-access-key',
    STORAGE_SECRET_KEY: 'test-secret-key',
    STORAGE_USE_SSL: false,
    STORAGE_BUCKET_NAME: 'simplepro-test',
    STORAGE_REGION: 'us-east-1',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      return defaultConfig[key] !== undefined ? defaultConfig[key] : defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (defaultConfig[key] === undefined) {
        throw new Error(`Configuration key "${key}" is not defined`);
      }
      return defaultConfig[key];
    }),
  };
}

/**
 * Common test providers for services that depend on ConfigService and CacheService
 */
export function getCommonTestProviders(configOverrides: Record<string, any> = {}) {
  return [
    {
      provide: ConfigService,
      useValue: createMockConfigService(configOverrides),
    },
    {
      provide: 'CacheService',
      useValue: createMockCacheService(),
    },
  ];
}

/**
 * Create a mock EventEmitter2 for testing
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners: jest.fn(() => []),
    listenerCount: jest.fn(() => 0),
  };
}

/**
 * Create a mock Logger for testing
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

/**
 * Wait for all pending promises to resolve
 * Useful for testing async operations
 */
export function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a mock Mongoose model for testing
 */
export function createMockModel<T>(mockData: T[] = []) {
  const data = [...mockData];

  class MockModel {
    constructor(private dto: any) {}

    save = jest.fn().mockResolvedValue(this.dto);
    static find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(data),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    });
    static findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(data[0] || null),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    });
    static findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(data[0] || null),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    });
    static findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(data[0] || null),
      populate: jest.fn().mockReturnThis(),
    });
    static findByIdAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(data[0] || null),
    });
    static deleteMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: data.length }),
    });
    static countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(data.length),
    });
    static create = jest.fn().mockImplementation((dto) => Promise.resolve(dto));
    static insertMany = jest.fn().mockImplementation((dtos) => Promise.resolve(dtos));
  }

  return MockModel;
}

/**
 * Setup test environment variables
 * Call this at the beginning of test files if needed
 */
export function setupTestEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-32-characters-long-for-testing-purposes';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-characters-long-for-testing';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/simplepro-test';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.REDIS_PASSWORD = 'test-redis-password';
}
