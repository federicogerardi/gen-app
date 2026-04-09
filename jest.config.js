const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
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
    '!src/lib/db.ts',
    '!src/lib/logger.ts',
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
  },
};

module.exports = createJestConfig(customJestConfig);