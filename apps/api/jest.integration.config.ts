export default {
  displayName: 'api-integration',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api-integration',
  testMatch: [
    '<rootDir>/test/**/*.integration.spec.ts',
    '<rootDir>/src/**/*.integration.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.integration.spec.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.schema.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@simplepro/pricing-engine$': '<rootDir>/../../packages/pricing-engine/src/index.ts'
  },
  testTimeout: 30000,
  maxWorkers: 1, // Run integration tests sequentially
  // Disable coverage for integration tests to improve performance
  collectCoverage: false,
};