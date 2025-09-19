const { createGlobPatternsForDependencies } = require('@nx/jest');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.(test|spec).{js,ts}',
    '<rootDir>/apps/**/*.(test|spec).{js,ts}',
    '<rootDir>/packages/**/*.(test|spec).{js,ts}',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageReporters: ['html', 'text', 'text-summary', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    'apps/**/src/**/*.{ts,tsx,js,jsx}',
    'packages/**/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};