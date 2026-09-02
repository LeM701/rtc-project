module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests/integration'],
  testMatch: ['**/*.integration.test.ts'],
  setupFiles: ['<rootDir>/src/tests/integration/setup.ts'],
  testTimeout: 15000,
  maxWorkers: 1, // avoid parallel test files racing on the same tables
};
