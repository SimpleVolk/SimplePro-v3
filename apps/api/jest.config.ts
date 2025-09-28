export default {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  testMatch: [
    '<rootDir>/src/**/*.(test|spec).ts',
    '!<rootDir>/src/**/*.integration.spec.ts',
    '!<rootDir>/test/**/*.integration.spec.ts'
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
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/test-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@simplepro/pricing-engine$': '<rootDir>/../../packages/pricing-engine/src/index.ts'
  },
};