export default {
  displayName: 'api-e2e',
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api-e2e',
  testMatch: [
    '<rootDir>/test/e2e/**/*.e2e-spec.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.schema.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/e2e-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@simplepro/pricing-engine$': '<rootDir>/../../packages/pricing-engine/src/index.ts'
  },
  testTimeout: 30000, // 30 seconds for E2E tests
  maxWorkers: 1, // Run E2E tests sequentially to avoid DB conflicts
};
