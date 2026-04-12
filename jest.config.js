const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/**/index.ts',
    '!src/proxy.ts',
    '!src/app/**/page.tsx',
    '!src/app/**/layout.tsx',
    '!src/app/global-error.tsx',
    '!src/components/layout/**',
    '!src/components/ui/**',
    '!src/app/api/auth/**',
    '!src/lib/auth.ts',
    '!src/lib/rate-limit.ts',
    '!src/lib/llm/providers/openrouter.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/lib/logger.ts': {
      branches: 60,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/lib/db.ts': {
      branches: 60,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/lib/llm/streaming.ts': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);